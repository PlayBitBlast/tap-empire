const { redisManager } = require('../config/redis');
const UserRepository = require('../repositories/UserRepository');
const { SOCKET_EVENTS } = require('../../../shared/constants/events');

/**
 * LeaderboardService - Manages real-time leaderboards using Redis sorted sets
 * Handles daily, weekly, and all-time rankings with real-time updates
 */
class LeaderboardService {
  constructor(io = null) {
    this.redis = redisManager;
    this.userRepository = new UserRepository();
    this.io = io; // Socket.io instance for real-time broadcasts
    
    // Leaderboard keys
    this.LEADERBOARD_KEYS = {
      ALL_TIME: 'leaderboard:all_time',
      WEEKLY: 'leaderboard:weekly',
      DAILY: 'leaderboard:daily'
    };
    
    // Cache keys for leaderboard data
    this.CACHE_KEYS = {
      ALL_TIME: 'cache:leaderboard:all_time',
      WEEKLY: 'cache:leaderboard:weekly',
      DAILY: 'cache:leaderboard:daily',
      USER_RANK: (userId, type) => `cache:user_rank:${type}:${userId}`
    };
    
    // Cache TTL in seconds
    this.CACHE_TTL = {
      LEADERBOARD: 60, // 1 minute for leaderboard data
      USER_RANK: 30    // 30 seconds for user rank data
    };
  }

  /**
   * Set Socket.io instance for real-time broadcasts
   * @param {Object} io - Socket.io instance
   */
  setSocketIO(io) {
    this.io = io;
  }

  /**
   * Update player rank in all leaderboards
   * @param {number} userId - User ID
   * @param {number} totalCoins - Total coins earned
   * @returns {Promise<Object>} Updated rank information
   */
  async updatePlayerRank(userId, totalCoins) {
    try {
      const userIdStr = userId.toString();
      
      // Update all leaderboard types
      await Promise.all([
        this.redis.updateLeaderboardScore(this.LEADERBOARD_KEYS.ALL_TIME, totalCoins, userIdStr),
        this.redis.updateLeaderboardScore(this.LEADERBOARD_KEYS.WEEKLY, totalCoins, userIdStr),
        this.redis.updateLeaderboardScore(this.LEADERBOARD_KEYS.DAILY, totalCoins, userIdStr)
      ]);

      // Get new ranks
      const [allTimeRank, weeklyRank, dailyRank] = await Promise.all([
        this.redis.getPlayerRank(this.LEADERBOARD_KEYS.ALL_TIME, userIdStr),
        this.redis.getPlayerRank(this.LEADERBOARD_KEYS.WEEKLY, userIdStr),
        this.redis.getPlayerRank(this.LEADERBOARD_KEYS.DAILY, userIdStr)
      ]);

      const rankInfo = {
        userId,
        totalCoins,
        ranks: {
          allTime: allTimeRank !== null ? allTimeRank + 1 : null, // Convert to 1-based ranking
          weekly: weeklyRank !== null ? weeklyRank + 1 : null,
          daily: dailyRank !== null ? dailyRank + 1 : null
        },
        timestamp: Date.now()
      };

      // Clear cached user rank data
      await this.clearUserRankCache(userId);
      
      // Clear cached leaderboard data
      await this.clearLeaderboardCache();

      // Broadcast rank change to connected clients
      if (this.io) {
        this.broadcastRankUpdate(rankInfo);
      }

      return rankInfo;
    } catch (error) {
      console.error('Error updating player rank:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard data with user information
   * @param {string} type - Leaderboard type ('all_time', 'weekly', 'daily')
   * @param {number} limit - Number of entries to return (max 100)
   * @param {number} offset - Pagination offset
   * @returns {Promise<Object>} Leaderboard data
   */
  async getLeaderboard(type = 'all_time', limit = 100, offset = 0) {
    try {
      // Validate parameters
      if (!['all_time', 'weekly', 'daily'].includes(type)) {
        throw new Error('Invalid leaderboard type');
      }
      
      limit = Math.min(Math.max(1, limit), 100); // Clamp between 1 and 100
      offset = Math.max(0, offset);

      const leaderboardKey = this.LEADERBOARD_KEYS[type.toUpperCase()];
      const cacheKey = `${this.CACHE_KEYS[type.toUpperCase()]}:${limit}:${offset}`;

      // Try to get from cache first
      const cachedData = await this.redis.getCache(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Get leaderboard entries from Redis
      const entries = await this.redis.getLeaderboardRange(
        leaderboardKey,
        offset,
        offset + limit - 1,
        true
      );

      // Get total count
      const totalCount = await this.redis.getLeaderboardSize(leaderboardKey);

      // Enrich with user data
      const leaderboard = [];
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const userId = parseInt(entry.value);
        const score = entry.score;
        
        try {
          const user = await this.userRepository.findById(userId);
          if (user) {
            leaderboard.push({
              rank: offset + i + 1,
              userId: user.id,
              username: user.username,
              firstName: user.first_name,
              lastName: user.last_name,
              totalCoins: score,
              lastActive: user.updated_at
            });
          }
        } catch (userError) {
          console.error(`Error fetching user ${userId} for leaderboard:`, userError);
          // Skip this entry if user data can't be fetched
          continue;
        }
      }

      const result = {
        type,
        entries: leaderboard,
        pagination: {
          limit,
          offset,
          total: totalCount,
          hasMore: offset + limit < totalCount
        },
        lastUpdated: Date.now()
      };

      // Cache the result
      await this.redis.setCache(cacheKey, result, this.CACHE_TTL.LEADERBOARD);

      return result;
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get user's rank and nearby players
   * @param {number} userId - User ID
   * @param {string} type - Leaderboard type
   * @param {number} range - Number of players above and below (default: 5)
   * @returns {Promise<Object>} User rank and nearby players
   */
  async getUserRankWithContext(userId, type = 'all_time', range = 5) {
    try {
      const userIdStr = userId.toString();
      const leaderboardKey = this.LEADERBOARD_KEYS[type.toUpperCase()];
      const cacheKey = this.CACHE_KEYS.USER_RANK(userId, type);

      // Try cache first
      const cachedData = await this.redis.getCache(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Get user's rank and score
      const [userRank, userScore] = await Promise.all([
        this.redis.getPlayerRank(leaderboardKey, userIdStr),
        this.redis.getPlayerScore(leaderboardKey, userIdStr)
      ]);

      if (userRank === null) {
        return {
          userRank: null,
          userScore: null,
          nearbyPlayers: [],
          totalPlayers: await this.redis.getLeaderboardSize(leaderboardKey)
        };
      }

      // Get players around user's rank
      const nearbyEntries = await this.redis.getPlayersAroundRank(
        leaderboardKey,
        userIdStr,
        range
      );

      // Enrich with user data
      const nearbyPlayers = [];
      for (let i = 0; i < nearbyEntries.length; i++) {
        const entry = nearbyEntries[i];
        const playerId = parseInt(entry.value);
        const score = entry.score;
        
        try {
          const user = await this.userRepository.findById(playerId);
          if (user) {
            const playerRank = await this.redis.getPlayerRank(leaderboardKey, entry.value);
            nearbyPlayers.push({
              rank: playerRank !== null ? playerRank + 1 : null,
              userId: user.id,
              username: user.username,
              firstName: user.first_name,
              totalCoins: score,
              isCurrentUser: user.id === userId
            });
          }
        } catch (userError) {
          console.error(`Error fetching user ${playerId} for nearby players:`, userError);
          continue;
        }
      }

      const result = {
        userRank: userRank + 1, // Convert to 1-based ranking
        userScore,
        nearbyPlayers: nearbyPlayers.sort((a, b) => a.rank - b.rank),
        totalPlayers: await this.redis.getLeaderboardSize(leaderboardKey),
        type,
        lastUpdated: Date.now()
      };

      // Cache the result
      await this.redis.setCache(cacheKey, result, this.CACHE_TTL.USER_RANK);

      return result;
    } catch (error) {
      console.error('Error getting user rank with context:', error);
      throw error;
    }
  }

  /**
   * Get user's ranks across all leaderboard types
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User ranks in all leaderboards
   */
  async getUserRanks(userId) {
    try {
      const userIdStr = userId.toString();
      
      const [allTimeRank, weeklyRank, dailyRank] = await Promise.all([
        this.redis.getPlayerRank(this.LEADERBOARD_KEYS.ALL_TIME, userIdStr),
        this.redis.getPlayerRank(this.LEADERBOARD_KEYS.WEEKLY, userIdStr),
        this.redis.getPlayerRank(this.LEADERBOARD_KEYS.DAILY, userIdStr)
      ]);

      const [allTimeScore, weeklyScore, dailyScore] = await Promise.all([
        this.redis.getPlayerScore(this.LEADERBOARD_KEYS.ALL_TIME, userIdStr),
        this.redis.getPlayerScore(this.LEADERBOARD_KEYS.WEEKLY, userIdStr),
        this.redis.getPlayerScore(this.LEADERBOARD_KEYS.DAILY, userIdStr)
      ]);

      return {
        userId,
        ranks: {
          allTime: {
            rank: allTimeRank !== null ? allTimeRank + 1 : null,
            score: allTimeScore || 0
          },
          weekly: {
            rank: weeklyRank !== null ? weeklyRank + 1 : null,
            score: weeklyScore || 0
          },
          daily: {
            rank: dailyRank !== null ? dailyRank + 1 : null,
            score: dailyScore || 0
          }
        },
        lastUpdated: Date.now()
      };
    } catch (error) {
      console.error('Error getting user ranks:', error);
      throw error;
    }
  }

  /**
   * Reset daily leaderboard (called by cron job)
   * @returns {Promise<void>}
   */
  async resetDailyLeaderboard() {
    try {
      await this.redis.executeCommand(
        this.redis.client.del.bind(this.redis.client),
        this.LEADERBOARD_KEYS.DAILY
      );
      
      // Clear daily leaderboard cache
      await this.redis.deleteCache(this.CACHE_KEYS.DAILY);
      
      console.log('Daily leaderboard reset successfully');
      
      // Broadcast reset notification
      if (this.io) {
        this.io.emit(SOCKET_EVENTS.LEADERBOARD_UPDATE, {
          type: 'daily_reset',
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error resetting daily leaderboard:', error);
      throw error;
    }
  }

  /**
   * Reset weekly leaderboard (called by cron job)
   * @returns {Promise<void>}
   */
  async resetWeeklyLeaderboard() {
    try {
      await this.redis.executeCommand(
        this.redis.client.del.bind(this.redis.client),
        this.LEADERBOARD_KEYS.WEEKLY
      );
      
      // Clear weekly leaderboard cache
      await this.redis.deleteCache(this.CACHE_KEYS.WEEKLY);
      
      console.log('Weekly leaderboard reset successfully');
      
      // Broadcast reset notification
      if (this.io) {
        this.io.emit(SOCKET_EVENTS.LEADERBOARD_UPDATE, {
          type: 'weekly_reset',
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error resetting weekly leaderboard:', error);
      throw error;
    }
  }

  /**
   * Remove user from all leaderboards
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  async removeUser(userId) {
    try {
      const userIdStr = userId.toString();
      
      await Promise.all([
        this.redis.removeFromLeaderboard(this.LEADERBOARD_KEYS.ALL_TIME, userIdStr),
        this.redis.removeFromLeaderboard(this.LEADERBOARD_KEYS.WEEKLY, userIdStr),
        this.redis.removeFromLeaderboard(this.LEADERBOARD_KEYS.DAILY, userIdStr)
      ]);

      // Clear user's cached rank data
      await this.clearUserRankCache(userId);
      
      console.log(`User ${userId} removed from all leaderboards`);
    } catch (error) {
      console.error('Error removing user from leaderboards:', error);
      throw error;
    }
  }

  /**
   * Broadcast rank update to connected clients
   * @param {Object} rankInfo - Rank information
   */
  broadcastRankUpdate(rankInfo) {
    if (!this.io) return;

    // Broadcast to all connected clients
    this.io.emit(SOCKET_EVENTS.LEADERBOARD_RANK_CHANGE, rankInfo);

    // Send personalized update to the specific user if they're connected
    this.io.to(`user:${rankInfo.userId}`).emit(SOCKET_EVENTS.LEADERBOARD_UPDATE, {
      type: 'personal_rank_update',
      data: rankInfo
    });
  }

  /**
   * Clear user rank cache
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  async clearUserRankCache(userId) {
    const cacheKeys = [
      this.CACHE_KEYS.USER_RANK(userId, 'all_time'),
      this.CACHE_KEYS.USER_RANK(userId, 'weekly'),
      this.CACHE_KEYS.USER_RANK(userId, 'daily')
    ];

    await Promise.all(cacheKeys.map(key => this.redis.deleteCache(key)));
  }

  /**
   * Clear leaderboard cache
   * @returns {Promise<void>}
   */
  async clearLeaderboardCache() {
    const cacheKeys = [
      this.CACHE_KEYS.ALL_TIME,
      this.CACHE_KEYS.WEEKLY,
      this.CACHE_KEYS.DAILY
    ];

    // Clear base cache keys and their variations with pagination
    const deletePromises = [];
    for (const baseKey of cacheKeys) {
      // Delete base key and common pagination variations
      for (let limit = 10; limit <= 100; limit += 10) {
        for (let offset = 0; offset <= 100; offset += 10) {
          deletePromises.push(this.redis.deleteCache(`${baseKey}:${limit}:${offset}`));
        }
      }
    }

    await Promise.all(deletePromises);
  }

  /**
   * Get leaderboard statistics
   * @returns {Promise<Object>} Leaderboard statistics
   */
  async getLeaderboardStats() {
    try {
      const [allTimeCount, weeklyCount, dailyCount] = await Promise.all([
        this.redis.getLeaderboardSize(this.LEADERBOARD_KEYS.ALL_TIME),
        this.redis.getLeaderboardSize(this.LEADERBOARD_KEYS.WEEKLY),
        this.redis.getLeaderboardSize(this.LEADERBOARD_KEYS.DAILY)
      ]);

      return {
        totalPlayers: {
          allTime: allTimeCount,
          weekly: weeklyCount,
          daily: dailyCount
        },
        lastUpdated: Date.now()
      };
    } catch (error) {
      console.error('Error getting leaderboard stats:', error);
      throw error;
    }
  }
}

module.exports = LeaderboardService;