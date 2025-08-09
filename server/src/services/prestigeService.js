const { GAME_CONFIG, UPGRADE_CONFIGS, FORMULAS } = require('../../../shared/constants/gameConfig');
const { calculatePrestigePoints } = require('../../../shared/utils/calculations');
const UserRepository = require('../repositories/UserRepository');
const UpgradeRepository = require('../repositories/UpgradeRepository');
const UpgradeService = require('./upgradeService');

/**
 * Prestige service for managing prestige system and long-term progression
 */
class PrestigeService {
  constructor() {
    this.userRepository = new UserRepository();
    this.upgradeRepository = new UpgradeRepository();
    this.upgradeService = new UpgradeService();
  }

  /**
   * Check if user can prestige
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Prestige eligibility information
   */
  async canPrestige(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const canPrestige = user.total_coins_earned >= GAME_CONFIG.PRESTIGE_UNLOCK_COINS;
    const prestigePoints = calculatePrestigePoints(user.total_coins_earned);
    const currentPrestigePoints = user.prestige_points || 0;
    const newPrestigePoints = prestigePoints - currentPrestigePoints;

    return {
      canPrestige,
      requiredCoins: GAME_CONFIG.PRESTIGE_UNLOCK_COINS,
      currentTotalCoins: user.total_coins_earned,
      currentPrestigeLevel: user.prestige_level || 0,
      currentPrestigePoints: currentPrestigePoints,
      newPrestigePoints: Math.max(0, newPrestigePoints),
      totalPrestigePointsAfter: Math.max(currentPrestigePoints, prestigePoints)
    };
  }

  /**
   * Perform prestige reset
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Prestige result
   */
  async performPrestige(userId) {
    const eligibility = await this.canPrestige(userId);
    
    if (!eligibility.canPrestige) {
      throw new Error(`Need ${GAME_CONFIG.PRESTIGE_UNLOCK_COINS} total coins to prestige`);
    }

    const user = await this.userRepository.findById(userId);
    const newPrestigeLevel = (user.prestige_level || 0) + 1;
    const prestigePointsEarned = eligibility.newPrestigePoints;

    // Perform prestige in a transaction
    return await this.userRepository.transaction(async (client) => {
      // Reset non-prestige upgrades
      await this.upgradeService.resetUpgradesForPrestige(userId);

      // Update user with prestige reset
      const updatedUser = await this.userRepository.prestige(
        userId, 
        newPrestigeLevel, 
        prestigePointsEarned
      );

      // Log prestige event
      await this.userRepository.db.query(
        `INSERT INTO game_sessions (user_id, session_token, start_time, end_time, total_taps, total_earnings, suspicious_activity, ip_address, user_agent)
         VALUES ($1, uuid_generate_v4(), NOW(), NOW(), 0, 0, false, null, 'prestige_system')`,
        [userId]
      );

      return {
        success: true,
        newPrestigeLevel,
        prestigePointsEarned,
        totalPrestigePoints: updatedUser.prestige_points,
        resetStats: {
          coinsReset: user.coins,
          upgradesReset: true,
          newCoinsPerTap: 1,
          newAutoClickerRate: 0
        }
      };
    });
  }

  /**
   * Get prestige upgrade options
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Available prestige upgrades
   */
  async getPrestigeUpgrades(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const userUpgrades = await this.upgradeRepository.getUserUpgrades(userId);
    const prestigeUpgrades = {};

    // Get prestige-specific upgrades
    for (const [upgradeType, config] of Object.entries(UPGRADE_CONFIGS)) {
      if (config.category !== 'prestige') continue;

      const userUpgrade = userUpgrades.find(u => u.upgrade_type === upgradeType);
      const currentLevel = userUpgrade ? userUpgrade.level : 0;
      const nextLevel = currentLevel + 1;

      // Calculate costs and effects for prestige upgrades
      const currentCost = FORMULAS.calculateUpgradeCost(upgradeType, currentLevel);
      const currentEffect = FORMULAS.calculateUpgradeEffect(upgradeType, currentLevel);
      const nextEffect = FORMULAS.calculateUpgradeEffect(upgradeType, nextLevel);

      const canAfford = user.prestige_points >= currentCost;
      const isMaxLevel = currentLevel >= config.maxLevel;

      prestigeUpgrades[upgradeType] = {
        type: upgradeType,
        name: config.name,
        description: config.description,
        currentLevel,
        maxLevel: config.maxLevel,
        currentEffect,
        nextEffect,
        effectIncrease: nextEffect - currentEffect,
        currentCost,
        nextCost: isMaxLevel ? null : FORMULAS.calculateUpgradeCost(upgradeType, nextLevel),
        canAfford,
        isMaxLevel,
        isAvailable: !isMaxLevel,
        currency: 'prestige_points'
      };
    }

    return {
      upgrades: prestigeUpgrades,
      userPrestigePoints: user.prestige_points || 0,
      userPrestigeLevel: user.prestige_level || 0
    };
  }

  /**
   * Purchase prestige upgrade
   * @param {number} userId - User ID
   * @param {string} upgradeType - Type of prestige upgrade
   * @returns {Promise<Object>} Purchase result
   */
  async purchasePrestigeUpgrade(userId, upgradeType) {
    const config = UPGRADE_CONFIGS[upgradeType];
    if (!config || config.category !== 'prestige') {
      throw new Error('Invalid prestige upgrade type');
    }

    // Use the existing upgrade service but ensure it handles prestige points
    return await this.upgradeService.purchaseUpgrade(userId, upgradeType);
  }

  /**
   * Get prestige statistics for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Prestige statistics
   */
  async getPrestigeStats(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const prestigeUpgrades = await this.upgradeRepository.getUserUpgrades(userId);
    const prestigeUpgradeCount = prestigeUpgrades.filter(u => {
      const config = UPGRADE_CONFIGS[u.upgrade_type];
      return config && config.category === 'prestige';
    }).length;

    // Calculate total prestige points spent
    let totalPrestigePointsSpent = 0;
    for (const upgrade of prestigeUpgrades) {
      const config = UPGRADE_CONFIGS[upgrade.upgrade_type];
      if (config && config.category === 'prestige') {
        for (let level = 0; level < upgrade.level; level++) {
          totalPrestigePointsSpent += FORMULAS.calculateUpgradeCost(upgrade.upgrade_type, level);
        }
      }
    }

    // Calculate prestige multiplier from upgrades
    let totalPrestigeMultiplier = 1;
    for (const upgrade of prestigeUpgrades) {
      const config = UPGRADE_CONFIGS[upgrade.upgrade_type];
      if (config && config.category === 'prestige') {
        const effect = FORMULAS.calculateUpgradeEffect(upgrade.upgrade_type, upgrade.level);
        totalPrestigeMultiplier += effect;
      }
    }

    return {
      prestigeLevel: user.prestige_level || 0,
      prestigePoints: user.prestige_points || 0,
      totalPrestigePointsSpent,
      prestigeUpgradeCount,
      totalPrestigeMultiplier,
      lifetimeCoins: user.total_coins_earned,
      nextPrestigeAt: GAME_CONFIG.PRESTIGE_UNLOCK_COINS * (user.prestige_level + 1),
      canPrestigeAgain: user.total_coins_earned >= GAME_CONFIG.PRESTIGE_UNLOCK_COINS * (user.prestige_level + 1)
    };
  }

  /**
   * Get prestige leaderboard
   * @param {number} limit - Number of users to return
   * @returns {Promise<Array>} Top prestige users
   */
  async getPrestigeLeaderboard(limit = 100) {
    const query = `
      SELECT 
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        u.prestige_level,
        u.prestige_points,
        u.total_coins_earned,
        ROW_NUMBER() OVER (ORDER BY u.prestige_level DESC, u.prestige_points DESC, u.total_coins_earned DESC) as rank
      FROM users u
      WHERE u.is_active = true 
        AND u.is_banned = false 
        AND u.prestige_level > 0
      ORDER BY u.prestige_level DESC, u.prestige_points DESC, u.total_coins_earned DESC
      LIMIT $1
    `;

    const users = await this.userRepository.db.queryMany(query, [limit]);
    
    return users.map(user => ({
      rank: user.rank,
      userId: user.id,
      name: user.first_name || user.username || 'Anonymous',
      prestigeLevel: user.prestige_level,
      prestigePoints: user.prestige_points,
      totalCoinsEarned: user.total_coins_earned
    }));
  }

  /**
   * Calculate prestige multiplier for a user
   * @param {number} userId - User ID
   * @returns {Promise<number>} Total prestige multiplier
   */
  async calculatePrestigeMultiplier(userId) {
    const prestigeUpgrades = await this.upgradeRepository.getUserUpgrades(userId);
    let multiplier = 1;

    for (const upgrade of prestigeUpgrades) {
      const config = UPGRADE_CONFIGS[upgrade.upgrade_type];
      if (config && config.category === 'prestige') {
        const effect = FORMULAS.calculateUpgradeEffect(upgrade.upgrade_type, upgrade.level);
        multiplier += effect;
      }
    }

    return multiplier;
  }

  /**
   * Get prestige progress for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Prestige progress information
   */
  async getPrestigeProgress(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const currentLevel = user.prestige_level || 0;
    const nextPrestigeRequirement = GAME_CONFIG.PRESTIGE_UNLOCK_COINS;
    const progress = Math.min(user.total_coins_earned / nextPrestigeRequirement, 1);
    const canPrestige = user.total_coins_earned >= nextPrestigeRequirement;

    return {
      currentLevel,
      totalCoinsEarned: user.total_coins_earned,
      nextPrestigeRequirement,
      progress,
      canPrestige,
      prestigePoints: user.prestige_points || 0,
      potentialPrestigePoints: calculatePrestigePoints(user.total_coins_earned) - (user.prestige_points || 0)
    };
  }

  /**
   * Validate prestige action
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Validation result
   */
  async validatePrestige(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return { valid: false, reason: 'User not found' };
    }

    if (user.total_coins_earned < GAME_CONFIG.PRESTIGE_UNLOCK_COINS) {
      return {
        valid: false,
        reason: 'Insufficient total coins earned',
        required: GAME_CONFIG.PRESTIGE_UNLOCK_COINS,
        current: user.total_coins_earned
      };
    }

    const prestigePoints = calculatePrestigePoints(user.total_coins_earned);
    const currentPrestigePoints = user.prestige_points || 0;
    const newPrestigePoints = prestigePoints - currentPrestigePoints;

    if (newPrestigePoints <= 0) {
      return {
        valid: false,
        reason: 'No new prestige points would be earned',
        currentPoints: currentPrestigePoints,
        totalPossible: prestigePoints
      };
    }

    return {
      valid: true,
      newPrestigePoints,
      newPrestigeLevel: (user.prestige_level || 0) + 1
    };
  }
}

module.exports = PrestigeService;