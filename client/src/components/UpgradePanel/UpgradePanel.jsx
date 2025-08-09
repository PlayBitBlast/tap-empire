import React, { useState, useEffect } from 'react';
import { UPGRADE_CONFIGS } from '../../shared/constants/gameConfig';
import { calculateUpgradeCost, calculateUpgradeEffect } from '../../shared/utils/calculations';
import UpgradeItem from './UpgradeItem';
import './UpgradePanel.css';

/**
 * UpgradePanel component - displays available upgrades and handles purchases
 */
const UpgradePanel = ({ gameEngine, userCoins, userUpgrades, onUpgradePurchase }) => {
  const [upgrades, setUpgrades] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('cost'); // cost, level, effect
  const [loading, setLoading] = useState(false);

  // Categories for filtering upgrades
  const categories = {
    all: { name: 'All Upgrades', icon: '🎯' },
    tapping: { name: 'Tapping', icon: '👆' },
    automation: { name: 'Auto-Clickers', icon: '🤖' },
    special: { name: 'Special', icon: '✨' },
    prestige: { name: 'Prestige', icon: '👑' }
  };

  // Update upgrades when game state changes
  useEffect(() => {
    updateUpgrades();
  }, [userCoins, userUpgrades]);

  /**
   * Update upgrade information
   */
  const updateUpgrades = () => {
    const updatedUpgrades = {};
    
    for (const [upgradeType, config] of Object.entries(UPGRADE_CONFIGS)) {
      const currentLevel = userUpgrades[upgradeType] || 0;
      const nextLevel = currentLevel + 1;
      
      // Calculate costs and effects
      const currentCost = calculateUpgradeCost(upgradeType, currentLevel);
      const currentEffect = calculateUpgradeEffect(upgradeType, currentLevel);
      const nextEffect = calculateUpgradeEffect(upgradeType, nextLevel);
      
      // Check affordability and availability
      const canAfford = userCoins >= currentCost;
      const isMaxLevel = currentLevel >= config.maxLevel;
      const isAvailable = !isMaxLevel;
      
      updatedUpgrades[upgradeType] = {
        type: upgradeType,
        name: config.name,
        description: config.description,
        category: config.category,
        currency: config.currency || 'coins',
        currentLevel,
        maxLevel: config.maxLevel,
        currentEffect,
        nextEffect,
        effectIncrease: nextEffect - currentEffect,
        currentCost,
        nextCost: isMaxLevel ? null : calculateUpgradeCost(upgradeType, nextLevel),
        canAfford,
        isMaxLevel,
        isAvailable
      };
    }
    
    setUpgrades(updatedUpgrades);
  };

  /**
   * Handle upgrade purchase
   */
  const handleUpgradePurchase = async (upgradeType) => {
    if (loading) return;
    
    const upgrade = upgrades[upgradeType];
    if (!upgrade || !upgrade.canAfford || !upgrade.isAvailable) {
      return;
    }

    setLoading(true);
    
    try {
      await gameEngine.purchaseUpgrade(upgradeType);
      
      if (onUpgradePurchase) {
        onUpgradePurchase(upgradeType, upgrade);
      }
    } catch (error) {
      console.error('Failed to purchase upgrade:', error);
      // Error handling is done in the game engine
    } finally {
      setLoading(false);
    }
  };

  /**
   * Filter upgrades by category
   */
  const getFilteredUpgrades = () => {
    let filtered = Object.values(upgrades);
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(upgrade => upgrade.category === selectedCategory);
    }
    
    // Sort upgrades
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'cost':
          if (a.isMaxLevel && !b.isMaxLevel) return 1;
          if (!a.isMaxLevel && b.isMaxLevel) return -1;
          return a.currentCost - b.currentCost;
        case 'level':
          return b.currentLevel - a.currentLevel;
        case 'effect':
          return b.effectIncrease - a.effectIncrease;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
    
    return filtered;
  };

  /**
   * Format number for display
   */
  const formatNumber = (num) => {
    if (num == null || num === undefined || isNaN(num)) {
      return '0';
    }
    
    const numValue = Number(num);
    
    if (numValue >= 1000000000) {
      return (numValue / 1000000000).toFixed(1) + 'B';
    }
    if (numValue >= 1000000) {
      return (numValue / 1000000).toFixed(1) + 'M';
    }
    if (numValue >= 1000) {
      return (numValue / 1000).toFixed(1) + 'K';
    }
    return numValue.toString();
  };

  const filteredUpgrades = getFilteredUpgrades();

  return (
    <div className="upgrade-panel">
      <div className="upgrade-panel-header">
        <h2>Upgrades</h2>
        <div className="user-currency">
          <span className="coins">💰 {formatNumber(userCoins)}</span>
        </div>
      </div>

      {/* Category Filter */}
      <div className="upgrade-categories">
        {Object.entries(categories).map(([key, category]) => (
          <button
            key={key}
            className={`category-btn ${selectedCategory === key ? 'active' : ''}`}
            onClick={() => setSelectedCategory(key)}
          >
            <span className="category-icon">{category.icon}</span>
            <span className="category-name">{category.name}</span>
          </button>
        ))}
      </div>

      {/* Sort Options */}
      <div className="upgrade-sort">
        <label>Sort by:</label>
        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)}
          className="sort-select"
        >
          <option value="cost">Cost (Low to High)</option>
          <option value="level">Level (High to Low)</option>
          <option value="effect">Effect (High to Low)</option>
          <option value="name">Name (A-Z)</option>
        </select>
      </div>

      {/* Upgrades List */}
      <div className="upgrades-list">
        {filteredUpgrades.length === 0 ? (
          <div className="no-upgrades">
            <p>No upgrades available in this category.</p>
          </div>
        ) : (
          filteredUpgrades.map((upgrade) => (
            <UpgradeItem
              key={upgrade.type}
              upgrade={upgrade}
              onPurchase={() => handleUpgradePurchase(upgrade.type)}
              loading={loading}
              formatNumber={formatNumber}
            />
          ))
        )}
      </div>

      {/* Upgrade Statistics */}
      <div className="upgrade-stats">
        <div className="stat-item">
          <span className="stat-label">Total Upgrades:</span>
          <span className="stat-value">
            {Object.values(userUpgrades).reduce((sum, level) => sum + level, 0)}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Upgrade Types:</span>
          <span className="stat-value">
            {Object.keys(userUpgrades).length} / {Object.keys(UPGRADE_CONFIGS).length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default UpgradePanel;