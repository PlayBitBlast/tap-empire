// PrestigeStats.jsx - Component for displaying prestige statistics

import React from 'react';
import './PrestigeStats.css';

/**
 * Prestige statistics component that displays detailed prestige information
 */
const PrestigeStats = ({ 
  stats, 
  formatCoins, 
  formatPrestigePoints, 
  getPrestigeLevelName 
}) => {
  if (!stats) {
    return (
      <div className="prestige-stats loading">
        <div className="loading-message">Loading prestige statistics...</div>
      </div>
    );
  }

  const {
    prestigeLevel,
    prestigePoints,
    totalPrestigePointsSpent,
    prestigeUpgradeCount,
    totalPrestigeMultiplier,
    lifetimeCoins,
    nextPrestigeAt,
    canPrestigeAgain
  } = stats;

  const multiplierPercentage = ((totalPrestigeMultiplier - 1) * 100).toFixed(1);

  return (
    <div className="prestige-stats">
      <div className="stats-header">
        <h3>Prestige Statistics</h3>
      </div>

      <div className="stats-grid">
        {/* Current Prestige Level */}
        <div className="stat-card primary">
          <div className="stat-icon">👑</div>
          <div className="stat-content">
            <div className="stat-value">{prestigeLevel}</div>
            <div className="stat-label">Prestige Level</div>
            <div className="stat-subtitle">{getPrestigeLevelName(prestigeLevel)}</div>
          </div>
        </div>

        {/* Prestige Points */}
        <div className="stat-card secondary">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <div className="stat-value">{formatPrestigePoints(prestigePoints)}</div>
            <div className="stat-label">Prestige Points</div>
            <div className="stat-subtitle">Available to spend</div>
          </div>
        </div>

        {/* Total Multiplier */}
        <div className="stat-card accent">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-value">+{multiplierPercentage}%</div>
            <div className="stat-label">Total Multiplier</div>
            <div className="stat-subtitle">From prestige bonuses</div>
          </div>
        </div>

        {/* Lifetime Coins */}
        <div className="stat-card info">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <div className="stat-value">{formatCoins(lifetimeCoins)}</div>
            <div className="stat-label">Lifetime Coins</div>
            <div className="stat-subtitle">Total earned ever</div>
          </div>
        </div>
      </div>

      <div className="detailed-stats">
        <h4>Detailed Statistics</h4>
        
        <div className="stat-row">
          <span className="stat-name">Points Spent:</span>
          <span className="stat-value">{formatPrestigePoints(totalPrestigePointsSpent)}</span>
        </div>
        
        <div className="stat-row">
          <span className="stat-name">Prestige Upgrades:</span>
          <span className="stat-value">{prestigeUpgradeCount}</span>
        </div>
        
        <div className="stat-row">
          <span className="stat-name">Next Prestige At:</span>
          <span className="stat-value">{formatCoins(nextPrestigeAt)}</span>
        </div>
        
        <div className="stat-row">
          <span className="stat-name">Can Prestige Again:</span>
          <span className={`stat-value ${canPrestigeAgain ? 'positive' : 'negative'}`}>
            {canPrestigeAgain ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      <div className="prestige-milestones">
        <h4>Prestige Milestones</h4>
        <div className="milestones-list">
          {[1, 5, 10, 25, 50, 100].map(milestone => {
            const achieved = prestigeLevel >= milestone;
            const multiplier = Math.pow(1.1, milestone);
            const bonus = ((multiplier - 1) * 100).toFixed(1);
            
            return (
              <div 
                key={milestone} 
                className={`milestone-item ${achieved ? 'achieved' : 'locked'}`}
              >
                <div className="milestone-icon">
                  {achieved ? '✅' : '🔒'}
                </div>
                <div className="milestone-content">
                  <div className="milestone-title">
                    Prestige Level {milestone}
                  </div>
                  <div className="milestone-reward">
                    +{bonus}% earnings multiplier
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="prestige-tips">
        <h4>💡 Prestige Tips</h4>
        <div className="tips-list">
          <div className="tip-item">
            <span className="tip-icon">🎯</span>
            <span className="tip-text">
              Higher prestige levels provide exponentially better multipliers
            </span>
          </div>
          <div className="tip-item">
            <span className="tip-icon">⏰</span>
            <span className="tip-text">
              Prestige when progress slows down significantly
            </span>
          </div>
          <div className="tip-item">
            <span className="tip-icon">💎</span>
            <span className="tip-text">
              Invest prestige points in upgrades that match your playstyle
            </span>
          </div>
          <div className="tip-item">
            <span className="tip-icon">🏃</span>
            <span className="tip-text">
              Early prestiges help build momentum for faster progression
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrestigeStats;