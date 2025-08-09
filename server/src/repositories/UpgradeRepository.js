const BaseRepository = require('./BaseRepository');

/**
 * Upgrade repository for managing user upgrades
 */
class UpgradeRepository extends BaseRepository {
  constructor() {
    super('user_upgrades');
  }

  /**
   * Get all upgrades for a user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} User upgrades
   */
  async getUserUpgrades(userId) {
    return await this.findAll({ user_id: userId });
  }

  /**
   * Get specific upgrade for a user
   * @param {number} userId - User ID
   * @param {string} upgradeType - Type of upgrade
   * @returns {Promise<Object|null>} Upgrade record or null
   */
  async getUserUpgrade(userId, upgradeType) {
    return await this.findOne({ 
      user_id: userId, 
      upgrade_type: upgradeType 
    });
  }

  /**
   * Get upgrade level for a user
   * @param {number} userId - User ID
   * @param {string} upgradeType - Type of upgrade
   * @returns {Promise<number>} Upgrade level (0 if not found)
   */
  async getUpgradeLevel(userId, upgradeType) {
    const upgrade = await this.getUserUpgrade(userId, upgradeType);
    return upgrade ? upgrade.level : 0;
  }

  /**
   * Create or update an upgrade for a user
   * @param {number} userId - User ID
   * @param {string} upgradeType - Type of upgrade
   * @param {number} level - New upgrade level
   * @returns {Promise<Object>} Upgrade record
   */
  async setUpgradeLevel(userId, upgradeType, level) {
    const existingUpgrade = await this.getUserUpgrade(userId, upgradeType);
    
    if (existingUpgrade) {
      return await this.update(existingUpgrade.id, { level });
    } else {
      return await this.create({
        user_id: userId,
        upgrade_type: upgradeType,
        level
      });
    }
  }

  /**
   * Increment upgrade level for a user
   * @param {number} userId - User ID
   * @param {string} upgradeType - Type of upgrade
   * @returns {Promise<Object>} Updated upgrade record
   */
  async incrementUpgrade(userId, upgradeType) {
    const query = `
      INSERT INTO user_upgrades (user_id, upgrade_type, level)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, upgrade_type)
      DO UPDATE SET 
        level = user_upgrades.level + 1,
        updated_at = NOW()
      RETURNING *
    `;
    return await this.db.queryOne(query, [userId, upgradeType]);
  }

  /**
   * Get upgrade statistics for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Upgrade statistics
   */
  async getUserUpgradeStats(userId) {
    const query = `
      SELECT 
        COUNT(*) as total_upgrade_types,
        SUM(level) as total_upgrade_levels,
        MAX(level) as highest_upgrade_level,
        AVG(level) as average_upgrade_level
      FROM user_upgrades 
      WHERE user_id = $1
    `;
    const result = await this.db.queryOne(query, [userId]);
    return {
      totalUpgradeTypes: parseInt(result.total_upgrade_types),
      totalUpgradeLevels: parseInt(result.total_upgrade_levels || 0),
      highestUpgradeLevel: parseInt(result.highest_upgrade_level || 0),
      averageUpgradeLevel: parseFloat(result.average_upgrade_level || 0)
    };
  }

  /**
   * Get top users by total upgrade levels
   * @param {number} limit - Number of users to return
   * @returns {Promise<Array>} Top users by upgrades
   */
  async getTopUsersByUpgrades(limit = 100) {
    const query = `
      SELECT 
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        SUM(uu.level) as total_upgrade_levels,
        COUNT(uu.upgrade_type) as upgrade_types_count
      FROM users u
      JOIN user_upgrades uu ON u.id = uu.user_id
      WHERE u.is_active = true AND u.is_banned = false
      GROUP BY u.id, u.username, u.first_name, u.last_name
      ORDER BY total_upgrade_levels DESC
      LIMIT $1
    `;
    return await this.db.queryMany(query, [limit]);
  }

  /**
   * Get upgrade distribution statistics
   * @returns {Promise<Array>} Upgrade type statistics
   */
  async getUpgradeDistribution() {
    const query = `
      SELECT 
        upgrade_type,
        COUNT(*) as user_count,
        AVG(level) as average_level,
        MAX(level) as max_level,
        SUM(level) as total_levels
      FROM user_upgrades
      GROUP BY upgrade_type
      ORDER BY total_levels DESC
    `;
    return await this.db.queryMany(query);
  }

  /**
   * Reset all upgrades for a user (used in prestige)
   * @param {number} userId - User ID
   * @returns {Promise<number>} Number of deleted upgrades
   */
  async resetUserUpgrades(userId) {
    return await this.deleteWhere({ user_id: userId });
  }

  /**
   * Get users with specific upgrade level
   * @param {string} upgradeType - Type of upgrade
   * @param {number} level - Upgrade level
   * @returns {Promise<Array>} Users with the upgrade level
   */
  async getUsersWithUpgradeLevel(upgradeType, level) {
    const query = `
      SELECT u.id, u.username, u.first_name, u.last_name, uu.level
      FROM users u
      JOIN user_upgrades uu ON u.id = uu.user_id
      WHERE uu.upgrade_type = $1 AND uu.level = $2
      ORDER BY uu.updated_at DESC
    `;
    return await this.db.queryMany(query, [upgradeType, level]);
  }

  /**
   * Bulk update upgrades for multiple users (admin function)
   * @param {Array} updates - Array of {userId, upgradeType, level} objects
   * @returns {Promise<Array>} Updated upgrade records
   */
  async bulkUpdateUpgrades(updates) {
    return await this.transaction(async (client) => {
      const results = [];
      
      for (const update of updates) {
        const query = `
          INSERT INTO user_upgrades (user_id, upgrade_type, level)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, upgrade_type)
          DO UPDATE SET 
            level = $3,
            updated_at = NOW()
          RETURNING *
        `;
        const result = await client.query(query, [
          update.userId, 
          update.upgradeType, 
          update.level
        ]);
        results.push(result.rows[0]);
      }
      
      return results;
    });
  }

  /**
   * Get upgrade history for analytics
   * @param {number} days - Number of days to look back
   * @returns {Promise<Array>} Upgrade activity over time
   */
  async getUpgradeHistory(days = 30) {
    const query = `
      SELECT 
        DATE(updated_at) as date,
        upgrade_type,
        COUNT(*) as upgrade_count,
        COUNT(DISTINCT user_id) as unique_users
      FROM user_upgrades
      WHERE updated_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(updated_at), upgrade_type
      ORDER BY date DESC, upgrade_type
    `;
    return await this.db.queryMany(query);
  }
}

module.exports = UpgradeRepository;