// Prestige service for client-side prestige system management

import { GAME_CONFIG } from '../shared/constants/gameConfig';
import { calculatePrestigePoints } from '../shared/utils/calculations';

/**
 * Client-side prestige service for managing prestige system
 */
class PrestigeService {
  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3005';
  }

  /**
   * Get complete prestige information
   * @returns {Promise<Object>} Prestige information
   */
  async getPrestigeInfo() {
    try {
      const response = await fetch(`${this.baseUrl}/api/prestige/info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error getting prestige info:', error);
      throw error;
    }
  }

  /**
   * Check if user can prestige
   * @returns {Promise<Object>} Prestige eligibility
   */
  async checkPrestigeEligibility() {
    try {
      const response = await fetch(`${this.baseUrl}/api/prestige/eligibility`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error checking prestige eligibility:', error);
      throw error;
    }
  }

  /**
   * Perform prestige reset
   * @returns {Promise<Object>} Prestige result
   */
  async performPrestige() {
    try {
      const response = await fetch(`${this.baseUrl}/api/prestige/perform`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error performing prestige:', error);
      throw error;
    }
  }

  /**
   * Get available prestige upgrades
   * @returns {Promise<Object>} Prestige upgrades
   */
  async getPrestigeUpgrades() {
    try {
      const response = await fetch(`${this.baseUrl}/api/prestige/upgrades`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error getting prestige upgrades:', error);
      throw error;
    }
  }

  /**
   * Purchase prestige upgrade
   * @param {string} upgradeType - Type of upgrade to purchase
   * @returns {Promise<Object>} Purchase result
   */
  async purchasePrestigeUpgrade(upgradeType) {
    try {
      const response = await fetch(`${this.baseUrl}/api/prestige/upgrades/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ upgradeType })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error purchasing prestige upgrade:', error);
      throw error;
    }
  }

  /**
   * Get prestige statistics
   * @returns {Promise<Object>} Prestige stats
   */
  async getPrestigeStats() {
    try {
      const response = await fetch(`${this.baseUrl}/api/prestige/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error getting prestige stats:', error);
      throw error;
    }
  }

  /**
   * Get prestige leaderboard
   * @param {number} limit - Number of users to fetch
   * @returns {Promise<Object>} Prestige leaderboard
   */
  async getPrestigeLeaderboard(limit = 100) {
    try {
      const response = await fetch(`${this.baseUrl}/api/prestige/leaderboard?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error getting prestige leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get prestige progress
   * @returns {Promise<Object>} Prestige progress
   */
  async getPrestigeProgress() {
    try {
      const response = await fetch(`${this.baseUrl}/api/prestige/progress`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error getting prestige progress:', error);
      throw error;
    }
  }

  /**
   * Calculate local prestige points from lifetime coins
   * @param {number} lifetimeCoins - Total lifetime coins
   * @returns {number} Prestige points
   */
  calculatePrestigePoints(lifetimeCoins) {
    return calculatePrestigePoints(lifetimeCoins);
  }

  /**
   * Check if user can prestige locally (client-side validation)
   * @param {number} totalCoinsEarned - Total coins earned
   * @returns {boolean} Whether user can prestige
   */
  canPrestigeLocally(totalCoinsEarned) {
    return totalCoinsEarned >= GAME_CONFIG.PRESTIGE_UNLOCK_COINS;
  }

  /**
   * Format prestige points for display
   * @param {number} points - Prestige points
   * @returns {string} Formatted string
   */
  formatPrestigePoints(points) {
    if (points >= 1000000) {
      return `${(points / 1000000).toFixed(1)}M`;
    } else if (points >= 1000) {
      return `${(points / 1000).toFixed(1)}K`;
    }
    return points.toString();
  }

  /**
   * Format coins for display
   * @param {number} coins - Coin amount
   * @returns {string} Formatted string
   */
  formatCoins(coins) {
    if (coins >= 1000000000) {
      return `${(coins / 1000000000).toFixed(1)}B`;
    } else if (coins >= 1000000) {
      return `${(coins / 1000000).toFixed(1)}M`;
    } else if (coins >= 1000) {
      return `${(coins / 1000).toFixed(1)}K`;
    }
    return coins.toString();
  }

  /**
   * Get prestige level display name
   * @param {number} level - Prestige level
   * @returns {string} Display name
   */
  getPrestigeLevelName(level) {
    const names = [
      'Novice', 'Apprentice', 'Journeyman', 'Expert', 'Master',
      'Grandmaster', 'Legend', 'Mythic', 'Transcendent', 'Ascended'
    ];
    
    if (level === 0) return 'None';
    if (level <= names.length) return names[level - 1];
    return `Prestige ${level}`;
  }

  /**
   * Calculate prestige progress percentage
   * @param {number} currentCoins - Current total coins
   * @param {number} requiredCoins - Required coins for prestige
   * @returns {number} Progress percentage (0-100)
   */
  calculatePrestigeProgress(currentCoins, requiredCoins) {
    return Math.min((currentCoins / requiredCoins) * 100, 100);
  }

  /**
   * Get prestige benefits description
   * @param {number} prestigeLevel - Current prestige level
   * @returns {string} Benefits description
   */
  getPrestigeBenefits(prestigeLevel) {
    const multiplier = Math.pow(1.1, prestigeLevel + 1);
    const percentage = ((multiplier - 1) * 100).toFixed(1);
    
    return `+${percentage}% to all earnings`;
  }
}

export default PrestigeService;