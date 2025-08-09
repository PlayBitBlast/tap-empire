import { useState, useEffect, useCallback } from 'react';
import socialService from '../services/socialService';

/**
 * Custom hook for managing social features
 */
export const useSocial = () => {
  const [friends, setFriends] = useState([]);
  const [receivedGifts, setReceivedGifts] = useState([]);
  const [socialStats, setSocialStats] = useState(null);
  const [friendActivity, setFriendActivity] = useState([]);
  const [friendSuggestions, setFriendSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Load friends list
   */
  const loadFriends = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const friendsData = await socialService.getFriends();
      setFriends(friendsData);
    } catch (err) {
      setError(err.message);
      console.error('Error loading friends:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load received gifts
   */
  const loadReceivedGifts = useCallback(async () => {
    try {
      setError(null);
      const gifts = await socialService.getReceivedGifts();
      setReceivedGifts(gifts);
    } catch (err) {
      setError(err.message);
      console.error('Error loading received gifts:', err);
    }
  }, []);

  /**
   * Load social statistics
   */
  const loadSocialStats = useCallback(async () => {
    try {
      setError(null);
      const stats = await socialService.getSocialStats();
      setSocialStats(stats);
    } catch (err) {
      setError(err.message);
      console.error('Error loading social stats:', err);
    }
  }, []);

  /**
   * Load friend activity feed
   */
  const loadFriendActivity = useCallback(async (limit = 20) => {
    try {
      setError(null);
      const activities = await socialService.getFriendActivity(limit);
      setFriendActivity(activities);
    } catch (err) {
      setError(err.message);
      console.error('Error loading friend activity:', err);
    }
  }, []);

  /**
   * Load friend suggestions
   */
  const loadFriendSuggestions = useCallback(async (limit = 10) => {
    try {
      setError(null);
      const suggestions = await socialService.getFriendSuggestions(limit);
      setFriendSuggestions(suggestions);
    } catch (err) {
      setError(err.message);
      console.error('Error loading friend suggestions:', err);
    }
  }, []);

  /**
   * Import friends from Telegram
   */
  const importTelegramFriends = useCallback(async (telegramFriends) => {
    try {
      setLoading(true);
      setError(null);
      const result = await socialService.importTelegramFriends(telegramFriends);
      
      // Reload friends list after import
      await loadFriends();
      
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error importing Telegram friends:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadFriends]);

  /**
   * Send gift to a friend
   */
  const sendGift = useCallback(async (receiverId, amount, message = null) => {
    try {
      setError(null);
      const result = await socialService.sendGift(receiverId, amount, message);
      
      // Update social stats after sending gift
      await loadSocialStats();
      
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error sending gift:', err);
      throw err;
    }
  }, [loadSocialStats]);

  /**
   * Claim a gift
   */
  const claimGift = useCallback(async (giftId) => {
    try {
      setError(null);
      const result = await socialService.claimGift(giftId);
      
      // Reload received gifts and social stats after claiming
      await Promise.all([
        loadReceivedGifts(),
        loadSocialStats()
      ]);
      
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error claiming gift:', err);
      throw err;
    }
  }, [loadReceivedGifts, loadSocialStats]);

  /**
   * Add a friend
   */
  const addFriend = useCallback(async (friendId) => {
    try {
      setError(null);
      const result = await socialService.addFriend(friendId);
      
      // Reload friends list and suggestions after adding friend
      await Promise.all([
        loadFriends(),
        loadFriendSuggestions()
      ]);
      
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error adding friend:', err);
      throw err;
    }
  }, [loadFriends, loadFriendSuggestions]);

  /**
   * Remove a friend
   */
  const removeFriend = useCallback(async (friendId) => {
    try {
      setError(null);
      const result = await socialService.removeFriend(friendId);
      
      // Reload friends list after removing friend
      await loadFriends();
      
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error removing friend:', err);
      throw err;
    }
  }, [loadFriends]);

  /**
   * Validate gift sending capability
   */
  const validateGiftSending = useCallback(async (receiverId) => {
    try {
      setError(null);
      return await socialService.validateGiftSending(receiverId);
    } catch (err) {
      setError(err.message);
      console.error('Error validating gift sending:', err);
      throw err;
    }
  }, []);

  /**
   * Get friends leaderboard
   */
  const getFriendsLeaderboard = useCallback(async (limit = 50) => {
    try {
      setError(null);
      return await socialService.getFriendsLeaderboard(limit);
    } catch (err) {
      setError(err.message);
      console.error('Error getting friends leaderboard:', err);
      throw err;
    }
  }, []);

  /**
   * Initialize social data
   */
  const initializeSocialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        loadFriends(),
        loadReceivedGifts(),
        loadSocialStats(),
        loadFriendActivity(),
        loadFriendSuggestions()
      ]);
    } catch (err) {
      setError(err.message);
      console.error('Error initializing social data:', err);
    } finally {
      setLoading(false);
    }
  }, [loadFriends, loadReceivedGifts, loadSocialStats, loadFriendActivity, loadFriendSuggestions]);

  /**
   * Refresh all social data
   */
  const refreshSocialData = useCallback(async () => {
    await initializeSocialData();
  }, [initializeSocialData]);

  // Load initial data on mount
  useEffect(() => {
    initializeSocialData();
  }, [initializeSocialData]);

  return {
    // State
    friends,
    receivedGifts,
    socialStats,
    friendActivity,
    friendSuggestions,
    loading,
    error,

    // Actions
    importTelegramFriends,
    sendGift,
    claimGift,
    addFriend,
    removeFriend,
    validateGiftSending,
    getFriendsLeaderboard,
    
    // Data loading
    loadFriends,
    loadReceivedGifts,
    loadSocialStats,
    loadFriendActivity,
    loadFriendSuggestions,
    refreshSocialData,

    // Utilities
    formatDisplayName: socialService.formatDisplayName,
    formatCoins: socialService.formatCoins,
    getActivityStatusColor: socialService.getActivityStatusColor,
    getActivityStatusText: socialService.getActivityStatusText
  };
};