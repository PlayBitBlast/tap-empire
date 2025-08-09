// PrestigeProgress.jsx - Component for displaying prestige progress

import React from 'react';
import './PrestigeProgress.css';

/**
 * Prestige progress component that shows progress toward next prestige
 */
const PrestigeProgress = ({ progress, gameState, formatCoins }) => {
  if (!progress) {
    return (
      <div className="prestige-progress loading">
        <div className="loading-message">Loading prestige progress...</div>
      </div>
    );
  }

  const {
    currentLevel,
    totalCoinsEarned,
    nextPrestigeRequirement,
    progress: progressPercentage,
    canPrestige,
    prestigePoints,
    potentialPrestigePoints
  } = progress;

  const coinsNeeded = Math.max(0, nextPrestigeRequirement - totalCoinsEarned);

  return (
    <div className="prestige-progress">
      <div className="progress-header">
        <h3>Prestige Progress</h3>
        <div className="current-level">
          Level {currentLevel}
        </div>
      </div>

      <div className="progress-bar-container">
        <div className="progress-labels">
          <span className="progress-start">0</span>
          <span className="progress-end">{formatCoins(nextPrestigeRequirement)}</span>
        </div>
        <div className="progress-bar">
          <div 
            className={`progress-fill ${canPrestige ? 'complete' : 'incomplete'}`}
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          >
            <div className="progress-glow"></div>
          </div>
          <div className="progress-text">
            {progressPercentage.toFixed(1)}%
          </div>
        </div>
        <div className="progress-current">
          <span className="current-coins">{formatCoins(totalCoinsEarned)}</span>
        </div>
      </div>

      <div className="progress-details">
        <div className="detail-row">
          <span className="detail-label">Total Coins Earned:</span>
          <span className="detail-value">{formatCoins(totalCoinsEarned)}</span>
        </div>
        
        {!canPrestige && (
          <div className="detail-row">
            <span className="detail-label">Coins Needed:</span>
            <span className="detail-value needed">{formatCoins(coinsNeeded)}</span>
          </div>
        )}
        
        <div className="detail-row">
          <span className="detail-label">Current Prestige Points:</span>
          <span className="detail-value">{prestigePoints}</span>
        </div>
        
        {potentialPrestigePoints > 0 && (
          <div className="detail-row">
            <span className="detail-label">Potential New Points:</span>
            <span className="detail-value potential">+{potentialPrestigePoints}</span>
          </div>
        )}
      </div>

      <div className="progress-status">
        {canPrestige ? (
          <div className="status-ready">
            <div className="status-icon">✨</div>
            <div className="status-text">
              <div className="status-title">Ready to Prestige!</div>
              <div className="status-subtitle">
                You can now reset for {potentialPrestigePoints} prestige points
              </div>
            </div>
          </div>
        ) : (
          <div className="status-progress">
            <div className="status-icon">🎯</div>
            <div className="status-text">
              <div className="status-title">Keep Earning!</div>
              <div className="status-subtitle">
                {formatCoins(coinsNeeded)} more coins needed to prestige
              </div>
            </div>
          </div>
        )}
      </div>

      {gameState && (
        <div className="current-game-stats">
          <h4>Current Game Stats</h4>
          <div className="game-stats-grid">
            <div className="game-stat">
              <span className="stat-icon">💰</span>
              <span className="stat-value">{formatCoins(gameState.coins)}</span>
              <span className="stat-label">Current Coins</span>
            </div>
            <div className="game-stat">
              <span className="stat-icon">👆</span>
              <span className="stat-value">{gameState.coinsPerTap}</span>
              <span className="stat-label">Per Tap</span>
            </div>
            <div className="game-stat">
              <span className="stat-icon">🤖</span>
              <span className="stat-value">{gameState.autoClickerRate}/s</span>
              <span className="stat-label">Auto Rate</span>
            </div>
          </div>
        </div>
      )}

      <div className="progress-explanation">
        <h4>How Prestige Works</h4>
        <div className="explanation-steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <div className="step-title">Earn Coins</div>
              <div className="step-description">
                Play the game and earn coins to increase your total lifetime earnings
              </div>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <div className="step-title">Reach Threshold</div>
              <div className="step-description">
                Earn {formatCoins(nextPrestigeRequirement)} total coins to unlock prestige
              </div>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <div className="step-title">Reset & Gain</div>
              <div className="step-description">
                Reset your progress but gain prestige points and permanent multipliers
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrestigeProgress;