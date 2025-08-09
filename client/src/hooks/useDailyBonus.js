import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

/**
 * Custom hook for managing daily bonus and streak system
 */
export const useDailyBonus = () => {
  const { user, token } = useAuth();
  const [bonusStatus, setBonusStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [claimResult, setClaimResult] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  /**
   * Fetch daily bonus status from server
   */
  const fetchBonusStatus = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/daily-bonus/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setBonusStatus(data.data);
      } else {
        setError(data.error || 'Failed to fetch bonus status');
      }
    } catch (err) {
      console.error('Error fetching bonus status:', err);
      setError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [token, API_BASE_URL]);

  /**
   * Claim daily bonus
   */
  const claimDailyBonus = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);
    setClaimResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/daily-bonus/claim`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setClaimResult(data.data);
        // Refresh bonus status after successful claim
        await fetchBonusStatus();
        return data.data;
      } else {
        setError(data.error || 'Failed to claim bonus');
        return null;
      }
    } catch (err) {
      console.error('Error claiming bonus:', err);
      setError('Network error occurred');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [token, API_BASE_URL, fetchBonusStatus]);

  /**
   * Get daily bonus history
   */
  const getBonusHistory = useCallback(async (limit = 30) => {
    if (!token) return [];

    try {
      const response = await fetch(`${API_BASE_URL}/api/daily-bonus/history?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        return data.data.history;
      } else {
        console.error('Failed to fetch bonus history:', data.error);
        return [];
      }
    } catch (err) {
      console.error('Error fetching bonus history:', err);
      return [];
    }
  }, [token, API_BASE_URL]);

  /**
   * Clear claim result (for UI state management)
   */
  const clearClaimResult = useCallback(() => {
    setClaimResult(null);
  }, []);

  /**
   * Clear error (for UI state management)
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch bonus status when user or token changes
  useEffect(() => {
    if (user && token) {
      fetchBonusStatus();
    }
  }, [user, token, fetchBonusStatus]);

  // Helper functions for UI
  const canClaimBonus = bonusStatus?.eligibility?.eligible || false;
  const currentStreak = bonusStatus?.currentStreak || 0;
  const nextBonusAmount = bonusStatus?.nextBonusAmount || 0;
  const hoursUntilEligible = bonusStatus?.eligibility?.hoursUntilEligible || 0;
  const longestStreak = bonusStatus?.longestStreak || 0;
  const totalBonusesClaimed = bonusStatus?.totalBonusesClaimed || 0;
  const totalBonusCoins = bonusStatus?.totalBonusCoins || 0;

  return {
    // State
    bonusStatus,
    isLoading,
    error,
    claimResult,

    // Actions
    fetchBonusStatus,
    claimDailyBonus,
    getBonusHistory,
    clearClaimResult,
    clearError,

    // Computed values
    canClaimBonus,
    currentStreak,
    nextBonusAmount,
    hoursUntilEligible,
    longestStreak,
    totalBonusesClaimed,
    totalBonusCoins
  };
};