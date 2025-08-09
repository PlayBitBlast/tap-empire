// PrestigePanel.jsx - Main prestige system interface component

import React, { useState } from 'react';
import usePrestige from '../../hooks/usePrestige';
import PrestigeButton from './PrestigeButton';
import PrestigeUpgrades from './PrestigeUpgrades';
import PrestigeStats from './PrestigeStats';
import PrestigeProgress from './PrestigeProgress';
import './PrestigePanel.css';

/**
 * Main prestige panel component that displays prestige system interface
 */
const PrestigePanel = ({ gameState, onPrestigeComplete }) => {
  const {
    prestigeInfo,
    prestigeUpgrades,
    prestigeStats,
    prestigeProgress,
    isLoading,
    isPrestiging,
    isPurchasing,
    error,
    performPrestige,
    purchasePrestigeUpgrade,
    refreshPrestigeData,
    clearError,
    formatCoins,
    formatPrestigePoints,
    getPrestigeLevelName,
    getPrestigeBenefits
  } = usePrestige();

  const [activeTab, setActiveTab] = useState('overview');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  /**
   * Handle prestige confirmation
   */
  const handlePrestigeConfirm = async () => {
    try {
      const result = await performPrestige();
      setShowConfirmDialog(false);
      
      if (onPrestigeComplete) {
        onPrestigeComplete(result);
      }
      
      // Show success message
      alert(`Prestige successful! You earned ${result.prestigePointsEarned} prestige points!`);
    } catch (error) {
      console.error('Prestige failed:', error);
      alert(`Prestige failed: ${error.message}`);
    }
  };

  /**
   * Handle upgrade purchase
   */
  const handleUpgradePurchase = async (upgradeType) => {
    try {
      const result = await purchasePrestigeUpgrade(upgradeType);
      
      // Show success message
      alert(`Upgrade purchased: ${result.upgrade.name} Level ${result.upgrade.newLevel}`);
    } catch (error) {
      console.error('Upgrade purchase failed:', error);
      alert(`Purchase failed: ${error.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="prestige-panel loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading prestige system...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="prestige-panel error">
        <div className="error-message">
          <h3>Error Loading Prestige System</h3>
          <p>{error}</p>
          <button onClick={clearError} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const canPrestige = prestigeInfo?.eligibility?.canPrestige || false;
  const currentLevel = prestigeStats?.prestigeLevel || 0;
  const currentPoints = prestigeStats?.prestigePoints || 0;

  return (
    <div className="prestige-panel">
      <div className="prestige-header">
        <div className="prestige-title">
          <h2>👑 Prestige System</h2>
          <div className="prestige-level">
            <span className="level-label">Level:</span>
            <span className="level-value">{currentLevel}</span>
            <span className="level-name">({getPrestigeLevelName(currentLevel)})</span>
          </div>
        </div>
        
        <div className="prestige-points">
          <div className="points-display">
            <span className="points-icon">⭐</span>
            <span className="points-value">{formatPrestigePoints(currentPoints)}</span>
            <span className="points-label">Prestige Points</span>
          </div>
        </div>
      </div>

      <div className="prestige-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'upgrades' ? 'active' : ''}`}
          onClick={() => setActiveTab('upgrades')}
        >
          Upgrades
        </button>
        <button 
          className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Statistics
        </button>
      </div>

      <div className="prestige-content">
        {activeTab === 'overview' && (
          <div className="prestige-overview">
            <PrestigeProgress 
              progress={prestigeProgress}
              gameState={gameState}
              formatCoins={formatCoins}
            />
            
            <div className="prestige-benefits">
              <h3>Prestige Benefits</h3>
              <div className="benefits-list">
                <div className="benefit-item">
                  <span className="benefit-icon">💰</span>
                  <span className="benefit-text">
                    {getPrestigeBenefits(currentLevel)}
                  </span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">⭐</span>
                  <span className="benefit-text">
                    Earn prestige points to buy permanent upgrades
                  </span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">🏆</span>
                  <span className="benefit-text">
                    Compete on the prestige leaderboard
                  </span>
                </div>
              </div>
            </div>

            <PrestigeButton
              canPrestige={canPrestige}
              eligibility={prestigeInfo?.eligibility}
              isPrestiging={isPrestiging}
              onPrestige={() => setShowConfirmDialog(true)}
              formatCoins={formatCoins}
              formatPrestigePoints={formatPrestigePoints}
            />
          </div>
        )}

        {activeTab === 'upgrades' && (
          <PrestigeUpgrades
            upgrades={prestigeUpgrades}
            isPurchasing={isPurchasing}
            onPurchase={handleUpgradePurchase}
            formatPrestigePoints={formatPrestigePoints}
          />
        )}

        {activeTab === 'stats' && (
          <PrestigeStats
            stats={prestigeStats}
            formatCoins={formatCoins}
            formatPrestigePoints={formatPrestigePoints}
            getPrestigeLevelName={getPrestigeLevelName}
          />
        )}
      </div>

      {showConfirmDialog && (
        <div className="prestige-confirm-dialog">
          <div className="dialog-backdrop" onClick={() => setShowConfirmDialog(false)} />
          <div className="dialog-content">
            <h3>Confirm Prestige</h3>
            <div className="confirm-details">
              <p>Are you sure you want to prestige? This will:</p>
              <ul>
                <li>Reset your coins to 0</li>
                <li>Reset all non-prestige upgrades</li>
                <li>Reset coins per tap to 1</li>
                <li>Reset auto-clicker rate to 0</li>
                <li>Grant you {formatPrestigePoints(prestigeInfo?.eligibility?.newPrestigePoints || 0)} prestige points</li>
                <li>Increase your prestige level to {(currentLevel + 1)}</li>
              </ul>
              <p className="warning">This action cannot be undone!</p>
            </div>
            <div className="dialog-actions">
              <button 
                className="cancel-button"
                onClick={() => setShowConfirmDialog(false)}
                disabled={isPrestiging}
              >
                Cancel
              </button>
              <button 
                className="confirm-button"
                onClick={handlePrestigeConfirm}
                disabled={isPrestiging}
              >
                {isPrestiging ? 'Prestiging...' : 'Confirm Prestige'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrestigePanel;