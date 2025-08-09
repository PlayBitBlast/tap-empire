const redis = require('redis');
require('dotenv').config();

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000
};

// Check if Redis is enabled
const isRedisEnabled = process.env.REDIS_ENABLED !== 'false';

// Create Redis client
let client = null;
if (isRedisEnabled) {
  // Use Redis URL if provided, otherwise use individual config
  if (process.env.REDIS_URL) {
    client = redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: redisConfig.connectTimeout,
        commandTimeout: redisConfig.commandTimeout,
        keepAlive: redisConfig.keepAlive
      }
    });
  } else {
    client = redis.createClient({
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
        connectTimeout: redisConfig.connectTimeout,
        commandTimeout: redisConfig.commandTimeout,
        keepAlive: redisConfig.keepAlive
      },
      password: redisConfig.password,
      database: redisConfig.db
    });
  }
}

// Redis client event handlers (only if Redis is enabled)
if (client) {
  client.on('connect', () => {
    console.log('Redis client connected');
  });

  client.on('ready', () => {
    console.log('Redis client ready');
  });

  client.on('error', (err) => {
    console.error('Redis client error:', err);
  });

  client.on('end', () => {
    console.log('Redis client connection ended');
  });

  client.on('reconnecting', () => {
    console.log('Redis client reconnecting');
  });
}

// Redis wrapper class with error handling and utilities
class RedisManager {
  constructor() {
    this.client = client;
    this.isConnected = false;
    this.isEnabled = isRedisEnabled;
    
    // In-memory storage for when Redis is disabled
    this.memoryStore = new Map();
    this.leaderboards = new Map();
  }

  /**
   * Connect to Redis
   * @returns {Promise<void>}
   */
  async connect() {
    if (!this.isEnabled) {
      console.log('⚠️  Redis disabled - using in-memory cache');
      return;
    }
    
    try {
      if (!this.isConnected && this.client && !this.client.isOpen) {
        await this.client.connect();
        this.isConnected = true;
        console.log('Redis connection established');
      }
    } catch (error) {
      console.error('Failed to connect to Redis:', error.message);
      console.log('⚠️  Falling back to in-memory cache');
      this.isEnabled = false; // Disable Redis for this session
    }
  }

  /**
   * Disconnect from Redis
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      if (this.isConnected) {
        await this.client.disconnect();
        this.isConnected = false;
        console.log('Redis connection closed');
      }
    } catch (error) {
      console.error('Error disconnecting from Redis:', error);
      throw error;
    }
  }

  /**
   * Test Redis connection
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      await this.connect();
      const result = await this.client.ping();
      console.log('Redis connection test successful:', result);
      return true;
    } catch (error) {
      console.error('Redis connection test failed:', error);
      return false;
    }
  }

  /**
   * Get Redis client instance
   * @returns {Object} Redis client
   */
  getClient() {
    return this.client;
  }

  /**
   * Execute Redis command with error handling
   * @param {Function} command - Redis command function
   * @param {Array} args - Command arguments
   * @returns {Promise<any>} Command result
   */
  async executeCommand(command, ...args) {
    if (!this.isEnabled) {
      // Return mock data for in-memory fallback
      return null;
    }
    
    try {
      await this.connect();
      if (this.isConnected && this.client) {
        return await command.apply(this.client, args);
      }
      return null;
    } catch (error) {
      console.error('Redis command error:', error.message);
      return null;
    }
  }

  // Leaderboard-specific methods
  
  /**
   * Add or update player score in leaderboard
   * @param {string} leaderboardKey - Leaderboard key
   * @param {number} score - Player score
   * @param {string} playerId - Player ID
   * @returns {Promise<number>} Number of elements added
   */
  async updateLeaderboardScore(leaderboardKey, score, playerId) {
    return this.executeCommand(this.client.zAdd.bind(this.client), leaderboardKey, {
      score: score,
      value: playerId
    });
  }

  /**
   * Get leaderboard rankings
   * @param {string} leaderboardKey - Leaderboard key
   * @param {number} start - Start index (0-based)
   * @param {number} stop - Stop index (-1 for all)
   * @param {boolean} withScores - Include scores in result
   * @returns {Promise<Array>} Leaderboard entries
   */
  async getLeaderboardRange(leaderboardKey, start = 0, stop = -1, withScores = true) {
    if (withScores) {
      return this.executeCommand(
        this.client.zRevRangeWithScores.bind(this.client),
        leaderboardKey,
        start,
        stop
      );
    } else {
      return this.executeCommand(
        this.client.zRevRange.bind(this.client),
        leaderboardKey,
        start,
        stop
      );
    }
  }

  /**
   * Get player rank in leaderboard
   * @param {string} leaderboardKey - Leaderboard key
   * @param {string} playerId - Player ID
   * @returns {Promise<number|null>} Player rank (0-based) or null if not found
   */
  async getPlayerRank(leaderboardKey, playerId) {
    return this.executeCommand(this.client.zRevRank.bind(this.client), leaderboardKey, playerId);
  }

  /**
   * Get player score in leaderboard
   * @param {string} leaderboardKey - Leaderboard key
   * @param {string} playerId - Player ID
   * @returns {Promise<number|null>} Player score or null if not found
   */
  async getPlayerScore(leaderboardKey, playerId) {
    return this.executeCommand(this.client.zScore.bind(this.client), leaderboardKey, playerId);
  }

  /**
   * Get leaderboard size
   * @param {string} leaderboardKey - Leaderboard key
   * @returns {Promise<number>} Number of players in leaderboard
   */
  async getLeaderboardSize(leaderboardKey) {
    return this.executeCommand(this.client.zCard.bind(this.client), leaderboardKey);
  }

  /**
   * Remove player from leaderboard
   * @param {string} leaderboardKey - Leaderboard key
   * @param {string} playerId - Player ID
   * @returns {Promise<number>} Number of elements removed
   */
  async removeFromLeaderboard(leaderboardKey, playerId) {
    return this.executeCommand(this.client.zRem.bind(this.client), leaderboardKey, playerId);
  }

  /**
   * Get players around a specific rank
   * @param {string} leaderboardKey - Leaderboard key
   * @param {string} playerId - Player ID
   * @param {number} range - Number of players above and below
   * @returns {Promise<Array>} Players around the specified player
   */
  async getPlayersAroundRank(leaderboardKey, playerId, range = 5) {
    const playerRank = await this.getPlayerRank(leaderboardKey, playerId);
    if (playerRank === null) return [];

    const start = Math.max(0, playerRank - range);
    const stop = playerRank + range;
    
    return this.getLeaderboardRange(leaderboardKey, start, stop, true);
  }

  // Cache management methods

  /**
   * Set cache value with expiration
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<string>} OK if successful
   */
  async setCache(key, value, ttl = 3600) {
    const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
    return this.executeCommand(this.client.setEx.bind(this.client), key, ttl, serializedValue);
  }

  /**
   * Get cache value
   * @param {string} key - Cache key
   * @param {boolean} parseJson - Whether to parse as JSON
   * @returns {Promise<any>} Cached value or null
   */
  async getCache(key, parseJson = true) {
    const value = await this.executeCommand(this.client.get.bind(this.client), key);
    if (value === null) return null;
    
    if (parseJson) {
      try {
        return JSON.parse(value);
      } catch (error) {
        return value;
      }
    }
    return value;
  }

  /**
   * Delete cache key
   * @param {string} key - Cache key
   * @returns {Promise<number>} Number of keys deleted
   */
  async deleteCache(key) {
    return this.executeCommand(this.client.del.bind(this.client), key);
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} True if key exists
   */
  async exists(key) {
    const result = await this.executeCommand(this.client.exists.bind(this.client), key);
    return result === 1;
  }
}

// Create singleton instance
const redisManager = new RedisManager();

// Export both the manager and the client
module.exports = {
  redisManager,
  RedisManager,
  client
};