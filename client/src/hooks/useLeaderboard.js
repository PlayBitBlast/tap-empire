import { useState, useEffect, useCallback, useRef } from 'react';
import leaderboardService from '../services/leaderboardService';

/**
 * useLeaderboard Hook - Custom hook for leaderboard functionality
 * Provides state management and real-time updates for leaderboard data
 */
const useLeaderboard = (options = {}) => {
  const {
    initialType = 'all_time',
    userId = null,
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    enableRealTime = true
  } = options;

  // State
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [userRankData, setUserRankData] = useState(null);
  const [userRanks, setUserRanks] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Refs
  const refreshIntervalRef = useRef(null);
  const unsubscribeRef = useRef(null);

  /**
   * Load leaderboard data
   */
  const loadLeaderboard = useCallback(async (type = initialType, limit = 100, offset = 0) => {
    try {
      setLoading(true);
      setError(null);

      const data = await leaderboardService.getLeaderboard(type, limit, offset);
      setLeaderboardData(data);
      setLastUpdated(Date.now());

      return data;
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError(err.message || 'Failed to load leaderboard');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [initialType]);

  /**
   * Load user rank data
   */
  const loadUserRank = useCallback(async (userIdParam = userId, type = initialType, range = 5) => {
    if (!userIdParam) return null;

    try {
      const data = await leaderboardService.getUserRank(userIdParam, type, range);
      setUserRankData(data);
      return data;
    } catch (err) {
      console.error('Error loading user rank:', err);
      setUserRankData(null);
      throw err;
    }
  }, [userId, initialType]);

  /**
   * Load user ranks across all types
   */
  const loadUserRanks = useCallback(async (userIdParam = userId) => {
    if (!userIdParam) return null;

    try {
      const data = await leaderboardService.getUserRanks(userIdParam);
      setUserRanks(data);
      return data;
    } catch (err) {
      console.error('Error loading user ranks:', err);
      setUserRanks(null);
      throw err;
    }
  }, [userId]);

  /**
   * Load leaderboard statistics
   */
  const loadStats = useCallback(async () => {
    try {
      const data = await leaderboardService.getLeaderboardStats();
      setStats(data);
      return data;
    } catch (err) {
      console.error('Error loading leaderboard stats:', err);
      setStats(null);
      throw err;
    }
  }, []);

  /**
   * Refresh all data
   */
  const refreshAll = useCallback(async (type = initialType) => {
    try {
      setLoading(true);
      setError(null);

      const promises = [
        loadLeaderboard(type),
        loadStats()
      ];

      if (userId) {
        promises.push(loadUserRank(userId, type));
        promises.push(loadUserRanks(userId));
      }

      await Promise.all(promises);
      setLastUpdated(Date.now());
    } catch (err) {
      console.error('Error refreshing leaderboard data:', err);
      setError(err.message || 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  }, [initialType, userId, loadLeaderboard, loadStats, loadUserRank, loadUserRanks]);

  /**
   * Handle real-time updates
   */
  const handleRealTimeUpdate = useCallback((updateData) => {
    if (!updateData) return;

    switch (updateData.type) {
      case 'rank_change':
        if (updateData.data && updateData.data.userId === userId) {
          // Refresh user-specific data
          if (userId) {
            loadUserRank();
            loadUserRanks();
          }
        }
        // Refresh leaderboard to show updated rankings
        loadLeaderboard();
        break;

      case 'leaderboard_reset':
        // Refresh all data on reset
        refreshAll();
        break;

      case 'global_update':
        // Refresh leaderboard data
        loadLeaderboard();
        if (userId) {
          loadUserRank();
        }
        break;

      case 'personal_rank_update':
        if (updateData.data && updateData.data.userId === userId) {
          // Update user rank data
          if (userId) {
            loadUserRank();
            loadUserRanks();
          }
        }
        break;

      default:
        // Generic update - refresh current data
        loadLeaderboard();
        break;
    }

    setLastUpdated(Date.now());
  }, [userId, loadLeaderboard, loadUserRank, loadUserRanks, refreshAll]);

  /**
   * Setup auto-refresh
   */
  const setupAutoRefresh = useCallback(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    refreshIntervalRef.current = setInterval(() => {
      refreshAll();
    }, refreshInterval);
  }, [autoRefresh, refreshInterval, refreshAll]);

  /**
   * Setup real-time updates
   */
  const setupRealTimeUpdates = useCallback(() => {
    if (!enableRealTime) return;

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    unsubscribeRef.current = leaderboardService.subscribeToUpdates(handleRealTimeUpdate);
  }, [enableRealTime, handleRealTimeUpdate]);

  /**
   * Cleanup function
   */
  const cleanup = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  // Effects
  useEffect(() => {
    // Initial data load
    refreshAll();

    // Setup auto-refresh
    setupAutoRefresh();

    // Setup real-time updates
    setupRealTimeUpdates();

    // Cleanup on unmount
    return cleanup;
  }, [refreshAll, setupAutoRefresh, setupRealTimeUpdates, cleanup]);

  // Cleanup on dependency changes
  useEffect(() => {
    return cleanup;
  }, [autoRefresh, refreshInterval, enableRealTime, cleanup]);

  /**
   * Utility functions
   */
  const formatRank = useCallback((rank) => {
    return leaderboardService.formatRank(rank);
  }, []);

  const formatCoins = useCallback((coins) => {
    return leaderboardService.formatCoins(coins);
  }, []);

  const getRankColor = useCallback((rank) => {
    return leaderboardService.getRankColor(rank);
  }, []);

  /**
   * Get user's rank for specific leaderboard type
   */
  const getUserRankForType = useCallback((type) => {
    if (!userRanks || !userRanks.ranks) return null;
    return userRanks.ranks[type] || null;
  }, [userRanks]);

  /**
   * Check if user is in top N
   */
  const isUserInTopN = useCallback((n, type = 'allTime') => {
    const rank = getUserRankForType(type);
    return rank && rank.rank && rank.rank <= n;
  }, [getUserRankForType]);

  /**
   * Get user's best rank across all leaderboards
   */
  const getUserBestRank = useCallback(() => {
    if (!userRanks || !userRanks.ranks) return null;

    const ranks = Object.values(userRanks.ranks)
      .filter(rankData => rankData.rank !== null)
      .map(rankData => rankData.rank);

    return ranks.length > 0 ? Math.min(...ranks) : null;
  }, [userRanks]);

  return {
    // Data
    leaderboardData,
    userRankData,
    userRanks,
    stats,
    
    // State
    loading,
    error,
    lastUpdated,
    
    // Actions
    loadLeaderboard,
    loadUserRank,
    loadUserRanks,
    loadStats,
    refreshAll,
    
    // Utilities
    formatRank,
    formatCoins,
    getRankColor,
    getUserRankForType,
    isUserInTopN,
    getUserBestRank,
    
    // Cleanup
    cleanup
  };
};

export default useLeaderboard;