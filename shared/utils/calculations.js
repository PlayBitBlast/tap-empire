// Shared calculation utilities for Tap Empire
// These functions are used by both client and server for consistency

const { GAME_CONFIG, UPGRADE_CONFIGS, FORMULAS } = require('../constants/gameConfig');

/**
 * Calculate the cost of an upgrade at a specific level
 * @param {string} upgradeType - Type of upgrade
 * @param {number} currentLevel - Current level of the upgrade
 * @returns {number} Cost of the next upgrade level
 */
function calculateUpgradeCost(upgradeType, currentLevel) {
  return FORMULAS.calculateUpgradeCost(upgradeType, currentLevel);
}

/**
 * Calculate the total effect of an upgrade at a specific level
 * @param {string} upgradeType - Type of upgrade
 * @param {number} level - Level of the upgrade
 * @returns {number} Total effect value
 */
function calculateUpgradeEffect(upgradeType, level) {
  return FORMULAS.calculateUpgradeEffect(upgradeType, level);
}

/**
 * Calculate coins per tap based on user's upgrades and multipliers
 * @param {Object} userState - User's current game state
 * @returns {number} Coins earned per tap
 */
function calculateCoinsPerTap(userState) {
  const baseCoinsPerTap = GAME_CONFIG.INITIAL_COINS_PER_TAP;
  const tapMultiplierLevel = userState.upgrades?.tap_multiplier || 0;
  const tapMultiplierBonus = calculateUpgradeEffect('tap_multiplier', tapMultiplierLevel);
  
  // Apply prestige multiplier if available
  const prestigeMultiplier = calculatePrestigeMultiplier(userState.prestige_level || 0);
  
  // Apply achievement multipliers
  const achievementMultiplier = calculateAchievementMultiplier(userState.achievements || []);
  
  // Apply event multipliers
  const eventMultiplier = userState.activeEventMultiplier || 1;
  
  const totalCoinsPerTap = Math.floor(
    (baseCoinsPerTap + tapMultiplierBonus) * 
    prestigeMultiplier * 
    achievementMultiplier * 
    eventMultiplier
  );
  
  return Math.max(totalCoinsPerTap, 1); // Ensure at least 1 coin per tap
}

/**
 * Calculate auto-clicker rate (coins per second)
 * @param {Object} userState - User's current game state
 * @returns {number} Coins generated per second by auto-clickers
 */
function calculateAutoClickerRate(userState) {
  const autoClickerLevel = userState.upgrades?.auto_clicker || 0;
  const baseRate = calculateUpgradeEffect('auto_clicker', autoClickerLevel);
  
  // Apply prestige multiplier
  const prestigeMultiplier = calculatePrestigeMultiplier(userState.prestige_level || 0);
  
  // Apply achievement multipliers
  const achievementMultiplier = calculateAchievementMultiplier(userState.achievements || []);
  
  // Apply event multipliers
  const eventMultiplier = userState.activeEventMultiplier || 1;
  
  return Math.floor(baseRate * prestigeMultiplier * achievementMultiplier * eventMultiplier);
}

/**
 * Calculate prestige multiplier based on prestige level
 * @param {number} prestigeLevel - Current prestige level
 * @returns {number} Multiplier value
 */
function calculatePrestigeMultiplier(prestigeLevel) {
  if (prestigeLevel === 0) return 1;
  
  // Each prestige level gives a 10% bonus (1.1x multiplier)
  return Math.pow(1.1, prestigeLevel);
}

/**
 * Calculate achievement multiplier based on unlocked achievements
 * @param {Array} achievements - Array of unlocked achievement IDs
 * @returns {number} Combined achievement multiplier
 */
function calculateAchievementMultiplier(achievements) {
  // This would typically query achievement data, but for now return base multiplier
  // In a real implementation, you'd sum up all achievement multipliers
  let totalMultiplier = 1;
  
  // Each achievement adds a small multiplier bonus
  // This is a simplified calculation - in practice, you'd look up each achievement's bonus
  const achievementBonus = achievements.length * 0.01; // 1% per achievement
  
  return 1 + achievementBonus;
}

/**
 * Calculate daily bonus amount based on streak
 * @param {number} streakDay - Current streak day (1-based)
 * @returns {number} Bonus amount in coins
 */
function calculateDailyBonus(streakDay) {
  return FORMULAS.calculateDailyBonus(streakDay);
}

/**
 * Calculate prestige points earned from lifetime coins
 * @param {number} lifetimeCoins - Total coins earned in lifetime
 * @returns {number} Prestige points to be awarded
 */
function calculatePrestigePoints(lifetimeCoins) {
  return FORMULAS.calculatePrestigePoints(lifetimeCoins);
}

/**
 * Calculate offline earnings based on auto-clicker rate and offline time
 * @param {number} autoClickerRate - Coins per second from auto-clickers
 * @param {number} offlineHours - Hours spent offline
 * @returns {number} Total coins earned while offline
 */
function calculateOfflineEarnings(autoClickerRate, offlineHours) {
  return FORMULAS.calculateOfflineEarnings(autoClickerRate, offlineHours);
}

/**
 * Calculate Golden Tap chance based on upgrades
 * @param {Object} userState - User's current game state
 * @returns {number} Probability of Golden Tap (0-1)
 */
function calculateGoldenTapChance(userState) {
  const baseChance = GAME_CONFIG.GOLDEN_TAP_CHANCE;
  const goldenTouchLevel = userState.upgrades?.golden_tap_chance || 0;
  const bonusChance = calculateUpgradeEffect('golden_tap_chance', goldenTouchLevel);
  
  return Math.min(baseChance + bonusChance, 0.5); // Cap at 50% chance
}

/**
 * Calculate Golden Tap earnings
 * @param {number} baseEarnings - Base tap earnings
 * @returns {number} Golden Tap earnings (10x multiplier)
 */
function calculateGoldenTapEarnings(baseEarnings) {
  return baseEarnings * GAME_CONFIG.GOLDEN_TAP_MULTIPLIER;
}

/**
 * Validate if a tap rate is within acceptable limits (anti-cheat)
 * @param {Array} tapTimestamps - Array of recent tap timestamps
 * @param {number} maxTapsPerSecond - Maximum allowed taps per second
 * @returns {boolean} True if tap rate is valid
 */
function validateTapRate(tapTimestamps, maxTapsPerSecond = GAME_CONFIG.MAX_TAPS_PER_SECOND) {
  if (tapTimestamps.length < 2) return true;
  
  const now = Date.now();
  const oneSecondAgo = now - 1000;
  
  // Count taps in the last second
  const recentTaps = tapTimestamps.filter(timestamp => timestamp > oneSecondAgo);
  
  return recentTaps.length <= maxTapsPerSecond;
}

/**
 * Calculate experience points for achievements
 * @param {string} achievementType - Type of achievement
 * @param {number} currentValue - Current progress value
 * @param {number} increment - Amount to increment
 * @returns {Object} Updated progress and any unlocked achievements
 */
function calculateAchievementProgress(achievementType, currentValue, increment) {
  const newValue = currentValue + increment;
  
  // This would typically check against achievement thresholds
  // For now, return the updated value
  return {
    newValue,
    achievementsUnlocked: [] // Would contain newly unlocked achievements
  };
}

/**
 * Calculate leaderboard rank based on total coins
 * @param {number} totalCoins - User's total coins
 * @param {Array} leaderboardData - Current leaderboard data
 * @returns {number} User's rank (1-based)
 */
function calculateLeaderboardRank(totalCoins, leaderboardData) {
  if (!leaderboardData || leaderboardData.length === 0) return 1;
  
  let rank = 1;
  for (const entry of leaderboardData) {
    if (totalCoins < entry.totalCoins) {
      rank++;
    } else {
      break;
    }
  }
  
  return rank;
}

/**
 * Generate a simple checksum for game state validation
 * @param {Object} gameState - Current game state
 * @returns {string} Checksum string
 */
function generateGameStateChecksum(gameState) {
  const stateString = JSON.stringify({
    coins: gameState.coins,
    totalCoinsEarned: gameState.total_coins_earned,
    coinsPerTap: gameState.coins_per_tap,
    autoClickerRate: gameState.auto_clicker_rate,
    timestamp: Math.floor(Date.now() / 1000) // Round to seconds
  });
  
  // Simple hash function (in production, use a proper crypto hash)
  let hash = 0;
  for (let i = 0; i < stateString.length; i++) {
    const char = stateString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return hash.toString(36);
}

module.exports = {
  calculateUpgradeCost,
  calculateUpgradeEffect,
  calculateCoinsPerTap,
  calculateAutoClickerRate,
  calculatePrestigeMultiplier,
  calculateAchievementMultiplier,
  calculateDailyBonus,
  calculatePrestigePoints,
  calculateOfflineEarnings,
  calculateGoldenTapChance,
  calculateGoldenTapEarnings,
  validateTapRate,
  calculateAchievementProgress,
  calculateLeaderboardRank,
  generateGameStateChecksum
};