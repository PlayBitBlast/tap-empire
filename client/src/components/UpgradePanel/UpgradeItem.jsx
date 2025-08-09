import React from 'react';
import './UpgradeItem.css';

/**
 * UpgradeItem component - displays individual upgrade information and purchase button
 */
const UpgradeItem = ({ upgrade, onPurchase, loading, formatNumber }) => {
  /**
   * Get category icon
   */
  const getCategoryIcon = (category) => {
    const icons = {
      tapping: '👆',
      automation: '🤖',
      special: '✨',
      prestige: '👑'
    };
    return icons[category] || '🎯';
  };

  /**
   * Get currency icon
   */
  const getCurrencyIcon = (currency) => {
    return currency === 'prestige_points' ? '👑' : '💰';
  };

  /**
   * Get effect description
   */
  const getEffectDescription = (upgrade) => {
    switch (upgrade.type) {
      case 'tap_multiplier':
        return `+${upgrade.effectIncrease} coins per tap`;
      case 'auto_clicker':
        return `+${upgrade.effectIncrease} coins/sec`;
      case 'golden_tap_chance':
        return `+${(upgrade.effectIncrease * 100).toFixed(1)}% golden tap chance`;
      case 'offline_earnings':
        return `+${upgrade.effectIncrease} hours offline earnings`;
      case 'prestige_multiplier':
        return `+${(upgrade.effectIncrease * 100).toFixed(0)}% all earnings`;
      default:
        return `+${upgrade.effectIncrease} effect`;
    }
  };

  /**
   * Get button text and state
   */
  const getButtonState = () => {
    if (loading) {
      return { text: 'Purchasing...', disabled: true, className: 'loading' };
    }
    
    if (upgrade.isMaxLevel) {
      return { text: 'MAX LEVEL', disabled: true, className: 'max-level' };
    }
    
    if (!upgrade.canAfford) {
      return { 
        text: `Need ${formatNumber(upgrade.currentCost - (upgrade.currency === 'coins' ? 0 : 0))}`, 
        disabled: true, 
        className: 'cannot-afford' 
      };
    }
    
    return { 
      text: `Buy for ${formatNumber(upgrade.currentCost)}`, 
      disabled: false, 
      className: 'can-purchase' 
    };
  };

  const buttonState = getButtonState();

  return (
    <div className={`upgrade-item ${upgrade.category} ${upgrade.canAfford ? 'affordable' : 'unaffordable'}`}>
      <div className="upgrade-header">
        <div className="upgrade-icon">
          {getCategoryIcon(upgrade.category)}
        </div>
        <div className="upgrade-title">
          <h3 className="upgrade-name">{upgrade.name}</h3>
          <p className="upgrade-description">{upgrade.description}</p>
        </div>
        <div className="upgrade-level">
          <span className="level-text">Level</span>
          <span className="level-number">{upgrade.currentLevel}</span>
          <span className="level-max">/ {upgrade.maxLevel}</span>
        </div>
      </div>

      <div className="upgrade-details">
        <div className="upgrade-effect">
          <div className="effect-current">
            <span className="effect-label">Current Effect:</span>
            <span className="effect-value">
              {upgrade.currentLevel === 0 ? 'None' : formatNumber(upgrade.currentEffect)}
            </span>
          </div>
          
          {!upgrade.isMaxLevel && (
            <div className="effect-next">
              <span className="effect-label">Next Level:</span>
              <span className="effect-value effect-increase">
                {getEffectDescription(upgrade)}
              </span>
            </div>
          )}
        </div>

        <div className="upgrade-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${(upgrade.currentLevel / upgrade.maxLevel) * 100}%` }}
            />
          </div>
          <span className="progress-text">
            {upgrade.currentLevel} / {upgrade.maxLevel}
          </span>
        </div>
      </div>

      <div className="upgrade-purchase">
        <div className="upgrade-cost">
          {!upgrade.isMaxLevel && (
            <>
              <span className="cost-label">Cost:</span>
              <span className="cost-value">
                {getCurrencyIcon(upgrade.currency)} {formatNumber(upgrade.currentCost)}
              </span>
            </>
          )}
        </div>
        
        <button
          className={`purchase-btn ${buttonState.className}`}
          onClick={onPurchase}
          disabled={buttonState.disabled}
        >
          {buttonState.text}
        </button>
      </div>

      {/* Next cost preview */}
      {!upgrade.isMaxLevel && upgrade.nextCost && (
        <div className="upgrade-next-cost">
          <span className="next-cost-label">Next cost:</span>
          <span className="next-cost-value">
            {getCurrencyIcon(upgrade.currency)} {formatNumber(upgrade.nextCost)}
          </span>
        </div>
      )}
    </div>
  );
};

export default UpgradeItem;