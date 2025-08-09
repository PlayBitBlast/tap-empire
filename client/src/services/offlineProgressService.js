// Client-side offline progress service
// Handles offline earnings collection and UI interactions

import { GAME_CONFIG } from '../shared/constants/gameConfig';

/**
 * Service for managing offline progress on the client side
 */
class OfflineProgressService {
  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3005/api';
  }

  /**
   * Get offline progress preview without collecting
   * @returns {Promise<Object>} Offline progress preview
   */
  async getOfflineProgressPreview() {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${this.baseUrl}/offline-progress/preview`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get offline progress preview');
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('Error getting offline progress preview:', error);
      throw error;
    }
  }

  /**
   * Collect offline progress earnings
   * @param {Object} clientData - Client-calculated offline data for validation
   * @returns {Promise<Object>} Collection result
   */
  async collectOfflineProgress(clientData = {}) {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${this.baseUrl}/offline-progress/collect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(clientData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to collect offline progress');
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('Error collecting offline progress:', error);
      throw error;
    }
  }

  /**
   * Calculate offline progress locally (for preview and validation)
   * @param {Object} gameState - Current game state
   * @param {Date} lastOfflineCalculation - Last offline calculation timestamp
   * @returns {Object} Local offline progress calculation
   */
  calculateOfflineProgressLocally(gameState, lastOfflineCalculation) {
    const now = new Date();
    const lastCalculation = new Date(lastOfflineCalculation);
    const offlineTimeMs = now.getTime() - lastCalculation.getTime();
    const offlineHours = offlineTimeMs / (1000 * 60 * 60);

    // Only calculate if offline for more than 1 minute
    if (offlineHours < (1 / 60)) {
      return {
        hasOfflineProgress: false,
        reason: 'Not enough offline time',
        offlineHours: 0,
        earnings: 0
      };
    }

    // Cap offline hours to maximum allowed
    const cappedHours = Math.min(offlineHours, GAME_CONFIG.OFFLINE_EARNINGS_CAP_HOURS);

    // Calculate earnings based on auto-clicker rate
    const autoClickerRate = gameState.autoClickerRate || 0;
    
    if (autoClickerRate <= 0) {
      return {
        hasOfflineProgress: false,
        reason: 'No auto-clickers',
        offlineHours: cappedHours,
        earnings: 0
      };
    }

    // Calculate offline earnings
    const offlineEarnings = Math.floor(autoClickerRate * cappedHours * 3600);

    if (offlineEarnings <= 0) {
      return {
        hasOfflineProgress: false,
        reason: 'No earnings calculated',
        offlineHours: cappedHours,
        earnings: 0
      };
    }

    return {
      hasOfflineProgress: true,
      earnings: offlineEarnings,
      offlineHours: cappedHours,
      actualOfflineHours: offlineHours,
      autoClickerRate,
      breakdown: this.createEarningsBreakdown(autoClickerRate, cappedHours, offlineEarnings)
    };
  }

  /**
   * Create detailed earnings breakdown for UI display
   * @param {number} autoClickerRate - Auto-clicker rate per second
   * @param {number} offlineHours - Hours spent offline
   * @param {number} totalEarnings - Total earnings calculated
   * @returns {Object} Earnings breakdown
   */
  createEarningsBreakdown(autoClickerRate, offlineHours, totalEarnings) {
    const offlineSeconds = Math.floor(offlineHours * 3600);
    const earningsPerSecond = autoClickerRate;
    const earningsPerMinute = earningsPerSecond * 60;
    const earningsPerHour = earningsPerMinute * 60;

    return {
      autoClickerRate,
      offlineHours: Math.round(offlineHours * 100) / 100, // Round to 2 decimal places
      offlineSeconds,
      earningsPerSecond,
      earningsPerMinute,
      earningsPerHour,
      totalEarnings,
      cappedAt: offlineHours >= GAME_CONFIG.OFFLINE_EARNINGS_CAP_HOURS,
      maxOfflineHours: GAME_CONFIG.OFFLINE_EARNINGS_CAP_HOURS
    };
  }

  /**
   * Format time duration for display
   * @param {number} hours - Hours to format
   * @returns {string} Formatted time string
   */
  formatOfflineTime(hours) {
    if (hours < 1) {
      const minutes = Math.floor(hours * 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else if (hours < 24) {
      const wholeHours = Math.floor(hours);
      const minutes = Math.floor((hours - wholeHours) * 60);
      
      if (minutes === 0) {
        return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''}`;
      } else {
        return `${wholeHours}h ${minutes}m`;
      }
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.floor(hours % 24);
      
      if (remainingHours === 0) {
        return `${days} day${days !== 1 ? 's' : ''}`;
      } else {
        return `${days}d ${remainingHours}h`;
      }
    }
  }

  /**
   * Format coins for display with appropriate suffixes
   * @param {number} coins - Number of coins
   * @returns {string} Formatted coin string
   */
  formatCoins(coins) {
    if (coins < 1000) {
      return coins.toString();
    } else if (coins < 1000000) {
      return `${(coins / 1000).toFixed(1)}K`;
    } else if (coins < 1000000000) {
      return `${(coins / 1000000).toFixed(1)}M`;
    } else {
      return `${(coins / 1000000000).toFixed(1)}B`;
    }
  }

  /**
   * Check if offline progress should be shown
   * @param {Object} gameState - Current game state
   * @param {Date} lastOfflineCalculation - Last offline calculation timestamp
   * @returns {boolean} Whether to show offline progress
   */
  shouldShowOfflineProgress(gameState, lastOfflineCalculation) {
    const localCalculation = this.calculateOfflineProgressLocally(gameState, lastOfflineCalculation);
    return localCalculation.hasOfflineProgress && localCalculation.earnings > 0;
  }

  /**
   * Get offline progress display data
   * @param {Object} offlineResult - Offline progress result from server
   * @returns {Object} Display data for UI
   */
  getOfflineProgressDisplayData(offlineResult) {
    if (!offlineResult.hasOfflineProgress) {
      return {
        shouldShow: false,
        reason: offlineResult.reason
      };
    }

    const { earnings, offlineHours, breakdown } = offlineResult;

    return {
      shouldShow: true,
      title: 'Welcome Back!',
      subtitle: `You were away for ${this.formatOfflineTime(offlineHours)}`,
      earnings: earnings,
      formattedEarnings: this.formatCoins(earnings),
      breakdown: {
        timeAway: this.formatOfflineTime(offlineHours),
        autoClickerRate: breakdown.autoClickerRate,
        earningsPerSecond: breakdown.earningsPerSecond,
        earningsPerMinute: breakdown.earningsPerMinute,
        earningsPerHour: breakdown.earningsPerHour,
        cappedAt: breakdown.cappedAt,
        maxOfflineHours: breakdown.maxOfflineHours
      },
      cappedMessage: breakdown.cappedAt 
        ? `Earnings capped at ${breakdown.maxOfflineHours} hours`
        : null
    };
  }
}

export default OfflineProgressService;