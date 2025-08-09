import React, { useState, useEffect } from 'react';
import eventService from '../../services/eventService';
import './EventUpgrades.css';

const EventUpgrades = ({ event, userCoins, onUpgradePurchase }) => {
  const [upgrades, setUpgrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);

  useEffect(() => {
    loadEventDetails();
  }, [event.id]);

  const loadEventDetails = async () => {
    try {
      setLoading(true);
      const eventDetails = await eventService.getEventById(event.id);
      if (eventDetails && eventDetails.upgrades) {
        setUpgrades(eventDetails.upgrades);
      }
    } catch (error) {
      console.error('Error loading event details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseUpgrade = async (upgrade) => {
    if (purchasing || userCoins < upgrade.cost || upgrade.userLevel >= upgrade.maxLevel) {
      return;
    }

    try {
      setPurchasing(upgrade.id);
      
      const result = await eventService.purchaseEventUpgrade(upgrade.id);
      
      // Update local state
      setUpgrades(prev => prev.map(u => 
        u.id === upgrade.id 
          ? { ...u, userLevel: result.newLevel }
          : u
      ));
      
      // Notify parent component
      if (onUpgradePurchase) {
        onUpgradePurchase(upgrade, result.newLevel);
      }
      
    } catch (error) {
      console.error('Error purchasing upgrade:', error);
      // You might want to show an error message to the user here
    } finally {
      setPurchasing(null);
    }
  };

  const getUpgradeIcon = (type) => {
    switch (type) {
      case 'tap_multiplier':
        return '👆';
      case 'auto_clicker':
        return '🤖';
      case 'auto_clicker_multiplier':
        return '⚡';
      case 'special_bonus':
        return '💎';
      default:
        return '🎁';
    }
  };

  const getUpgradeDescription = (upgrade) => {
    switch (upgrade.type) {
      case 'tap_multiplier':
        return `+${(upgrade.benefit * 100).toFixed(0)}% tap earnings`;
      case 'auto_clicker':
        return `+${upgrade.benefit} coins per second`;
      case 'auto_clicker_multiplier':
        return `+${(upgrade.benefit * 100).toFixed(0)}% auto-clicker earnings`;
      case 'special_bonus':
        return `${upgrade.description}`;
      default:
        return upgrade.description || 'Special upgrade';
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    } else if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  if (loading) {
    return (
      <div className="event-upgrades loading">
        <div className="loading-spinner"></div>
        <p>Loading exclusive upgrades...</p>
      </div>
    );
  }

  if (upgrades.length === 0) {
    return (
      <div className="event-upgrades empty">
        <p>No exclusive upgrades available for this event.</p>
      </div>
    );
  }

  return (
    <div className="event-upgrades">
      <div className="event-upgrades-header">
        <h3>🎁 Exclusive Event Upgrades</h3>
        <p>Available only during {event.name}!</p>
      </div>
      
      <div className="upgrades-grid">
        {upgrades.map(upgrade => {
          const canAfford = userCoins >= upgrade.cost;
          const isMaxLevel = upgrade.userLevel >= upgrade.maxLevel;
          const isPurchasing = purchasing === upgrade.id;
          
          return (
            <div 
              key={upgrade.id} 
              className={`upgrade-card ${!canAfford ? 'unaffordable' : ''} ${isMaxLevel ? 'max-level' : ''}`}
            >
              <div className="upgrade-header">
                <span className="upgrade-icon">{getUpgradeIcon(upgrade.type)}</span>
                <div className="upgrade-info">
                  <h4 className="upgrade-name">{upgrade.name}</h4>
                  <p className="upgrade-description">
                    {getUpgradeDescription(upgrade)}
                  </p>
                </div>
              </div>
              
              <div className="upgrade-stats">
                <div className="upgrade-level">
                  Level: {upgrade.userLevel}/{upgrade.maxLevel}
                </div>
                
                {upgrade.userLevel < upgrade.maxLevel && (
                  <div className="upgrade-cost">
                    Cost: {formatNumber(upgrade.cost)} coins
                  </div>
                )}
              </div>
              
              {upgrade.userLevel > 0 && (
                <div className="upgrade-owned">
                  <span className="owned-indicator">✓ Owned</span>
                  <span className="current-benefit">
                    Current: {getUpgradeDescription({ ...upgrade, benefit: upgrade.benefit * upgrade.userLevel })}
                  </span>
                </div>
              )}
              
              <button
                className={`upgrade-button ${isPurchasing ? 'purchasing' : ''}`}
                onClick={() => handlePurchaseUpgrade(upgrade)}
                disabled={!canAfford || isMaxLevel || isPurchasing}
              >
                {isPurchasing ? (
                  <>
                    <span className="button-spinner"></span>
                    Purchasing...
                  </>
                ) : isMaxLevel ? (
                  'Max Level'
                ) : !canAfford ? (
                  'Not Enough Coins'
                ) : (
                  `Buy for ${formatNumber(upgrade.cost)}`
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EventUpgrades;