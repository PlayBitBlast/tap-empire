const { UPGRADE_CONFIGS, FORMULAS } = require('../../../shared/constants/gameConfig');
const { calculateUpgradeCost, calculateUpgradeEffect } = require('../../../shared/utils/calculations');
const UpgradeRepository = require('../repositories/UpgradeRepository');
const UserRepository = require('../repositories/UserRepository');

/**
 * Upgrade service for managing user upgrades and purchases
 */
class UpgradeService {
  constructor() {
    this.upgradeRepository = new UpgradeRepository();
    this.userRepository = new UserRepository();
  }

  /**
   * Get all available upgrades with user's current levels and costs
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Available upgrades with user data
   */
  async getAvailableUpgrades(userId) {
    const userUpgrades = await this.upgradeRepository.getUserUpgrades(userId);
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    const upgrades = {};
    
    // Process each upgrade type
    for (const [upgradeType, config] of Object.entries(UPGRADE_CONFIGS)) {
      const userUpgrade = userUpgrades.find(u => u.upgrade_type === upgradeType);
      const currentLevel = userUpgrade ? userUpgrade.level : 0;
      const nextLevel = currentLevel + 1;
      
      // Calculate costs and effects
      const currentCost = calculateUpgradeCost(upgradeType, currentLevel);
      const currentEffect = calculateUpgradeEffect(upgradeType, currentLevel);
      const nextEffect = calculateUpgradeEffect(upgradeType, nextLevel);
      
      // Check if user can afford the upgrade
      const canAfford = config.currency === 'prestige_points' 
        ? user.prestige_points >= currentCost
        : user.coins >= currentCost;
      
      // Check if upgrade is at max level
      const isMaxLevel = currentLevel >= config.maxLevel;
      
      upgrades[upgradeType] = {
        type: upgradeType,
        name: config.name,
        description: config.description,
        category: config.category,
        currency: config.currency || 'coins',
        currentLevel,
        maxLevel: config.maxLevel,
        currentEffect,
        nextEffect,
        effectIncrease: nextEffect - currentEffect,
        currentCost,
        nextCost: isMaxLevel ? null : calculateUpgradeCost(upgradeType, nextLevel),
        canAfford,
        isMaxLevel,
        isAvailable: !isMaxLevel
      };
    }

    return {
      upgrades,
      userCoins: user.coins,
      userPrestigePoints: user.prestige_points || 0
    };
  }

  /**
   * Purchase an upgrade for a user
   * @param {number} userId - User ID
   * @param {string} upgradeType - Type of upgrade to purchase
   * @returns {Promise<Object>} Purchase result
   */
  async purchaseUpgrade(userId, upgradeType) {
    // Validate upgrade type
    const config = UPGRADE_CONFIGS[upgradeType];
    if (!config) {
      throw new Error('Invalid upgrade type');
    }

    // Get user and current upgrade level
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const currentLevel = await this.upgradeRepository.getUpgradeLevel(userId, upgradeType);
    
    // Check if upgrade is at max level
    if (currentLevel >= config.maxLevel) {
      throw new Error('Upgrade is already at maximum level');
    }

    // Calculate cost
    const cost = calculateUpgradeCost(upgradeType, currentLevel);
    
    // Check if user can afford the upgrade
    const currency = config.currency || 'coins';
    const userCurrency = currency === 'prestige_points' ? user.prestige_points : user.coins;
    
    if (userCurrency < cost) {
      throw new Error(`Insufficient ${currency}`);
    }

    // Perform the purchase in a transaction
    return await this.upgradeRepository.transaction(async (client) => {
      // Deduct currency
      if (currency === 'prestige_points') {
        await this.userRepository.updatePrestigePoints(userId, user.prestige_points - cost);
      } else {
        await this.userRepository.updateCoins(userId, user.coins - cost);
      }

      // Increment upgrade level
      const updatedUpgrade = await this.upgradeRepository.incrementUpgrade(userId, upgradeType);
      
      // Update user's derived stats (coins per tap, auto clicker rate)
      await this.updateUserDerivedStats(userId);

      // Calculate new effects
      const newLevel = updatedUpgrade.level;
      const newEffect = calculateUpgradeEffect(upgradeType, newLevel);
      const nextCost = newLevel >= config.maxLevel ? null : calculateUpgradeCost(upgradeType, newLevel);

      return {
        success: true,
        upgrade: {
          type: upgradeType,
          name: config.name,
          oldLevel: currentLevel,
          newLevel,
          newEffect,
          nextCost,
          costPaid: cost,
          currency,
          isMaxLevel: newLevel >= config.maxLevel
        },
        userCurrency: userCurrency - cost
      };
    });
  }

  /**
   * Get upgrade statistics for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Upgrade statistics
   */
  async getUserUpgradeStats(userId) {
    const stats = await this.upgradeRepository.getUserUpgradeStats(userId);
    const upgrades = await this.upgradeRepository.getUserUpgrades(userId);
    
    // Calculate total coins spent on upgrades
    let totalCoinsSpent = 0;
    let totalPrestigePointsSpent = 0;
    
    for (const upgrade of upgrades) {
      const config = UPGRADE_CONFIGS[upgrade.upgrade_type];
      if (!config) continue;
      
      // Calculate total cost for reaching current level
      let totalCost = 0;
      for (let level = 0; level < upgrade.level; level++) {
        totalCost += calculateUpgradeCost(upgrade.upgrade_type, level);
      }
      
      if (config.currency === 'prestige_points') {
        totalPrestigePointsSpent += totalCost;
      } else {
        totalCoinsSpent += totalCost;
      }
    }

    return {
      ...stats,
      totalCoinsSpent,
      totalPrestigePointsSpent,
      upgradesByCategory: this.categorizeUpgrades(upgrades)
    };
  }

  /**
   * Update user's derived stats based on current upgrades
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  async updateUserDerivedStats(userId) {
    const user = await this.userRepository.findById(userId);
    const upgrades = await this.upgradeRepository.getUserUpgrades(userId);
    
    // Build upgrade state object
    const upgradeState = {};
    for (const upgrade of upgrades) {
      upgradeState[upgrade.upgrade_type] = upgrade.level;
    }
    
    const userState = {
      ...user,
      upgrades: upgradeState
    };

    // Calculate new derived stats
    const { calculateCoinsPerTap, calculateAutoClickerRate } = require('../../../shared/utils/calculations');
    const newCoinsPerTap = calculateCoinsPerTap(userState);
    const newAutoClickerRate = calculateAutoClickerRate(userState);

    // Update user record
    await this.userRepository.update(userId, {
      coins_per_tap: newCoinsPerTap,
      auto_clicker_rate: newAutoClickerRate
    });
  }

  /**
   * Categorize upgrades by their category
   * @param {Array} upgrades - User upgrades
   * @returns {Object} Upgrades grouped by category
   */
  categorizeUpgrades(upgrades) {
    const categories = {};
    
    for (const upgrade of upgrades) {
      const config = UPGRADE_CONFIGS[upgrade.upgrade_type];
      if (!config) continue;
      
      const category = config.category;
      if (!categories[category]) {
        categories[category] = [];
      }
      
      categories[category].push({
        type: upgrade.upgrade_type,
        name: config.name,
        level: upgrade.level,
        effect: calculateUpgradeEffect(upgrade.upgrade_type, upgrade.level)
      });
    }
    
    return categories;
  }

  /**
   * Get upgrade leaderboard
   * @param {string} upgradeType - Type of upgrade
   * @param {number} limit - Number of users to return
   * @returns {Promise<Array>} Top users for specific upgrade
   */
  async getUpgradeLeaderboard(upgradeType, limit = 100) {
    if (!UPGRADE_CONFIGS[upgradeType]) {
      throw new Error('Invalid upgrade type');
    }

    return await this.upgradeRepository.getUsersWithUpgradeLevel(upgradeType, limit);
  }

  /**
   * Reset upgrades for prestige (keep prestige upgrades)
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Reset result
   */
  async resetUpgradesForPrestige(userId) {
    const upgrades = await this.upgradeRepository.getUserUpgrades(userId);
    const prestigeUpgrades = upgrades.filter(u => {
      const config = UPGRADE_CONFIGS[u.upgrade_type];
      return config && config.category === 'prestige';
    });

    // Delete non-prestige upgrades
    await this.upgradeRepository.transaction(async (client) => {
      for (const upgrade of upgrades) {
        const config = UPGRADE_CONFIGS[upgrade.upgrade_type];
        if (config && config.category !== 'prestige') {
          await this.upgradeRepository.delete(upgrade.id);
        }
      }
    });

    // Update user's derived stats
    await this.updateUserDerivedStats(userId);

    return {
      success: true,
      upgradesReset: upgrades.length - prestigeUpgrades.length,
      prestigeUpgradesKept: prestigeUpgrades.length
    };
  }

  /**
   * Validate upgrade purchase request
   * @param {number} userId - User ID
   * @param {string} upgradeType - Type of upgrade
   * @returns {Promise<Object>} Validation result
   */
  async validateUpgradePurchase(userId, upgradeType) {
    const config = UPGRADE_CONFIGS[upgradeType];
    if (!config) {
      return { valid: false, reason: 'Invalid upgrade type' };
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      return { valid: false, reason: 'User not found' };
    }

    const currentLevel = await this.upgradeRepository.getUpgradeLevel(userId, upgradeType);
    
    if (currentLevel >= config.maxLevel) {
      return { valid: false, reason: 'Upgrade is at maximum level' };
    }

    const cost = calculateUpgradeCost(upgradeType, currentLevel);
    const currency = config.currency || 'coins';
    const userCurrency = currency === 'prestige_points' ? user.prestige_points : user.coins;
    
    if (userCurrency < cost) {
      return { 
        valid: false, 
        reason: `Insufficient ${currency}`,
        required: cost,
        available: userCurrency
      };
    }

    return { 
      valid: true, 
      cost,
      currency,
      currentLevel,
      nextLevel: currentLevel + 1
    };
  }
}

module.exports = UpgradeService;