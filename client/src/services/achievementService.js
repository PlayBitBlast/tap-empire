/**
 * Achievement service for client-side achievement management
 */
class AchievementService {
  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3005';
    this.achievements = new Map();
    this.listeners = new Set();
  }

  /**
   * Get user's achievements with progress
   * @returns {Promise<Object>} Achievements grouped by category
   */
  async getUserAchievements() {
    try {
      const response = await fetch(`${this.baseUrl}/api/achievements`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Cache achievements
        this.achievements.clear();
        Object.values(result.data).forEach(category => {
          category.achievements.forEach(achievement => {
            this.achievements.set(achievement.id, achievement);
          });
        });
        
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to get achievements');
      }
    } catch (error) {
      console.error('Error getting achievements:', error);
      throw error;
    }
  }

  /**
   * Get user's achievement statistics
   * @returns {Promise<Object>} Achievement statistics
   */
  async getUserAchievementStats() {
    try {
      const response = await fetch(`${this.baseUrl}/api/achievements/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to get achievement stats');
      }
    } catch (error) {
      console.error('Error getting achievement stats:', error);
      throw error;
    }
  }

  /**
   * Get achievement leaderboard
   * @param {number} limit - Number of users to fetch
   * @returns {Promise<Array>} Achievement leaderboard
   */
  async getAchievementLeaderboard(limit = 100) {
    try {
      const response = await fetch(`${this.baseUrl}/api/achievements/leaderboard?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to get leaderboard');
      }
    } catch (error) {
      console.error('Error getting achievement leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get recent achievement unlocks
   * @param {number} limit - Number of recent unlocks to fetch
   * @returns {Promise<Array>} Recent achievement unlocks
   */
  async getRecentUnlocks(limit = 50) {
    try {
      const response = await fetch(`${this.baseUrl}/api/achievements/recent?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to get recent unlocks');
      }
    } catch (error) {
      console.error('Error getting recent unlocks:', error);
      throw error;
    }
  }

  /**
   * Share achievement to Telegram
   * @param {number} achievementId - Achievement ID to share
   * @returns {Promise<Object>} Share data
   */
  async shareAchievement(achievementId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/achievements/${achievementId}/share`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Use Telegram Web App API to share
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.openTelegramLink(
            `https://t.me/share/url?url=${encodeURIComponent(result.data.url)}&text=${encodeURIComponent(result.data.text)}`
          );
        }
        
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to share achievement');
      }
    } catch (error) {
      console.error('Error sharing achievement:', error);
      throw error;
    }
  }

  /**
   * Track milestone for achievement system
   * @param {string} milestoneType - Type of milestone
   * @param {number} value - Milestone value
   * @returns {Promise<Array>} Newly unlocked achievements
   */
  async trackMilestone(milestoneType, value = 1) {
    try {
      const response = await fetch(`${this.baseUrl}/api/achievements/milestone`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          milestoneType,
          value
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Notify listeners about new achievements
        if (result.data.newAchievements.length > 0) {
          this.notifyAchievementUnlocked(result.data.newAchievements);
        }
        
        return result.data.newAchievements;
      } else {
        throw new Error(result.error || 'Failed to track milestone');
      }
    } catch (error) {
      console.error('Error tracking milestone:', error);
      // Don't throw error for milestone tracking to avoid disrupting gameplay
      return [];
    }
  }

  /**
   * Check for new achievements manually
   * @param {string} triggerType - Optional trigger type filter
   * @returns {Promise<Array>} Newly unlocked achievements
   */
  async checkAchievements(triggerType = null) {
    try {
      const response = await fetch(`${this.baseUrl}/api/achievements/check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          triggerType
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Notify listeners about new achievements
        if (result.data.newAchievements.length > 0) {
          this.notifyAchievementUnlocked(result.data.newAchievements);
        }
        
        return result.data.newAchievements;
      } else {
        throw new Error(result.error || 'Failed to check achievements');
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }

  /**
   * Add listener for achievement events
   * @param {Function} listener - Event listener function
   */
  addAchievementListener(listener) {
    this.listeners.add(listener);
  }

  /**
   * Remove achievement event listener
   * @param {Function} listener - Event listener function
   */
  removeAchievementListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Notify listeners about unlocked achievements
   * @param {Array} achievements - Newly unlocked achievements
   */
  notifyAchievementUnlocked(achievements) {
    this.listeners.forEach(listener => {
      try {
        listener('achievement_unlocked', achievements);
      } catch (error) {
        console.error('Error in achievement listener:', error);
      }
    });
  }

  /**
   * Get cached achievement by ID
   * @param {number} achievementId - Achievement ID
   * @returns {Object|null} Achievement object or null
   */
  getCachedAchievement(achievementId) {
    return this.achievements.get(achievementId) || null;
  }

  /**
   * Get achievement progress for display
   * @param {Object} achievement - Achievement object
   * @returns {Object} Progress display data
   */
  getProgressDisplay(achievement) {
    const progress = achievement.progress || 0;
    const required = achievement.requirement_value || 1;
    const percentage = achievement.progressPercentage || 0;
    
    return {
      current: this.formatNumber(progress),
      required: this.formatNumber(required),
      percentage: Math.min(100, percentage),
      isComplete: achievement.isUnlocked || false
    };
  }

  /**
   * Format number for display
   * @param {number} num - Number to format
   * @returns {string} Formatted number
   */
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  /**
   * Get achievement category icon
   * @param {string} category - Achievement category
   * @returns {string} Category icon
   */
  getCategoryIcon(category) {
    const icons = {
      tapping: '👆',
      earnings: '💰',
      upgrades: '⚡',
      golden_taps: '✨',
      social: '👥',
      gifts: '🎁',
      streaks: '🔥',
      prestige: '👑',
      speed: '⚡',
      time: '⏰',
      milestones: '🏆'
    };
    
    return icons[category] || '🏆';
  }

  /**
   * Get achievement rarity color
   * @param {number} unlockPercentage - Percentage of users who unlocked this
   * @returns {string} CSS color class
   */
  getRarityColor(unlockPercentage) {
    if (unlockPercentage >= 50) return 'common'; // Green
    if (unlockPercentage >= 20) return 'uncommon'; // Blue
    if (unlockPercentage >= 5) return 'rare'; // Purple
    if (unlockPercentage >= 1) return 'epic'; // Orange
    return 'legendary'; // Gold
  }
}

export default AchievementService;