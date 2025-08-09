// Game configuration constants for Tap Empire
// This is a copy of the shared/constants/gameConfig.js file for client-side use

const GAME_CONFIG = {
  // Core game mechanics
  INITIAL_COINS_PER_TAP: 1,
  INITIAL_AUTO_CLICKER_RATE: 0,
  
  // Golden Tap system
  GOLDEN_TAP_CHANCE: 0.02, // 2% chance
  GOLDEN_TAP_MULTIPLIER: 10,
  
  // Anti-cheat settings
  MAX_TAPS_PER_SECOND: 20,
  TAP_VALIDATION_WINDOW_MS: 1000,
  
  // Offline progress
  OFFLINE_EARNINGS_CAP_HOURS: 4,
  OFFLINE_CALCULATION_INTERVAL_MS: 1000, // 1 second
  
  // Daily bonuses and streaks
  MAX_STREAK_MULTIPLIER: 7,
  DAILY_BONUS_BASE_AMOUNT: 100,
  STREAK_RESET_HOURS: 48, // Reset streak if no login for 48 hours
  
  // Social features
  MAX_DAILY_GIFTS: 5,
  GIFT_EXPIRY_DAYS: 7,
  MIN_GIFT_AMOUNT: 10,
  MAX_GIFT_AMOUNT: 1000,
  
  // Prestige system
  PRESTIGE_UNLOCK_COINS: 1000000, // 1 million coins
  PRESTIGE_POINTS_RATIO: 0.001, // 1 prestige point per 1000 lifetime coins
  
  // Leaderboard settings
  LEADERBOARD_TOP_COUNT: 100,
  LEADERBOARD_UPDATE_INTERVAL_MS: 5000, // 5 seconds
  
  // Rate limiting
  API_RATE_LIMIT_WINDOW_MS: 60000, // 1 minute
  API_RATE_LIMIT_MAX_REQUESTS: 100,
  GAME_ACTION_RATE_LIMIT_MS: 50, // 50ms between game actions
  
  // WebSocket events
  SYNC_INTERVAL_MS: 10000, // 10 seconds
  BATCH_SYNC_SIZE: 10, // Max operations per sync batch
  
  // UI/UX settings
  ANIMATION_DURATION_MS: 300,
  FLOATING_COIN_DURATION_MS: 1500,
  NOTIFICATION_DURATION_MS: 3000,
  
  // Game loop
  GAME_LOOP_FPS: 60,
  GAME_LOOP_INTERVAL_MS: 1000 / 60, // ~16.67ms
  
  // API configuration
  API_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3005/api'
};

// Upgrade configurations
const UPGRADE_CONFIGS = {
  tap_multiplier: {
    name: 'Tap Power',
    description: 'Increase coins earned per tap',
    baseEffect: 1, // Additional coins per tap per level
    baseCost: 10,
    costMultiplier: 1.15, // 15% cost increase per level
    maxLevel: 1000,
    category: 'tapping'
  },
  
  auto_clicker: {
    name: 'Auto Clicker',
    description: 'Automatically generate coins per second',
    baseEffect: 1, // Coins per second per level
    baseCost: 100,
    costMultiplier: 1.20, // 20% cost increase per level
    maxLevel: 500,
    category: 'automation'
  },
  
  golden_tap_chance: {
    name: 'Golden Touch',
    description: 'Increase chance of Golden Taps',
    baseEffect: 0.001, // 0.1% additional chance per level
    baseCost: 1000,
    costMultiplier: 1.25, // 25% cost increase per level
    maxLevel: 100,
    category: 'special'
  },
  
  offline_earnings: {
    name: 'Offline Manager',
    description: 'Increase offline earnings duration',
    baseEffect: 0.5, // Additional hours per level
    baseCost: 5000,
    costMultiplier: 1.30, // 30% cost increase per level
    maxLevel: 20,
    category: 'automation'
  },
  
  prestige_multiplier: {
    name: 'Prestige Boost',
    description: 'Permanent multiplier for all earnings',
    baseEffect: 0.1, // 10% multiplier per level
    baseCost: 1, // Cost in prestige points
    costMultiplier: 1.5, // 50% cost increase per level
    maxLevel: 50,
    category: 'prestige',
    currency: 'prestige_points'
  }
};

// Achievement categories and their display properties
const ACHIEVEMENT_CATEGORIES = {
  tapping: {
    name: 'Tapping Master',
    icon: '👆',
    color: '#FFD700',
    description: 'Achievements related to tapping'
  },
  earnings: {
    name: 'Coin Collector',
    icon: '💰',
    color: '#32CD32',
    description: 'Achievements related to earning coins'
  },
  upgrades: {
    name: 'Upgrade Expert',
    icon: '⚡',
    color: '#FF6347',
    description: 'Achievements related to purchasing upgrades'
  },
  golden_taps: {
    name: 'Golden Touch',
    icon: '✨',
    color: '#FFD700',
    description: 'Achievements related to Golden Taps'
  },
  social: {
    name: 'Social Butterfly',
    icon: '👥',
    color: '#1E90FF',
    description: 'Achievements related to social features'
  },
  gifts: {
    name: 'Gift Giver',
    icon: '🎁',
    color: '#FF69B4',
    description: 'Achievements related to sending gifts'
  },
  streaks: {
    name: 'Consistent Player',
    icon: '🔥',
    color: '#FF4500',
    description: 'Achievements related to login streaks'
  },
  prestige: {
    name: 'Prestige Master',
    icon: '👑',
    color: '#9370DB',
    description: 'Achievements related to prestige system'
  },
  speed: {
    name: 'Speed Demon',
    icon: '⚡',
    color: '#FFFF00',
    description: 'Achievements related to tapping speed'
  },
  time: {
    name: 'Time Keeper',
    icon: '⏰',
    color: '#20B2AA',
    description: 'Achievements related to playing at specific times'
  },
  milestones: {
    name: 'Milestone Master',
    icon: '🏆',
    color: '#DAA520',
    description: 'Special milestone achievements'
  }
};

// Event types and their properties
const EVENT_TYPES = {
  weekend_multiplier: {
    name: 'Weekend Boost',
    icon: '🎉',
    color: '#FF6347',
    description: 'Special weekend multiplier events'
  },
  holiday_event: {
    name: 'Holiday Special',
    icon: '🎊',
    color: '#32CD32',
    description: 'Holiday-themed events with special bonuses'
  },
  promotional: {
    name: 'Promotional Event',
    icon: '📢',
    color: '#1E90FF',
    description: 'Promotional events for special occasions'
  },
  community_milestone: {
    name: 'Community Achievement',
    icon: '🌟',
    color: '#FFD700',
    description: 'Events triggered by community milestones'
  },
  flash_event: {
    name: 'Flash Event',
    icon: '⚡',
    color: '#FF69B4',
    description: 'Short-duration high-impact events'
  }
};

// Calculation formulas
const FORMULAS = {
  // Calculate upgrade cost based on level
  calculateUpgradeCost: (upgradeType, currentLevel) => {
    const config = UPGRADE_CONFIGS[upgradeType];
    if (!config) return 0;
    
    return Math.floor(config.baseCost * Math.pow(config.costMultiplier, currentLevel));
  },
  
  // Calculate upgrade effect based on level
  calculateUpgradeEffect: (upgradeType, level) => {
    const config = UPGRADE_CONFIGS[upgradeType];
    if (!config) return 0;
    
    return config.baseEffect * level;
  },
  
  // Calculate daily bonus based on streak
  calculateDailyBonus: (streakDay) => {
    const multiplier = Math.min(streakDay, GAME_CONFIG.MAX_STREAK_MULTIPLIER);
    return GAME_CONFIG.DAILY_BONUS_BASE_AMOUNT * multiplier;
  },
  
  // Calculate prestige points from lifetime coins
  calculatePrestigePoints: (lifetimeCoins) => {
    return Math.floor(lifetimeCoins * GAME_CONFIG.PRESTIGE_POINTS_RATIO);
  },
  
  // Calculate offline earnings
  calculateOfflineEarnings: (autoClickerRate, offlineHours) => {
    const cappedHours = Math.min(offlineHours, GAME_CONFIG.OFFLINE_EARNINGS_CAP_HOURS);
    return Math.floor(autoClickerRate * cappedHours * 3600); // Convert hours to seconds
  }
};

export {
  GAME_CONFIG,
  UPGRADE_CONFIGS,
  ACHIEVEMENT_CATEGORIES,
  EVENT_TYPES,
  FORMULAS
};