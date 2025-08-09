import { useState, useEffect, useCallback } from 'react';
import { UPGRADE_CONFIGS } from '../shared/constants/gameConfig';

/**
 * Custom hook for managing upgrades
 * @param {Object} gameEngine - Game engine instance
 * @returns {Object} Upgrade state and methods
 */
const useUpgrades = (gameEngine) => {
  const [upgrades, setUpgrades] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [purchaseHistory, setPurchaseHistory] = useState([]);

  /**
   * Update upgrades from game engine state
   */
  const updateUpgrades = useCallback(() => {
    if (!gameEngine) return;

    try {
      const gameState = gameEngine.getState();
      const updatedUpgrades = {};

      for (const [upgradeType, config] of Object.entries(UPGRADE_CONFIGS)) {
        const upgradeInfo = gameEngine.getUpgradeInfo(upgradeType);
        updatedUpgrades[upgradeType] = upgradeInfo;
      }

      setUpgrades(updatedUpgrades);
      setError(null);
    } catch (err) {
      console.error('Error updating upgrades:', err);
      setError(err.message);
    }
  }, [gameEngine]);

  /**
   * Purchase an upgrade
   */
  const purchaseUpgrade = useCallback(async (upgradeType) => {
    if (!gameEngine || loading) return null;

    setLoading(true);
    setError(null);

    try {
      const result = await gameEngine.purchaseUpgrade(upgradeType);
      
      // Add to purchase history
      setPurchaseHistory(prev => [
        {
          upgradeType,
          timestamp: Date.now(),
          cost: result.cost,
          level: result.newLevel
        },
        ...prev.slice(0, 9) // Keep last 10 purchases
      ]);

      // Update upgrades
      updateUpgrades();

      return result;
    } catch (err) {
      console.error('Error purchasing upgrade:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [gameEngine, loading, updateUpgrades]);

  /**
   * Check if user can afford an upgrade
   */
  const canAffordUpgrade = useCallback((upgradeType) => {
    if (!gameEngine) return false;
    return gameEngine.canAffordUpgrade(upgradeType);
  }, [gameEngine]);

  /**
   * Get upgrade cost
   */
  const getUpgradeCost = useCallback((upgradeType) => {
    if (!gameEngine) return 0;
    return gameEngine.getUpgradeCost(upgradeType);
  }, [gameEngine]);

  /**
   * Get upgrades by category
   */
  const getUpgradesByCategory = useCallback((category) => {
    return Object.values(upgrades).filter(upgrade => 
      category === 'all' || upgrade.category === category
    );
  }, [upgrades]);

  /**
   * Get upgrade statistics
   */
  const getUpgradeStats = useCallback(() => {
    const stats = {
      totalUpgrades: 0,
      totalLevels: 0,
      maxedUpgrades: 0,
      categories: {}
    };

    Object.values(upgrades).forEach(upgrade => {
      stats.totalUpgrades++;
      stats.totalLevels += upgrade.currentLevel;
      
      if (upgrade.isMaxLevel) {
        stats.maxedUpgrades++;
      }

      if (!stats.categories[upgrade.category]) {
        stats.categories[upgrade.category] = {
          count: 0,
          totalLevels: 0,
          maxedCount: 0
        };
      }

      stats.categories[upgrade.category].count++;
      stats.categories[upgrade.category].totalLevels += upgrade.currentLevel;
      
      if (upgrade.isMaxLevel) {
        stats.categories[upgrade.category].maxedCount++;
      }
    });

    return stats;
  }, [upgrades]);

  /**
   * Reset error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Clear purchase history
   */
  const clearPurchaseHistory = useCallback(() => {
    setPurchaseHistory([]);
  }, []);

  // Set up event listeners
  useEffect(() => {
    if (!gameEngine) return;

    const handleUpgradePurchased = (data) => {
      updateUpgrades();
    };

    const handleUpgradeReverted = (data) => {
      updateUpgrades();
      setError(`Upgrade reverted: ${data.reason}`);
    };

    const handleCoinsUpdated = () => {
      updateUpgrades();
    };

    const handleStateLoaded = () => {
      updateUpgrades();
    };

    const handleStateCorrected = () => {
      updateUpgrades();
    };

    // Add event listeners
    gameEngine.on('upgrade:purchased', handleUpgradePurchased);
    gameEngine.on('upgrade:reverted', handleUpgradeReverted);
    gameEngine.on('coins:updated', handleCoinsUpdated);
    gameEngine.on('state:loaded', handleStateLoaded);
    gameEngine.on('state:corrected', handleStateCorrected);

    // Initial update
    updateUpgrades();

    // Cleanup
    return () => {
      gameEngine.off('upgrade:purchased', handleUpgradePurchased);
      gameEngine.off('upgrade:reverted', handleUpgradeReverted);
      gameEngine.off('coins:updated', handleCoinsUpdated);
      gameEngine.off('state:loaded', handleStateLoaded);
      gameEngine.off('state:corrected', handleStateCorrected);
    };
  }, [gameEngine, updateUpgrades]);

  return {
    upgrades,
    loading,
    error,
    purchaseHistory,
    purchaseUpgrade,
    canAffordUpgrade,
    getUpgradeCost,
    getUpgradesByCategory,
    getUpgradeStats,
    clearError,
    clearPurchaseHistory,
    updateUpgrades
  };
};

export default useUpgrades;