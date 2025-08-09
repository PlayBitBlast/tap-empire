// SyncDemo.jsx - Demo component showing real-time synchronization in action
// Demonstrates the SyncManager integration with GameEngine

import React, { useState, useEffect } from 'react';
import GameEngine from '../../services/gameEngine';
import useSyncManager from '../../hooks/useSyncManager';
import './SyncDemo.css';

const SyncDemo = () => {
  const [gameEngine] = useState(() => new GameEngine());
  const [gameState, setGameState] = useState(gameEngine.getState());
  const [syncLogs, setSyncLogs] = useState([]);

  // Initialize sync manager
  const {
    connected,
    syncing,
    lastSyncTime,
    error,
    stats,
    connect,
    disconnect,
    forceSync,
    resetSync
  } = useSyncManager(gameEngine, {
    serverUrl: process.env.REACT_APP_SERVER_URL || 'http://localhost:3001',
    autoConnect: true
  });

  // Update game state when engine state changes
  useEffect(() => {
    const handleStateUpdate = () => {
      setGameState(gameEngine.getState());
    };

    const handleSyncEvent = (eventType, data) => {
      const logEntry = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        type: eventType,
        data: JSON.stringify(data, null, 2)
      };
      
      setSyncLogs(prev => [logEntry, ...prev.slice(0, 9)]); // Keep last 10 logs
    };

    // Subscribe to game engine events
    gameEngine.on('coins:updated', handleStateUpdate);
    gameEngine.on('sync:success', (data) => handleSyncEvent('sync:success', data));
    gameEngine.on('sync:failed', (data) => handleSyncEvent('sync:failed', data));
    gameEngine.on('sync:corrected', (data) => handleSyncEvent('sync:corrected', data));
    gameEngine.on('connection:state_changed', (data) => handleSyncEvent('connection:state_changed', data));

    // Start game engine
    gameEngine.start();

    return () => {
      gameEngine.off('coins:updated', handleStateUpdate);
      gameEngine.off('sync:success', handleSyncEvent);
      gameEngine.off('sync:failed', handleSyncEvent);
      gameEngine.off('sync:corrected', handleSyncEvent);
      gameEngine.off('connection:state_changed', handleSyncEvent);
      gameEngine.stop();
    };
  }, [gameEngine]);

  const handleTap = () => {
    const result = gameEngine.handleTap({
      position: { x: Math.random() * 300, y: Math.random() * 300 }
    });
    
    if (result) {
      console.log('Tap result:', result);
    }
  };

  const handleUpgrade = (upgradeType) => {
    try {
      gameEngine.purchaseUpgrade(upgradeType);
    } catch (error) {
      console.error('Upgrade failed:', error.message);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getConnectionStatusClass = () => {
    if (connected) return 'connected';
    if (error) return 'error';
    return 'disconnected';
  };

  return (
    <div className="sync-demo">
      <div className="sync-demo__header">
        <h2>Real-time Synchronization Demo</h2>
        <div className={`connection-status ${getConnectionStatusClass()}`}>
          <div className="status-indicator"></div>
          <span>
            {connected ? 'Connected' : error ? 'Error' : 'Disconnected'}
            {syncing && ' (Syncing...)'}
          </span>
        </div>
      </div>

      <div className="sync-demo__content">
        {/* Game State Panel */}
        <div className="panel game-state-panel">
          <h3>Game State</h3>
          <div className="game-stats">
            <div className="stat">
              <label>Coins:</label>
              <span className="coins">{formatNumber(gameState.coins)}</span>
            </div>
            <div className="stat">
              <label>Total Earned:</label>
              <span>{formatNumber(gameState.totalCoinsEarned)}</span>
            </div>
            <div className="stat">
              <label>Coins per Tap:</label>
              <span>{gameState.coinsPerTap}</span>
            </div>
            <div className="stat">
              <label>Auto Clicker Rate:</label>
              <span>{gameState.autoClickerRate}/sec</span>
            </div>
          </div>

          <div className="game-actions">
            <button 
              className="tap-button"
              onClick={handleTap}
              disabled={!connected}
            >
              💰 TAP ({gameState.coinsPerTap} coins)
            </button>
            
            <div className="upgrade-buttons">
              <button 
                onClick={() => handleUpgrade('tap_multiplier')}
                disabled={!connected || gameState.coins < 10}
                className="upgrade-button"
              >
                ⚡ Tap Power (10 coins)
              </button>
              <button 
                onClick={() => handleUpgrade('auto_clicker')}
                disabled={!connected || gameState.coins < 100}
                className="upgrade-button"
              >
                🤖 Auto Clicker (100 coins)
              </button>
            </div>
          </div>
        </div>

        {/* Sync Status Panel */}
        <div className="panel sync-status-panel">
          <h3>Sync Status</h3>
          {stats && (
            <div className="sync-stats">
              <div className="stat">
                <label>Success Rate:</label>
                <span>{stats.successRate}</span>
              </div>
              <div className="stat">
                <label>Queue Size:</label>
                <span>{stats.queueSize}</span>
              </div>
              <div className="stat">
                <label>Avg Latency:</label>
                <span>{Math.round(stats.averageLatency)}ms</span>
              </div>
              <div className="stat">
                <label>Last Sync:</label>
                <span>
                  {lastSyncTime 
                    ? new Date(lastSyncTime).toLocaleTimeString()
                    : 'Never'
                  }
                </span>
              </div>
            </div>
          )}

          <div className="sync-controls">
            <button onClick={connect} disabled={connected}>
              🔌 Connect
            </button>
            <button onClick={disconnect} disabled={!connected}>
              ❌ Disconnect
            </button>
            <button onClick={forceSync} disabled={!connected}>
              🔄 Force Sync
            </button>
            <button onClick={resetSync}>
              🗑️ Reset
            </button>
          </div>

          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {/* Sync Logs Panel */}
        <div className="panel sync-logs-panel">
          <h3>Sync Events</h3>
          <div className="sync-logs">
            {syncLogs.length === 0 ? (
              <div className="no-logs">No sync events yet</div>
            ) : (
              syncLogs.map(log => (
                <div key={log.id} className={`log-entry ${log.type.replace(':', '-')}`}>
                  <div className="log-header">
                    <span className="log-time">{log.timestamp}</span>
                    <span className="log-type">{log.type}</span>
                  </div>
                  <pre className="log-data">{log.data}</pre>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncDemo;