import { SOCKET_EVENTS } from '../shared/constants/events';

/**
 * LeaderboardService - Client-side service for leaderboard operations
 * Handles API calls and WebSocket communication for real-time leaderboard updates
 */
class LeaderboardService {
  constructor() {
    this.socket = null;
    this.eventListeners = new Map();
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds cache timeout
  }

  /**
   * Set Socket.io instance
   * @param {Object} socket - Socket.io client instance
   */
  setSocket(socket) {
    this.socket = socket;
    this.setupSocketListeners();
  }

  /**
   * Setup WebSocket event listeners
   */
  setupSocketListeners() {
    if (!this.socket) return;

    // Listen for leaderboard data responses
    this.socket.on(SOCKET_EVENTS.LEADERBOARD_DATA, (data) => {
      this.handleLeaderboardData(data);
    });

    // Listen for real-time leaderboard updates
    this.socket.on(SOCKET_EVENTS.LEADERBOARD_UPDATE, (data) => {
      this.handleLeaderboardUpdate(data);
    });

    // Listen for rank changes
    this.socket.on(SOCKET_EVENTS.LEADERBOARD_RANK_CHANGE, (data) => {
      this.handleRankChange(data);
    });
  }

  /**
   * Get leaderboard data via HTTP API
   * @param {string} type - Leaderboard type ('all_time', 'weekly', 'daily')
   * @param {number} limit - Number of entries to fetch (1-100)
   * @param {number} offset - Pagination offset
   * @returns {Promise<Object>} Leaderboard data
   */
  async getLeaderboard(type = 'all_time', limit = 100, offset = 0) {
    try {
      // Check cache first
      const cacheKey = `leaderboard:${type}:${limit}:${offset}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await fetch(`/api/leaderboard/${type}?limit=${limit}&offset=${offset}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Cache the result
        this.setCache(cacheKey, result.data);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch leaderboard');
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard data via WebSocket (real-time)
   * @param {string} type - Leaderboard type
   * @param {number} limit - Number of entries to fetch
   * @param {number} offset - Pagination offset
   * @param {boolean} includeUserRank - Include current user's rank
   * @param {number} userId - User ID for rank inclusion
   * @returns {Promise<Object>} Leaderboard data
   */
  async getLeaderboardRealTime(type = 'all_time', limit = 100, offset = 0, includeUserRank = false, userId = null) {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      // Create unique request ID
      const requestId = `leaderboard_${Date.now()}_${Math.random()}`;
      
      // Set up one-time listener for response
      const responseHandler = (data) => {
        if (data.requestId === requestId) {
          this.socket.off(SOCKET_EVENTS.LEADERBOARD_DATA, responseHandler);
          
          if (data.success) {
            resolve(data.data);
          } else {
            reject(new Error(data.error || 'Failed to fetch leaderboard'));
          }
        }
      };

      this.socket.on(SOCKET_EVENTS.LEADERBOARD_DATA, responseHandler);

      // Send request
      this.socket.emit(SOCKET_EVENTS.LEADERBOARD_REQUEST, {
        requestId,
        type,
        limit,
        offset,
        includeUserRank,
        userId
      });

      // Set timeout
      setTimeout(() => {
        this.socket.off(SOCKET_EVENTS.LEADERBOARD_DATA, responseHandler);
        reject(new Error('Request timeout'));
      }, 10000);
    });
  }

  /**
   * Get user's rank with nearby players
   * @param {number} userId - User ID
   * @param {string} type - Leaderboard type
   * @param {number} range - Number of players above and below
   * @returns {Promise<Object>} User rank data
   */
  async getUserRank(userId, type = 'all_time', range = 5) {
    try {
      const response = await fetch(`/api/leaderboard/${type}/user/${userId}?range=${range}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch user rank');
      }
    } catch (error) {
      console.error('Error fetching user rank:', error);
      throw error;
    }
  }

  /**
   * Get user's ranks across all leaderboard types
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User ranks data
   */
  async getUserRanks(userId) {
    try {
      const response = await fetch(`/api/leaderboard/user/${userId}/ranks`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch user ranks');
      }
    } catch (error) {
      console.error('Error fetching user ranks:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard statistics
   * @returns {Promise<Object>} Leaderboard statistics
   */
  async getLeaderboardStats() {
    try {
      const response = await fetch('/api/leaderboard/stats', {
        method: 'GET',
        headers: {
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
        throw new Error(result.error || 'Failed to fetch leaderboard stats');
      }
    } catch (error) {
      console.error('Error fetching leaderboard stats:', error);
      throw error;
    }
  }

  /**
   * Subscribe to leaderboard updates
   * @param {Function} callback - Callback function for updates
   * @returns {Function} Unsubscribe function
   */
  subscribeToUpdates(callback) {
    const eventTypes = [
      SOCKET_EVENTS.LEADERBOARD_UPDATE,
      SOCKET_EVENTS.LEADERBOARD_RANK_CHANGE
    ];

    eventTypes.forEach(eventType => {
      if (!this.eventListeners.has(eventType)) {
        this.eventListeners.set(eventType, new Set());
      }
      this.eventListeners.get(eventType).add(callback);
    });

    // Return unsubscribe function
    return () => {
      eventTypes.forEach(eventType => {
        const listeners = this.eventListeners.get(eventType);
        if (listeners) {
          listeners.delete(callback);
        }
      });
    };
  }

  /**
   * Handle leaderboard data response
   * @param {Object} data - Response data
   */
  handleLeaderboardData(data) {
    // Notify listeners
    const listeners = this.eventListeners.get(SOCKET_EVENTS.LEADERBOARD_DATA);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in leaderboard data callback:', error);
        }
      });
    }
  }

  /**
   * Handle leaderboard update
   * @param {Object} data - Update data
   */
  handleLeaderboardUpdate(data) {
    // Clear relevant cache entries
    this.clearCacheByPattern('leaderboard:');

    // Notify listeners
    const listeners = this.eventListeners.get(SOCKET_EVENTS.LEADERBOARD_UPDATE);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in leaderboard update callback:', error);
        }
      });
    }
  }

  /**
   * Handle rank change
   * @param {Object} data - Rank change data
   */
  handleRankChange(data) {
    // Clear relevant cache entries
    this.clearCacheByPattern('leaderboard:');

    // Notify listeners
    const listeners = this.eventListeners.get(SOCKET_EVENTS.LEADERBOARD_RANK_CHANGE);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in rank change callback:', error);
        }
      });
    }
  }

  /**
   * Cache management methods
   */
  
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clearCache() {
    this.cache.clear();
  }

  clearCacheByPattern(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Format rank for display
   * @param {number} rank - Rank number
   * @returns {string} Formatted rank
   */
  formatRank(rank) {
    if (rank === null || rank === undefined) return 'Unranked';
    
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const lastDigit = rank % 10;
    const lastTwoDigits = rank % 100;
    
    let suffix = 'th';
    if (lastTwoDigits < 11 || lastTwoDigits > 13) {
      suffix = suffixes[lastDigit] || 'th';
    }
    
    return `${rank}${suffix}`;
  }

  /**
   * Format coins for display
   * @param {number} coins - Coin amount
   * @returns {string} Formatted coins
   */
  formatCoins(coins) {
    if (coins < 1000) return coins.toString();
    if (coins < 1000000) return `${(coins / 1000).toFixed(1)}K`;
    if (coins < 1000000000) return `${(coins / 1000000).toFixed(1)}M`;
    return `${(coins / 1000000000).toFixed(1)}B`;
  }

  /**
   * Get rank color based on position
   * @param {number} rank - Rank position
   * @returns {string} CSS color class
   */
  getRankColor(rank) {
    if (rank === 1) return 'rank-gold';
    if (rank === 2) return 'rank-silver';
    if (rank === 3) return 'rank-bronze';
    if (rank <= 10) return 'rank-top-10';
    if (rank <= 100) return 'rank-top-100';
    return 'rank-default';
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.eventListeners.clear();
    this.clearCache();
    
    if (this.socket) {
      this.socket.off(SOCKET_EVENTS.LEADERBOARD_DATA);
      this.socket.off(SOCKET_EVENTS.LEADERBOARD_UPDATE);
      this.socket.off(SOCKET_EVENTS.LEADERBOARD_RANK_CHANGE);
    }
  }
}

// Create singleton instance
const leaderboardService = new LeaderboardService();

export default leaderboardService;