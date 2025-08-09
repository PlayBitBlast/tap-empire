import React, { useEffect, useState } from 'react';
import { ToastContainer } from 'react-toastify';
import TapButton from './components/TapButton';
import CoinCounter from './components/CoinCounter';
import LoadingScreen from './components/LoadingScreen/LoadingScreen';
import OfflineProgressModal from './components/OfflineProgressModal/OfflineProgressModal';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import NetworkStatus from './components/NetworkStatus/NetworkStatus';
import Navigation from './components/Navigation/Navigation';
import ResponsiveLayout from './components/ResponsiveLayout/ResponsiveLayout';
import ProgressIndicator from './components/ProgressIndicator/ProgressIndicator';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import useGameEngine from './hooks/useGameEngine';
import useOfflineProgress from './hooks/useOfflineProgress';
import { useEvents } from './hooks/useEvents';
import ActiveEvents from './components/ActiveEvents/ActiveEvents';
import EventNotification from './components/EventNotification/EventNotification';
import { ViewportUtils } from './utils/touchOptimization';
import './App.css';
import 'react-toastify/dist/ReactToastify.css';
import './utils/errorHandler.css';

// Main game component (authenticated)
function GameApp() {
  const [previousCoins, setPreviousCoins] = useState(0);
  const [currentScreen, setCurrentScreen] = useState('game');
  const [isMobile, setIsMobile] = useState(ViewportUtils.isMobile());
  const { 
    user, 
    isAuthenticated, 
    isLoading: authLoading, 
    error: authError,
    authenticate,
    hapticFeedback,
    isTelegramEnvironment
  } = useAuthContext();
  
  const {
    gameState,
    gameEngine,
    isLoading,
    error,
    isGoldenTap,
    lastTapResult,
    handleTap,
    coins,
    coinsPerTap,
    totalCoinsEarned,
    getSessionStats
  } = useGameEngine();

  // Offline progress hook
  const {
    isModalOpen: isOfflineModalOpen,
    offlineData,
    isLoading: isOfflineLoading,
    error: offlineError,
    collectOfflineProgress,
    closeModal: closeOfflineModal
  } = useOfflineProgress(gameEngine);

  // Events hook
  const {
    activeEvents,
    eventMultipliers,
    notifications,
    removeNotification,
    purchaseEventUpgrade,
    getTotalEventMultiplier
  } = useEvents(gameEngine?.socket);

  // State for events panel
  const [eventsExpanded, setEventsExpanded] = useState(false);

  // Responsive design state management
  useEffect(() => {
    const cleanup = ViewportUtils.onViewportChange((viewport) => {
      setIsMobile(viewport.width <= 768);
    });
    
    return cleanup;
  }, []);

  // Track previous coins for animation
  useEffect(() => {
    if (coins !== previousCoins) {
      setPreviousCoins(coins);
    }
  }, [coins, previousCoins]);

  // Update game engine with event multipliers
  useEffect(() => {
    if (gameEngine && eventMultipliers) {
      gameEngine.updateEventMultipliers(eventMultipliers);
    }
  }, [gameEngine, eventMultipliers]);

  // Show loading screen during authentication
  if (authLoading) {
    return (
      <LoadingScreen 
        message="Authenticating with Telegram..." 
        error={authError}
        onRetry={authError ? authenticate : null}
      />
    );
  }

  // Show error if authentication failed
  if (!isAuthenticated) {
    return (
      <LoadingScreen 
        message="Authentication required" 
        error={authError || "Please authenticate with Telegram to continue"}
        onRetry={authenticate}
      />
    );
  }

  const handleTapButtonClick = (tapData) => {
    const result = handleTap(tapData);
    if (result) {
      // Haptic feedback
      try {
        if (result.isGoldenTap) {
          hapticFeedback('heavy');
        } else {
          hapticFeedback('light');
        }
      } catch (error) {
        // Silently ignore haptic feedback errors
        console.debug('Haptic feedback not available:', error.message);
      }
    }
  };

  const getStatusMessage = () => {
    if (isLoading) return 'Game engine loading...';
    if (error) {
      switch (error.type) {
        case 'RATE_LIMITED':
          return `Slow down! ${error.message}`;
        case 'SYNC_FAILED':
          return 'Connection lost. Retrying...';
        case 'INITIALIZATION_FAILED':
          return 'Failed to start game. Please refresh.';
        default:
          return 'Something went wrong. Please try again.';
      }
    }
    return 'Ready to start tapping!';
  };

  const sessionStats = getSessionStats();

  const handleScreenChange = (screenId) => {
    setCurrentScreen(screenId);
  };

  const renderGameContent = () => {
    switch (currentScreen) {
      case 'game':
        return (
          <ErrorBoundary name="GameContainer" fallbackMessage="Game interface error. Refreshing may help.">
            <div className="game-container">
              <div className="user-info">
                <p>Welcome, {user.first_name}!</p>
                {user.username && <p>@{user.username}</p>}
                {isTelegramEnvironment() && user.is_premium && (
                  <span className="premium-badge">⭐ Premium</span>
                )}
              </div>

              <CoinCounter 
                coins={coins}
                previousCoins={previousCoins}
                className="main-coin-counter"
              />

              {/* Active Events Panel */}
              {activeEvents.length > 0 && (
                <ActiveEvents
                  activeEvents={activeEvents}
                  userCoins={coins}
                  isExpanded={eventsExpanded}
                  onToggleExpanded={() => setEventsExpanded(!eventsExpanded)}
                  onUpgradePurchase={async (upgrade, newLevel) => {
                    try {
                      await purchaseEventUpgrade(upgrade.id);
                      // Refresh game state after purchase
                      if (gameEngine) {
                        gameEngine.emit('state:refresh');
                      }
                    } catch (error) {
                      console.error('Failed to purchase event upgrade:', error);
                    }
                  }}
                />
              )}
              
              <TapButton
                onTap={handleTapButtonClick}
                isGoldenTap={isGoldenTap}
                disabled={isLoading || error?.type === 'RATE_LIMITED'}
                coinsPerTap={coinsPerTap}
                className="main-tap-button"
              />
              
              <div className="status">
                {isLoading && (
                  <ProgressIndicator 
                    type="dots" 
                    progress={50} 
                    label="Loading game..." 
                    size="small"
                  />
                )}
                <p className={error ? 'error' : ''}>{getStatusMessage()}</p>
                {sessionStats && !isLoading && (
                  <div className="session-stats">
                    <p>Session: {sessionStats.tapsThisSession} taps • {sessionStats.coinsEarnedThisSession.toLocaleString()} coins</p>
                    {sessionStats.goldenTapsThisSession > 0 && (
                      <p>✨ {sessionStats.goldenTapsThisSession} Golden Taps!</p>
                    )}
                  </div>
                )}
                {offlineError && (
                  <div className="offline-error">
                    <p>Offline progress error: {offlineError}</p>
                  </div>
                )}
              </div>
            </div>
          </ErrorBoundary>
        );
      
      case 'upgrades':
        return (
          <div className="screen-placeholder">
            <h2>🔧 Upgrades</h2>
            <p>Upgrade system coming soon!</p>
            <ProgressIndicator type="circular" progress={75} label="Development Progress" />
          </div>
        );
      
      case 'friends':
        return (
          <div className="screen-placeholder">
            <h2>👥 Friends</h2>
            <p>Social features coming soon!</p>
            <ProgressIndicator type="linear" progress={60} label="Development Progress" />
          </div>
        );
      
      case 'leaderboard':
        return (
          <div className="screen-placeholder">
            <h2>🏆 Leaderboard</h2>
            <p>Rankings coming soon!</p>
            <ProgressIndicator type="dots" progress={80} label="Development Progress" />
          </div>
        );
      
      case 'achievements':
        return (
          <div className="screen-placeholder">
            <h2>🏅 Achievements</h2>
            <p>Achievement system coming soon!</p>
            <ProgressIndicator type="circular" progress={45} label="Development Progress" />
          </div>
        );
      
      case 'prestige':
        return (
          <div className="screen-placeholder">
            <h2>⭐ Prestige</h2>
            <p>Prestige system coming soon!</p>
            <ProgressIndicator type="linear" progress={30} label="Development Progress" />
          </div>
        );
      
      default:
        return renderGameContent();
    }
  };

  const navigation = (
    <Navigation
      currentScreen={currentScreen}
      onScreenChange={handleScreenChange}
      userCoins={coins}
      isCompact={isMobile}
    />
  );

  return (
    <ResponsiveLayout 
      navigation={navigation}
      showLoadingOverlay={isLoading && currentScreen === 'game'}
      loadingMessage="Loading game engine..."
      className="tap-empire-app"
    >
      {renderGameContent()}

      {/* Offline Progress Modal */}
      <OfflineProgressModal
        isOpen={isOfflineModalOpen}
        onClose={closeOfflineModal}
        offlineData={offlineData}
        onCollect={collectOfflineProgress}
        isLoading={isOfflineLoading}
      />

      {/* Event Notifications */}
      {notifications.map(notification => (
        <EventNotification
          key={notification.id}
          event={notification.event}
          type={notification.type}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </ResponsiveLayout>
  );
}

// Main App component with authentication provider
function App() {
  return (
    <ErrorBoundary name="App" fallbackMessage="Something went wrong with the game. Don't worry - your progress is safe!">
      <AuthProvider>
        <GameApp />
        <NetworkStatus />
        <ToastContainer
          position="top-center"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;