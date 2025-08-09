const BaseRepository = require('./BaseRepository');

/**
 * Achievement repository for managing achievements and user progress
 */
class AchievementRepository extends BaseRepository {
  constructor() {
    super('achievements');
  }

  /**
   * Get all active achievements
   * @returns {Promise<Array>} Active achievements
   */
  async getActiveAchievements() {
    return await this.findAll({ is_active: true }, { orderBy: 'category, requirement_value ASC' });
  }

  /**
   * Get achievements by category
   * @param {string} category - Achievement category
   * @returns {Promise<Array>} Achievements in category
   */
  async getAchievementsByCategory(category) {
    return await this.findAll({ 
      category, 
      is_active: true 
    }, { orderBy: 'requirement_value ASC' });
  }

  /**
   * Get user achievements
   * @param {number} userId - User ID
   * @returns {Promise<Array>} User's unlocked achievements
   */
  async getUserAchievements(userId) {
    const query = `
      SELECT a.*, ua.unlocked_at
      FROM achievements a
      JOIN user_achievements ua ON a.id = ua.achievement_id
      WHERE ua.user_id = $1
      ORDER BY ua.unlocked_at DESC
    `;
    return await this.db.queryMany(query, [userId]);
  }

  /**
   * Get user achievement progress
   * @param {number} userId - User ID
   * @returns {Promise<Array>} All achievements with progress status
   */
  async getUserAchievementProgress(userId) {
    const query = `
      SELECT 
        a.*,
        ua.unlocked_at,
        CASE WHEN ua.achievement_id IS NOT NULL THEN true ELSE false END as unlocked
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
      WHERE a.is_active = true
      ORDER BY a.category, a.requirement_value ASC
    `;
    return await this.db.queryMany(query, [userId]);
  }

  /**
   * Unlock achievement for user
   * @param {number} userId - User ID
   * @param {number} achievementId - Achievement ID
   * @returns {Promise<Object>} User achievement record
   */
  async unlockAchievement(userId, achievementId) {
    const query = `
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, achievement_id) DO NOTHING
      RETURNING *
    `;
    return await this.db.queryOne(query, [userId, achievementId]);
  }

  /**
   * Check if user has achievement
   * @param {number} userId - User ID
   * @param {number} achievementId - Achievement ID
   * @returns {Promise<boolean>} True if user has achievement
   */
  async hasAchievement(userId, achievementId) {
    const query = `
      SELECT 1 FROM user_achievements 
      WHERE user_id = $1 AND achievement_id = $2
    `;
    const result = await this.db.queryOne(query, [userId, achievementId]);
    return !!result;
  }

  /**
   * Get achievements user can unlock based on their stats
   * @param {number} userId - User ID
   * @param {Object} userStats - User statistics object
   * @returns {Promise<Array>} Unlockable achievements
   */
  async getUnlockableAchievements(userId, userStats) {
    const query = `
      SELECT a.*
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
      WHERE a.is_active = true 
        AND ua.achievement_id IS NULL
        AND (
          (a.requirement_type = 'total_taps' AND $2 >= a.requirement_value) OR
          (a.requirement_type = 'total_coins_earned' AND $3 >= a.requirement_value) OR
          (a.requirement_type = 'total_upgrades' AND $4 >= a.requirement_value) OR
          (a.requirement_type = 'golden_taps_count' AND $5 >= a.requirement_value) OR
          (a.requirement_type = 'friends_count' AND $6 >= a.requirement_value) OR
          (a.requirement_type = 'gifts_sent' AND $7 >= a.requirement_value) OR
          (a.requirement_type = 'max_login_streak' AND $8 >= a.requirement_value) OR
          (a.requirement_type = 'prestige_level' AND $9 >= a.requirement_value) OR
          (a.requirement_type = 'max_taps_per_second' AND $10 >= a.requirement_value)
        )
      ORDER BY a.requirement_value ASC
    `;
    
    return await this.db.queryMany(query, [
      userId,
      userStats.totalTaps || 0,
      userStats.totalCoinsEarned || 0,
      userStats.totalUpgrades || 0,
      userStats.goldenTapsCount || 0,
      userStats.friendsCount || 0,
      userStats.giftsSent || 0,
      userStats.maxLoginStreak || 0,
      userStats.prestigeLevel || 0,
      userStats.maxTapsPerSecond || 0
    ]);
  }

  /**
   * Get achievement statistics
   * @returns {Promise<Object>} Achievement statistics
   */
  async getAchievementStatistics() {
    const query = `
      SELECT 
        COUNT(*) as total_achievements,
        COUNT(*) FILTER (WHERE is_active = true) as active_achievements,
        COUNT(DISTINCT category) as categories_count,
        (SELECT COUNT(*) FROM user_achievements) as total_unlocks,
        (SELECT COUNT(DISTINCT user_id) FROM user_achievements) as users_with_achievements,
        AVG(reward_coins) as avg_reward_coins,
        AVG(reward_multiplier) as avg_reward_multiplier
      FROM achievements
    `;
    return await this.db.queryOne(query);
  }

  /**
   * Get most popular achievements
   * @param {number} limit - Number of achievements to return
   * @returns {Promise<Array>} Most unlocked achievements
   */
  async getMostPopularAchievements(limit = 10) {
    const query = `
      SELECT 
        a.*,
        COUNT(ua.user_id) as unlock_count,
        ROUND(COUNT(ua.user_id) * 100.0 / (SELECT COUNT(*) FROM users WHERE is_active = true), 2) as unlock_percentage
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id
      WHERE a.is_active = true
      GROUP BY a.id
      ORDER BY unlock_count DESC
      LIMIT $1
    `;
    return await this.db.queryMany(query, [limit]);
  }

  /**
   * Get rarest achievements
   * @param {number} limit - Number of achievements to return
   * @returns {Promise<Array>} Least unlocked achievements
   */
  async getRarestAchievements(limit = 10) {
    const query = `
      SELECT 
        a.*,
        COUNT(ua.user_id) as unlock_count,
        ROUND(COUNT(ua.user_id) * 100.0 / (SELECT COUNT(*) FROM users WHERE is_active = true), 2) as unlock_percentage
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id
      WHERE a.is_active = true
      GROUP BY a.id
      ORDER BY unlock_count ASC
      LIMIT $1
    `;
    return await this.db.queryMany(query, [limit]);
  }

  /**
   * Get user's achievement completion rate
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Achievement completion statistics
   */
  async getUserCompletionRate(userId) {
    const query = `
      SELECT 
        COUNT(*) as total_achievements,
        COUNT(ua.achievement_id) as unlocked_achievements,
        ROUND(COUNT(ua.achievement_id) * 100.0 / COUNT(*), 2) as completion_percentage,
        SUM(a.reward_coins) FILTER (WHERE ua.achievement_id IS NOT NULL) as total_reward_coins,
        AVG(a.reward_multiplier) FILTER (WHERE ua.achievement_id IS NOT NULL) as avg_multiplier_bonus
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
      WHERE a.is_active = true
    `;
    return await this.db.queryOne(query, [userId]);
  }

  /**
   * Get recent achievement unlocks
   * @param {number} limit - Number of recent unlocks to return
   * @returns {Promise<Array>} Recent achievement unlocks
   */
  async getRecentUnlocks(limit = 50) {
    const query = `
      SELECT 
        ua.*,
        a.name as achievement_name,
        a.description as achievement_description,
        a.category,
        u.username,
        u.first_name,
        u.last_name
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      JOIN users u ON ua.user_id = u.id
      WHERE u.is_active = true
      ORDER BY ua.unlocked_at DESC
      LIMIT $1
    `;
    return await this.db.queryMany(query, [limit]);
  }

  /**
   * Create new achievement (admin function)
   * @param {Object} achievementData - Achievement data
   * @returns {Promise<Object>} Created achievement
   */
  async createAchievement(achievementData) {
    const requiredFields = ['name', 'description', 'category', 'requirement_type', 'requirement_value'];
    for (const field of requiredFields) {
      if (!achievementData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return await this.create({
      ...achievementData,
      reward_coins: achievementData.reward_coins || 0,
      reward_multiplier: achievementData.reward_multiplier || 1.0,
      is_active: achievementData.is_active !== false
    });
  }

  /**
   * Bulk unlock achievements for user
   * @param {number} userId - User ID
   * @param {Array} achievementIds - Array of achievement IDs
   * @returns {Promise<Array>} Unlocked achievements
   */
  async bulkUnlockAchievements(userId, achievementIds) {
    if (!achievementIds || achievementIds.length === 0) {
      return [];
    }

    const placeholders = achievementIds.map((_, index) => `($1, $${index + 2})`).join(', ');
    const query = `
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES ${placeholders}
      ON CONFLICT (user_id, achievement_id) DO NOTHING
      RETURNING *
    `;
    
    return await this.db.queryMany(query, [userId, ...achievementIds]);
  }

  /**
   * Get achievement leaderboard (users with most achievements)
   * @param {number} limit - Number of users to return
   * @returns {Promise<Array>} Users with most achievements
   */
  async getAchievementLeaderboard(limit = 100) {
    const query = `
      SELECT 
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        COUNT(ua.achievement_id) as achievement_count,
        SUM(a.reward_coins) as total_reward_coins,
        MAX(ua.unlocked_at) as latest_unlock
      FROM users u
      JOIN user_achievements ua ON u.id = ua.user_id
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE u.is_active = true AND u.is_banned = false
      GROUP BY u.id, u.username, u.first_name, u.last_name
      ORDER BY achievement_count DESC, latest_unlock DESC
      LIMIT $1
    `;
    return await this.db.queryMany(query, [limit]);
  }
}

module.exports = AchievementRepository;