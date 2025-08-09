const BaseRepository = require('./BaseRepository');

/**
 * User repository for managing user data and game state
 */
class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  /**
   * Find user by Telegram ID
   * @param {number} telegramId - Telegram user ID
   * @returns {Promise<Object|null>} User record or null
   */
  async findByTelegramId(telegramId) {
    return await this.findOne({ telegram_id: telegramId });
  }

  /**
   * Create user from Telegram data
   * @param {Object} telegramUser - Telegram user data
   * @returns {Promise<Object>} Created user record
   */
  async createFromTelegram(telegramUser) {
    const userData = {
      telegram_id: telegramUser.id,
      username: telegramUser.username || null,
      first_name: telegramUser.first_name || null,
      last_name: telegramUser.last_name || null,
      coins: 0,
      total_coins_earned: 0,
      coins_per_tap: 1,
      auto_clicker_rate: 0,
      prestige_level: 0,
      prestige_points: 0,
      login_streak: 0,
      last_login: new Date(),
      last_offline_calculation: new Date()
    };

    return await this.create(userData);
  }

  /**
   * Update user coins and total earned
   * @param {number} userId - User ID
   * @param {number} amount - Coin amount to add
   * @returns {Promise<Object>} Updated user record
   */
  async addCoins(userId, amount) {
    const query = `
      UPDATE users 
      SET coins = coins + $2,
          total_coins_earned = total_coins_earned + $2,
          updated_at = NOW()
      WHERE id = $1 
      RETURNING *
    `;
    return await this.db.queryOne(query, [userId, amount]);
  }

  /**
   * Deduct coins from user
   * @param {number} userId - User ID
   * @param {number} amount - Coin amount to deduct
   * @returns {Promise<Object|null>} Updated user record or null if insufficient funds
   */
  async deductCoins(userId, amount) {
    const query = `
      UPDATE users 
      SET coins = coins - $2,
          updated_at = NOW()
      WHERE id = $1 AND coins >= $2
      RETURNING *
    `;
    return await this.db.queryOne(query, [userId, amount]);
  }

  /**
   * Update user login streak
   * @param {number} userId - User ID
   * @param {number} streak - New streak value
   * @returns {Promise<Object>} Updated user record
   */
  async updateLoginStreak(userId, streak) {
    return await this.update(userId, {
      login_streak: streak,
      last_login: new Date()
    });
  }

  /**
   * Update offline calculation timestamp
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Updated user record
   */
  async updateOfflineCalculation(userId) {
    return await this.update(userId, {
      last_offline_calculation: new Date()
    });
  }

  /**
   * Get top users by total coins for leaderboard
   * @param {number} limit - Number of users to return
   * @returns {Promise<Array>} Top users
   */
  async getTopUsers(limit = 100) {
    const query = `
      SELECT id, username, first_name, last_name, total_coins_earned, prestige_level,
             ROW_NUMBER() OVER (ORDER BY total_coins_earned DESC) as rank
      FROM users 
      WHERE is_active = true AND is_banned = false
      ORDER BY total_coins_earned DESC 
      LIMIT $1
    `;
    return await this.db.queryMany(query, [limit]);
  }

  /**
   * Get user rank by total coins
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} User rank information
   */
  async getUserRank(userId) {
    const query = `
      WITH ranked_users AS (
        SELECT id, total_coins_earned,
               ROW_NUMBER() OVER (ORDER BY total_coins_earned DESC) as rank
        FROM users 
        WHERE is_active = true AND is_banned = false
      )
      SELECT rank, total_coins_earned
      FROM ranked_users 
      WHERE id = $1
    `;
    return await this.db.queryOne(query, [userId]);
  }

  /**
   * Get users around a specific rank for leaderboard context
   * @param {number} userId - User ID
   * @param {number} context - Number of users above and below
   * @returns {Promise<Array>} Users around the rank
   */
  async getUsersAroundRank(userId, context = 5) {
    const query = `
      WITH ranked_users AS (
        SELECT id, username, first_name, last_name, total_coins_earned,
               ROW_NUMBER() OVER (ORDER BY total_coins_earned DESC) as rank
        FROM users 
        WHERE is_active = true AND is_banned = false
      ),
      user_rank AS (
        SELECT rank FROM ranked_users WHERE id = $1
      )
      SELECT * FROM ranked_users 
      WHERE rank BETWEEN (SELECT rank FROM user_rank) - $2 
                     AND (SELECT rank FROM user_rank) + $2
      ORDER BY rank
    `;
    return await this.db.queryMany(query, [userId, context]);
  }

  /**
   * Update user prestige
   * @param {number} userId - User ID
   * @param {number} prestigeLevel - New prestige level
   * @param {number} prestigePoints - Prestige points earned
   * @returns {Promise<Object>} Updated user record
   */
  async prestige(userId, prestigeLevel, prestigePoints) {
    const query = `
      UPDATE users 
      SET coins = 0,
          coins_per_tap = 1,
          auto_clicker_rate = 0,
          prestige_level = $2,
          prestige_points = prestige_points + $3,
          updated_at = NOW()
      WHERE id = $1 
      RETURNING *
    `;
    return await this.db.queryOne(query, [userId, prestigeLevel, prestigePoints]);
  }

  /**
   * Get users who haven't been active recently for cleanup
   * @param {number} daysInactive - Days of inactivity threshold
   * @returns {Promise<Array>} Inactive users
   */
  async getInactiveUsers(daysInactive = 30) {
    const query = `
      SELECT id, telegram_id, username, last_login
      FROM users 
      WHERE last_login < NOW() - INTERVAL '${daysInactive} days'
         OR last_login IS NULL
      ORDER BY last_login ASC NULLS FIRST
    `;
    return await this.db.queryMany(query);
  }

  /**
   * Ban or unban a user
   * @param {number} userId - User ID
   * @param {boolean} banned - Ban status
   * @returns {Promise<Object>} Updated user record
   */
  async setBanStatus(userId, banned) {
    return await this.update(userId, { is_banned: banned });
  }

  /**
   * Get user statistics for admin dashboard
   * @returns {Promise<Object>} User statistics
   */
  async getStatistics() {
    const query = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE is_active = true) as active_users,
        COUNT(*) FILTER (WHERE is_banned = true) as banned_users,
        COUNT(*) FILTER (WHERE last_login > NOW() - INTERVAL '24 hours') as daily_active,
        COUNT(*) FILTER (WHERE last_login > NOW() - INTERVAL '7 days') as weekly_active,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as new_today,
        AVG(total_coins_earned)::BIGINT as avg_coins_earned,
        MAX(total_coins_earned) as max_coins_earned,
        AVG(login_streak) as avg_login_streak,
        MAX(login_streak) as max_login_streak
      FROM users
    `;
    return await this.db.queryOne(query);
  }

  /**
   * Calculate offline earnings for a user
   * @param {number} userId - User ID
   * @param {number} maxHours - Maximum offline hours to calculate
   * @returns {Promise<Object>} Offline earnings calculation
   */
  async calculateOfflineEarnings(userId, maxHours = 4) {
    const query = `
      SELECT calculate_offline_earnings($1, $2) as offline_earnings
    `;
    const result = await this.db.queryOne(query, [userId, maxHours]);
    return {
      earnings: parseInt(result.offline_earnings),
      maxHours
    };
  }

  /**
   * Update user coins (set to specific amount)
   * @param {number} userId - User ID
   * @param {number} amount - New coin amount
   * @returns {Promise<Object>} Updated user record
   */
  async updateCoins(userId, amount) {
    return await this.update(userId, { coins: amount });
  }

  /**
   * Update user prestige points
   * @param {number} userId - User ID
   * @param {number} points - New prestige points amount
   * @returns {Promise<Object>} Updated user record
   */
  async updatePrestigePoints(userId, points) {
    return await this.update(userId, { prestige_points: points });
  }
}

module.exports = UserRepository;