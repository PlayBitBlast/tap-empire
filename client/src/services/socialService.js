import { GAME_CONFIG } from '../shared/constants/gameConfig';

/**
 * Social service for managing friend system and social features
 */
class SocialService {
  constructor() {
    this.baseUrl = `${GAME_CONFIG.API_BASE_URL}/social`;
  }

  /**
   * Get authentication headers
   * @returns {Object} Headers with auth token
   */
  getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Import friends from Telegram
   * @param {Array} telegramFriends - Array of Telegram friend data
   * @returns {Promise<Object>} Import results
   */
  async importTelegramFriends(telegramFriends) {
    try {
      const response = await fetch(`${this.baseUrl}/friends/import`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ telegramFriends })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to import friends');
      }

      return data.data;
    } catch (error) {
      console.error('Error importing Telegram friends:', error);
      throw error;
    }
  }

  /**
   * Get user's friends list
   * @returns {Promise<Array>} Friends list
   */
  async getFriends() {
    try {
      const response = await fetch(`${this.baseUrl}/friends`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get friends');
      }

      return data.data.friends;
    } catch (error) {
      console.error('Error getting friends:', error);
      throw error;
    }
  }

  /**
   * Get friends leaderboard
   * @param {number} limit - Number of friends to return
   * @returns {Promise<Array>} Friends leaderboard
   */
  async getFriendsLeaderboard(limit = 50) {
    try {
      const response = await fetch(`${this.baseUrl}/friends/leaderboard?limit=${limit}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get friends leaderboard');
      }

      return data.data.leaderboard;
    } catch (error) {
      console.error('Error getting friends leaderboard:', error);
      throw error;
    }
  }

  /**
   * Send gift to a friend
   * @param {number} receiverId - Receiver's user ID
   * @param {number} amount - Gift amount
   * @param {string} message - Optional message
   * @returns {Promise<Object>} Gift result
   */
  async sendGift(receiverId, amount, message = null) {
    try {
      const response = await fetch(`${this.baseUrl}/gifts/send`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ receiverId, amount, message })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send gift');
      }

      return data.data;
    } catch (error) {
      console.error('Error sending gift:', error);
      throw error;
    }
  }

  /**
   * Get received gifts
   * @returns {Promise<Array>} Received gifts
   */
  async getReceivedGifts() {
    try {
      const response = await fetch(`${this.baseUrl}/gifts/received`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get received gifts');
      }

      return data.data.gifts;
    } catch (error) {
      console.error('Error getting received gifts:', error);
      throw error;
    }
  }

  /**
   * Claim a gift
   * @param {number} giftId - Gift ID
   * @returns {Promise<Object>} Claimed gift result
   */
  async claimGift(giftId) {
    try {
      const response = await fetch(`${this.baseUrl}/gifts/${giftId}/claim`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim gift');
      }

      return data.data;
    } catch (error) {
      console.error('Error claiming gift:', error);
      throw error;
    }
  }

  /**
   * Validate if user can send gift to receiver
   * @param {number} receiverId - Receiver's user ID
   * @returns {Promise<Object>} Validation result
   */
  async validateGiftSending(receiverId) {
    try {
      const response = await fetch(`${this.baseUrl}/gifts/validate/${receiverId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to validate gift sending');
      }

      return data.data;
    } catch (error) {
      console.error('Error validating gift sending:', error);
      throw error;
    }
  }

  /**
   * Get social statistics
   * @returns {Promise<Object>} Social statistics
   */
  async getSocialStats() {
    try {
      const response = await fetch(`${this.baseUrl}/stats`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get social stats');
      }

      return data.data;
    } catch (error) {
      console.error('Error getting social stats:', error);
      throw error;
    }
  }

  /**
   * Get friend activity feed
   * @param {number} limit - Number of activities to return
   * @returns {Promise<Array>} Friend activities
   */
  async getFriendActivity(limit = 20) {
    try {
      const response = await fetch(`${this.baseUrl}/friends/activity?limit=${limit}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get friend activity');
      }

      return data.data.activities;
    } catch (error) {
      console.error('Error getting friend activity:', error);
      throw error;
    }
  }

  /**
   * Get friend suggestions
   * @param {number} limit - Number of suggestions to return
   * @returns {Promise<Array>} Friend suggestions
   */
  async getFriendSuggestions(limit = 10) {
    try {
      const response = await fetch(`${this.baseUrl}/friends/suggestions?limit=${limit}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get friend suggestions');
      }

      return data.data.suggestions;
    } catch (error) {
      console.error('Error getting friend suggestions:', error);
      throw error;
    }
  }

  /**
   * Add a friend
   * @param {number} friendId - Friend's user ID
   * @returns {Promise<Object>} Result
   */
  async addFriend(friendId) {
    try {
      const response = await fetch(`${this.baseUrl}/friends/add`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ friendId })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add friend');
      }

      return data.data;
    } catch (error) {
      console.error('Error adding friend:', error);
      throw error;
    }
  }

  /**
   * Remove a friend
   * @param {number} friendId - Friend's user ID
   * @returns {Promise<Object>} Result
   */
  async removeFriend(friendId) {
    try {
      const response = await fetch(`${this.baseUrl}/friends/${friendId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove friend');
      }

      return data.data;
    } catch (error) {
      console.error('Error removing friend:', error);
      throw error;
    }
  }

  /**
   * Format display name for a user
   * @param {Object} user - User object
   * @returns {string} Display name
   */
  formatDisplayName(user) {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    } else if (user.firstName) {
      return user.firstName;
    } else if (user.username) {
      return `@${user.username}`;
    } else {
      return 'Anonymous User';
    }
  }

  /**
   * Format coin amount for display
   * @param {number} amount - Coin amount
   * @returns {string} Formatted amount
   */
  formatCoins(amount) {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    } else {
      return amount.toString();
    }
  }

  /**
   * Get activity status color
   * @param {string} status - Activity status
   * @returns {string} CSS color class
   */
  getActivityStatusColor(status) {
    switch (status) {
      case 'online':
        return 'text-green-500';
      case 'recent':
        return 'text-yellow-500';
      case 'inactive':
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  }

  /**
   * Get activity status text
   * @param {string} status - Activity status
   * @returns {string} Status text
   */
  getActivityStatusText(status) {
    switch (status) {
      case 'online':
        return 'Online';
      case 'recent':
        return 'Recently active';
      case 'inactive':
        return 'Inactive';
      default:
        return 'Unknown';
    }
  }
}

export default new SocialService();