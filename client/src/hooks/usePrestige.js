// React hook for managing prestige system state and operations

import { useState, useEffect, useCallback } from 'react';
import PrestigeService from '../services/prestigeService';

/**
 * Custom hook for managing prestige system
 * @returns {Object} Prestige state and operations
 */
const usePrestige = () => {
  const [prestigeService] = useState(() => new PrestigeService());
  
  // State management
  const [prestigeInfo, setPrestigeInfo] = useState(null);
  const [prestigeUpgrades, setPrestigeUpgrades] = useState(null);
  const [prestigeStats, setPrestigeStats] = useState(null);
  const [prestigeProgress, setPrestigeProgress] = useState(null);
  const [prestigeLeaderboard, setPrestigeLeaderboard] = useState(null);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isPrestiging, setIsPrestiging] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  
  // Error state
  const [error, setError] = useState(null);

  /**
   * Load complete prestige information
   */
  const loadPrestigeInfo = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const info = await prestigeService.getPrestigeInfo();
      setPrestigeInfo(info);
      
      // Update individual states from the complete info
      if (info.upgrades) setPrestigeUpgrades(info.upgrades);
      if (info.stats) setPrestigeStats(info.stats);
      if (info.progress) setPrestigeProgress(info.progress);
      
    } catch (err) {
      setError(err.message);
      console.error('Error loading prestige info:', err);
    } finally {
      setIsLoading(false);
    }
  }, [prestigeService]);

  /**
   * Check prestige eligibility
   */
  const checkPrestigeEligibility = useCallback(async () => {
    try {
      const eligibility = await prestigeService.checkPrestigeEligibility();
      
      setPrestigeInfo(prev => prev ? {
        ...prev,
        eligibility
      } : { eligibility });
      
      return eligibility;
    } catch (err) {
      setError(err.message);
      console.error('Error checking prestige eligibility:', err);
      return null;
    }
  }, [prestigeService]);

  /**
   * Perform prestige reset
   */
  const performPrestige = useCallback(async () => {
    try {
      setIsPrestiging(true);
      setError(null);
      
      const result = await prestigeService.performPrestige();
      
      // Reload all prestige data after successful prestige
      await loadPrestigeInfo();
      
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error performing prestige:', err);
      throw err;
    } finally {
      setIsPrestiging(false);
    }
  }, [prestigeService, loadPrestigeInfo]);

  /**
   * Load prestige upgrades
   */
  const loadPrestigeUpgrades = useCallback(async () => {
    try {
      const upgrades = await prestigeService.getPrestigeUpgrades();
      setPrestigeUpgrades(upgrades);
      return upgrades;
    } catch (err) {
      setError(err.message);
      console.error('Error loading prestige upgrades:', err);
      return null;
    }
  }, [prestigeService]);

  /**
   * Purchase prestige upgrade
   */
  const purchasePrestigeUpgrade = useCallback(async (upgradeType) => {
    try {
      setIsPurchasing(true);
      setError(null);
      
      const result = await prestigeService.purchasePrestigeUpgrade(upgradeType);
      
      // Reload upgrades after successful purchase
      await loadPrestigeUpgrades();
      
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error purchasing prestige upgrade:', err);
      throw err;
    } finally {
      setIsPurchasing(false);
    }
  }, [prestigeService, loadPrestigeUpgrades]);

  /**
   * Load prestige statistics
   */
  const loadPrestigeStats = useCallback(async () => {
    try {
      const stats = await prestigeService.getPrestigeStats();
      setPrestigeStats(stats);
      return stats;
    } catch (err) {
      setError(err.message);
      console.error('Error loading prestige stats:', err);
      return null;
    }
  }, [prestigeService]);

  /**
   * Load prestige leaderboard
   */
  const loadPrestigeLeaderboard = useCallback(async (limit = 100) => {
    try {
      const leaderboard = await prestigeService.getPrestigeLeaderboard(limit);
      setPrestigeLeaderboard(leaderboard);
      return leaderboard;
    } catch (err) {
      setError(err.message);
      console.error('Error loading prestige leaderboard:', err);
      return null;
    }
  }, [prestigeService]);

  /**
   * Load prestige progress
   */
  const loadPrestigeProgress = useCallback(async () => {
    try {
      const progress = await prestigeService.getPrestigeProgress();
      setPrestigeProgress(progress);
      return progress;
    } catch (err) {
      setError(err.message);
      console.error('Error loading prestige progress:', err);
      return null;
    }
  }, [prestigeService]);

  /**
   * Refresh all prestige data
   */
  const refreshPrestigeData = useCallback(async () => {
    await Promise.all([
      loadPrestigeInfo(),
      loadPrestigeLeaderboard()
    ]);
  }, [loadPrestigeInfo, loadPrestigeLeaderboard]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Helper functions using the service
  const canPrestigeLocally = useCallback((totalCoinsEarned) => {
    return prestigeService.canPrestigeLocally(totalCoinsEarned);
  }, [prestigeService]);

  const calculatePrestigePoints = useCallback((lifetimeCoins) => {
    return prestigeService.calculatePrestigePoints(lifetimeCoins);
  }, [prestigeService]);

  const formatPrestigePoints = useCallback((points) => {
    return prestigeService.formatPrestigePoints(points);
  }, [prestigeService]);

  const formatCoins = useCallback((coins) => {
    return prestigeService.formatCoins(coins);
  }, [prestigeService]);

  const getPrestigeLevelName = useCallback((level) => {
    return prestigeService.getPrestigeLevelName(level);
  }, [prestigeService]);

  const calculatePrestigeProgress = useCallback((currentCoins, requiredCoins) => {
    return prestigeService.calculatePrestigeProgress(currentCoins, requiredCoins);
  }, [prestigeService]);

  const getPrestigeBenefits = useCallback((prestigeLevel) => {
    return prestigeService.getPrestigeBenefits(prestigeLevel);
  }, [prestigeService]);

  // Load initial data on mount
  useEffect(() => {
    loadPrestigeInfo();
  }, [loadPrestigeInfo]);

  return {
    // State
    prestigeInfo,
    prestigeUpgrades,
    prestigeStats,
    prestigeProgress,
    prestigeLeaderboard,
    
    // Loading states
    isLoading,
    isPrestiging,
    isPurchasing,
    
    // Error state
    error,
    
    // Actions
    loadPrestigeInfo,
    checkPrestigeEligibility,
    performPrestige,
    loadPrestigeUpgrades,
    purchasePrestigeUpgrade,
    loadPrestigeStats,
    loadPrestigeLeaderboard,
    loadPrestigeProgress,
    refreshPrestigeData,
    clearError,
    
    // Helper functions
    canPrestigeLocally,
    calculatePrestigePoints,
    formatPrestigePoints,
    formatCoins,
    getPrestigeLevelName,
    calculatePrestigeProgress,
    getPrestigeBenefits
  };
};

export default usePrestige;