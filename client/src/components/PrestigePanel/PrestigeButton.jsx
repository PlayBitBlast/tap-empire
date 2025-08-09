// PrestigeButton.jsx - Button component for performing prestige

import React from 'react';
import './PrestigeButton.css';

/**
 * Prestige button component that handles prestige action
 */
const PrestigeButton = ({ 
  canPrestige, 
  eligibility, 
  isPrestiging, 
  onPrestige, 
  formatCoins, 
  formatPrestigePoints 
}) => {
  if (!eligibility) {
    return (
      <div className="prestige-button-container">
        <div className="prestige-button disabled">
          <span className="button-text">Loading...</span>
        </div>
      </div>
    );
  }

  const {
    requiredCoins,
    currentTotalCoins,
    newPrestigePoints,
    currentPrestigeLevel
  } = eligibility;

  const progress = Math.min((currentTotalCoins / requiredCoins) * 100, 100);

  return (
    <div className="prestige-button-container">
      <div className="prestige-requirements">
        <h3>Prestige Requirements</h3>
        <div className="requirement-item">
          <span className="requirement-label">Total Coins Needed:</span>
          <span className="requirement-value">{formatCoins(requiredCoins)}</span>
        </div>
        <div className="requirement-item">
          <span className="requirement-label">Your Total Coins:</span>
          <span className="requirement-value">{formatCoins(currentTotalCoins)}</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          />
          <span className="progress-text">{progress.toFixed(1)}%</span>
        </div>
      </div>

      {canPrestige && (
        <div className="prestige-rewards">
          <h3>Prestige Rewards</h3>
          <div className="reward-item">
            <span className="reward-icon">⭐</span>
            <span className="reward-text">
              +{formatPrestigePoints(newPrestigePoints)} Prestige Points
            </span>
          </div>
          <div className="reward-item">
            <span className="reward-icon">👑</span>
            <span className="reward-text">
              Prestige Level {currentPrestigeLevel + 1}
            </span>
          </div>
          <div className="reward-item">
            <span className="reward-icon">💰</span>
            <span className="reward-text">
              +{((Math.pow(1.1, currentPrestigeLevel + 1) - 1) * 100).toFixed(1)}% Earnings Multiplier
            </span>
          </div>
        </div>
      )}

      <button
        className={`prestige-button ${canPrestige ? 'enabled' : 'disabled'}`}
        onClick={onPrestige}
        disabled={!canPrestige || isPrestiging}
      >
        {isPrestiging ? (
          <div className="button-loading">
            <div className="loading-spinner"></div>
            <span className="button-text">Prestiging...</span>
          </div>
        ) : canPrestige ? (
          <div className="button-content">
            <span className="button-icon">👑</span>
            <span className="button-text">PRESTIGE NOW</span>
            <span className="button-subtitle">
              +{formatPrestigePoints(newPrestigePoints)} Points
            </span>
          </div>
        ) : (
          <div className="button-content">
            <span className="button-icon">🔒</span>
            <span className="button-text">PRESTIGE LOCKED</span>
            <span className="button-subtitle">
              Need {formatCoins(requiredCoins - currentTotalCoins)} more coins
            </span>
          </div>
        )}
      </button>

      {!canPrestige && (
        <div className="prestige-hint">
          <p>
            Keep playing and earning coins to unlock prestige! 
            Prestige allows you to reset your progress for permanent bonuses.
          </p>
        </div>
      )}
    </div>
  );
};

export default PrestigeButton;