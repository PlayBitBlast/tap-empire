// Shared calculation utilities for Tap Empire
// This is a copy of the shared/utils/calculations.js file for client-side use

import { GAME_CONFIG, UPGRADE_CONFIGS } from '../constants/gameConfig';

/**
 * Calculate coins earned per tap based on current game state
 */
export const calculateCoinsPerTap = (gameState) => {
  const baseCoins = GAME_CONFIG.INITIAL_COINS_PER_TAP;
  const tapMultiplierLevel = gameState.upgrades?.tap_multiplier || 0;
  const prestigeMultiplier = 1 + (gameState.prestige?.level || 0) * 0.1;
  const eventMultiplier = gameState.activeEventMultiplier || 1;
  
  const tapMultiplier = 1 + (tapMultiplierLevel * UPGRADE_CONFIGS.tap_multiplier.baseEffect);
  
  return Math.floor(baseCoins * tapMultiplier * prestigeMultiplier * eventMultiplier);
};

/**
 * Calculate auto-clicker rate (coins per second) based on current game state
 */
export const calculateAutoClickerRate = (gameState) => {
  const autoClickerLevel = gameState.upgrades?.auto_clicker || 0;
  const prestigeMultiplier = 1 + (gameState.prestige?.level || 0) * 0.1;
  const eventMultiplier = gameState.activeEventMultiplier || 1;
  
  const baseRate = autoClickerLevel * UPGRADE_CONFIGS.auto_clicker.baseEffect;
  
  return Math.floor(baseRate * prestigeMultiplier * eventMultiplier);
};

/**
 * Calculate golden tap chance based on current game state
 */
export const calculateGoldenTapChance = (gameState) => {
  const baseChance = GAME_CONFIG.GOLDEN_TAP_CHANCE;
  const goldenTapLevel = gameState.upgrades?.golden_tap_chance || 0;
  const bonusChance = goldenTapLevel * UPGRADE_CONFIGS.golden_tap_chance.baseEffect;
  
  return Math.min(baseChance + bonusChance, 0.1); // Cap at 10%
};

/**
 * Calculate golden tap earnings
 */
export const calculateGoldenTapEarnings = (baseEarnings) => {
  return Math.floor(baseEarnings * GAME_CONFIG.GOLDEN_TAP_MULTIPLIER);
};

/**
 * Calculate prestige multiplier based on prestige level
 */
export const calculatePrestigeMultiplier = (prestigeLevel) => {
  return 1 + (prestigeLevel * 0.1); // 10% multiplier per prestige level
};

/**
 * Validate tap rate to prevent cheating
 */
export const validateTapRate = (tapTimestamps) => {
  if (tapTimestamps.length <= GAME_CONFIG.MAX_TAPS_PER_SECOND) {
    return true;
  }
  
  // Check if taps are within the allowed rate
  const now = Date.now();
  const recentTaps = tapTimestamps.filter(
    timestamp => timestamp > now - GAME_CONFIG.TAP_VALIDATION_WINDOW_MS
  );
  
  return recentTaps.length <= GAME_CONFIG.MAX_TAPS_PER_SECOND;
};

/**
 * Generate a simple checksum for game state validation
 */
export const generateGameStateChecksum = (gameState) => {
  const key = `${gameState.coins}_${gameState.totalCoinsEarned}_${gameState.coinsPerTap}_${Date.now()}`;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
};

/**
 * Calculate upgrade cost based on current level
 */
export const calculateUpgradeCost = (upgradeType, currentLevel) => {
  const config = UPGRADE_CONFIGS[upgradeType];
  if (!config) return 0;
  
  return Math.floor(config.baseCost * Math.pow(config.costMultiplier, currentLevel));
};

/**
 * Calculate upgrade effect based on level
 */
export const calculateUpgradeEffect = (upgradeType, level) => {
  const config = UPGRADE_CONFIGS[upgradeType];
  if (!config) return 0;
  
  return config.baseEffect * level;
};

/**
 * Calculate daily bonus based on streak
 */
export const calculateDailyBonus = (streakDay) => {
  const multiplier = Math.min(streakDay, GAME_CONFIG.MAX_STREAK_MULTIPLIER);
  return GAME_CONFIG.DAILY_BONUS_BASE_AMOUNT * multiplier;
};

/**
 * Calculate prestige points from lifetime coins
 */
export const calculatePrestigePoints = (lifetimeCoins) => {
  return Math.floor(lifetimeCoins * GAME_CONFIG.PRESTIGE_POINTS_RATIO);
};

/**
 * Calculate offline earnings
 */
export const calculateOfflineEarnings = (autoClickerRate, offlineHours) => {
  const cappedHours = Math.min(offlineHours, GAME_CONFIG.OFFLINE_EARNINGS_CAP_HOURS);
  return Math.floor(autoClickerRate * cappedHours * 3600); // Convert hours to seconds
};

/**
 * Validate game state for basic sanity checks
 */
export const validateGameState = (gameState) => {
  if (!gameState) return false;
  
  // Basic validation
  if (gameState.coins < 0) return false;
  if (gameState.totalCoinsEarned < gameState.coins) return false;
  if (gameState.coinsPerTap < GAME_CONFIG.INITIAL_COINS_PER_TAP) return false;
  
  return true;
};

/**
 * Format large numbers with appropriate suffixes
 */
export const formatNumber = (num) => {
  if (num < 1000) return num.toLocaleString();
  if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
  if (num < 1000000000) return (num / 1000000).toFixed(1) + 'M';
  if (num < 1000000000000) return (num / 1000000000).toFixed(1) + 'B';
  return (num / 1000000000000).toFixed(1) + 'T';
};

/**
 * Calculate time until next daily bonus
 */
export const calculateTimeUntilDailyBonus = (lastLogin) => {
  if (!lastLogin) return 0;
  
  const now = Date.now();
  const lastLoginTime = new Date(lastLogin).getTime();
  const timeSinceLogin = now - lastLoginTime;
  const dayInMs = 24 * 60 * 60 * 1000;
  
  if (timeSinceLogin >= dayInMs) {
    return 0; // Bonus available now
  }
  
  return dayInMs - timeSinceLogin;
};

/**
 * Check if user can prestige
 */
export const canPrestige = (gameState) => {
  return gameState.totalCoinsEarned >= GAME_CONFIG.PRESTIGE_UNLOCK_COINS;
};

/**
 * Calculate coins needed for next prestige
 */
export const coinsNeededForPrestige = (gameState) => {
  const needed = GAME_CONFIG.PRESTIGE_UNLOCK_COINS - gameState.totalCoinsEarned;
  return Math.max(0, needed);
};