// PrestigeUpgrades.jsx - Component for displaying and purchasing prestige upgrades

import React from 'react';
import './PrestigeUpgrades.css';

/**
 * Prestige upgrades component that displays available prestige upgrades
 */
const PrestigeUpgrades = ({ 
  upgrades, 
  isPurchasing, 
  onPurchase, 
  formatPrestigePoints 
}) => {
  if (!upgrades) {
    return (
      <div className="prestige-upgrades loading">
        <div className="loading-message">Loading prestige upgrades...</div>
      </div>
    );
  }

  const { upgrades: upgradeList, userPrestigePoints } = upgrades;
  const upgradeTypes = Object.keys(upgradeList);

  if (upgradeTypes.length === 0) {
    return (
      <div className="prestige-upgrades empty">
        <div className="empty-message">
          <h3>No Prestige Upgrades Available</h3>
          <p>Prestige upgrades will become available after your first prestige.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="prestige-upgrades">
      <div className="upgrades-header">
        <h3>Prestige Upgrades</h3>
        <div className="points-display">
          <span className="points-icon">⭐</span>
          <span className="points-value">{formatPrestigePoints(userPrestigePoints)}</span>
          <span className="points-label">Available Points</span>
        </div>
      </div>

      <div className="upgrades-list">
        {upgradeTypes.map(upgradeType => {
          const upgrade = upgradeList[upgradeType];
          const {
            name,
            description,
            currentLevel,
            maxLevel,
            currentEffect,
            nextEffect,
            effectIncrease,
            currentCost,
            canAfford,
            isMaxLevel,
            isAvailable
          } = upgrade;

          return (
            <div 
              key={upgradeType} 
              className={`upgrade-item ${canAfford ? 'affordable' : 'expensive'} ${isMaxLevel ? 'max-level' : ''}`}
            >
              <div className="upgrade-header">
                <div className="upgrade-info">
                  <h4 className="upgrade-name">{name}</h4>
                  <p className="upgrade-description">{description}</p>
                </div>
                <div className="upgrade-level">
                  <span className="level-text">
                    Level {currentLevel} / {maxLevel}
                  </span>
                </div>
              </div>

              <div className="upgrade-stats">
                <div className="stat-item">
                  <span className="stat-label">Current Effect:</span>
                  <span className="stat-value">
                    +{(currentEffect * 100).toFixed(1)}%
                  </span>
                </div>
                {!isMaxLevel && (
                  <div className="stat-item">
                    <span className="stat-label">Next Level:</span>
                    <span className="stat-value">
                      +{(nextEffect * 100).toFixed(1)}% 
                      <span className="stat-increase">
                        (+{(effectIncrease * 100).toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                )}
              </div>

              <div className="upgrade-footer">
                {isMaxLevel ? (
                  <div className="max-level-badge">
                    <span className="badge-icon">🏆</span>
                    <span className="badge-text">MAX LEVEL</span>
                  </div>
                ) : (
                  <div className="upgrade-purchase">
                    <div className="upgrade-cost">
                      <span className="cost-icon">⭐</span>
                      <span className="cost-value">{formatPrestigePoints(currentCost)}</span>
                    </div>
                    <button
                      className={`purchase-button ${canAfford ? 'enabled' : 'disabled'}`}
                      onClick={() => onPurchase(upgradeType)}
                      disabled={!canAfford || isPurchasing || !isAvailable}
                    >
                      {isPurchasing ? (
                        <div className="button-loading">
                          <div className="loading-spinner"></div>
                          <span>Purchasing...</span>
                        </div>
                      ) : canAfford ? (
                        <div className="button-content">
                          <span className="button-icon">⬆️</span>
                          <span className="button-text">UPGRADE</span>
                        </div>
                      ) : (
                        <div className="button-content">
                          <span className="button-icon">🔒</span>
                          <span className="button-text">
                            Need {formatPrestigePoints(currentCost - userPrestigePoints)} more
                          </span>
                        </div>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Progress bar for upgrade level */}
              <div className="upgrade-progress">
                <div 
                  className="progress-fill" 
                  style={{ width: `${(currentLevel / maxLevel) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="upgrades-info">
        <div className="info-item">
          <h4>💡 Tip</h4>
          <p>
            Prestige upgrades provide permanent bonuses that persist through all future prestiges. 
            Choose wisely based on your playstyle!
          </p>
        </div>
        <div className="info-item">
          <h4>⭐ Earning Points</h4>
          <p>
            Earn more prestige points by reaching higher total coin amounts before prestiging. 
            The more coins you earn in your lifetime, the more points you'll receive.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrestigeUpgrades;