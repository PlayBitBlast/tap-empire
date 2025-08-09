// WebSocket event names for Tap Empire
// Centralized event definitions to ensure consistency between client and server

const SOCKET_EVENTS = {
  // Connection events
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  WELCOME: 'welcome',
  
  // Authentication events
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_SUCCESS: 'auth:success',
  AUTH_ERROR: 'auth:error',
  
  // Game action events
  GAME_TAP: 'game:tap',
  GAME_TAP_RESULT: 'game:tap_result',
  GAME_UPGRADE: 'game:upgrade',
  GAME_UPGRADE_RESULT: 'game:upgrade_result',
  GAME_PRESTIGE: 'game:prestige',
  GAME_PRESTIGE_RESULT: 'game:prestige_result',
  
  // Synchronization events
  GAME_SYNC: 'game:sync',
  GAME_SYNC_RESULT: 'game:sync_result',
  GAME_STATE_UPDATE: 'game:state_update',
  GAME_FORCE_SYNC: 'game:force_sync',
  
  // Social events
  SOCIAL_FRIEND_LIST: 'social:friend_list',
  SOCIAL_FRIEND_UPDATE: 'social:friend_update',
  SOCIAL_SEND_GIFT: 'social:send_gift',
  SOCIAL_GIFT_RECEIVED: 'social:gift_received',
  SOCIAL_GIFT_CLAIMED: 'social:gift_claimed',
  
  // Leaderboard events
  LEADERBOARD_UPDATE: 'leaderboard:update',
  LEADERBOARD_RANK_CHANGE: 'leaderboard:rank_change',
  LEADERBOARD_REQUEST: 'leaderboard:request',
  LEADERBOARD_DATA: 'leaderboard:data',
  
  // Achievement events
  ACHIEVEMENT_UNLOCKED: 'achievement:unlocked',
  ACHIEVEMENT_PROGRESS: 'achievement:progress',
  ACHIEVEMENT_LIST: 'achievement:list',
  
  // Event system events
  EVENT_STARTED: 'event:started',
  EVENT_ENDED: 'event:ended',
  EVENT_UPDATE: 'event:update',
  EVENT_NOTIFICATION: 'event:notification',
  
  // Daily bonus events
  DAILY_BONUS_AVAILABLE: 'daily:bonus_available',
  DAILY_BONUS_CLAIMED: 'daily:bonus_claimed',
  DAILY_STREAK_UPDATE: 'daily:streak_update',
  
  // Offline progress events
  OFFLINE_EARNINGS_CALCULATED: 'offline:earnings_calculated',
  OFFLINE_PROGRESS_CLAIMED: 'offline:progress_claimed',
  
  // Anti-cheat and validation events
  VALIDATION_ERROR: 'validation:error',
  RATE_LIMIT_EXCEEDED: 'rate_limit:exceeded',
  SUSPICIOUS_ACTIVITY: 'security:suspicious_activity',
  ACCOUNT_FLAGGED: 'security:account_flagged',
  
  // System events
  SYSTEM_MAINTENANCE: 'system:maintenance',
  SYSTEM_ANNOUNCEMENT: 'system:announcement',
  SYSTEM_ERROR: 'system:error',
  
  // Room/Channel events for multiplayer features
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_UPDATE: 'room:update',
  ROOM_MESSAGE: 'room:message'
};

// Event data structures and validation schemas
const EVENT_SCHEMAS = {
  // Game tap event data
  GAME_TAP: {
    timestamp: 'number', // Client timestamp
    tapCount: 'number', // Number of taps in this batch
    clientChecksum: 'string' // Client-side validation checksum
  },
  
  // Game upgrade event data
  GAME_UPGRADE: {
    upgradeType: 'string', // Type of upgrade (tap_multiplier, auto_clicker, etc.)
    quantity: 'number' // Number of upgrades to purchase (default: 1)
  },
  
  // Sync event data
  GAME_SYNC: {
    operations: 'array', // Array of game operations to sync
    timestamp: 'number', // Client timestamp
    checksum: 'string' // Client state checksum
  },
  
  // Social gift event data
  SOCIAL_SEND_GIFT: {
    receiverId: 'number', // User ID of gift receiver
    amount: 'number', // Amount of coins to gift
    message: 'string' // Optional message (max 100 chars)
  },
  
  // Leaderboard request data
  LEADERBOARD_REQUEST: {
    type: 'string', // 'daily', 'weekly', 'all_time'
    limit: 'number', // Number of entries to return (max 100)
    offset: 'number' // Pagination offset
  }
};

// Error codes for event responses
const ERROR_CODES = {
  // Authentication errors
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',
  
  // Game logic errors
  GAME_INSUFFICIENT_COINS: 'GAME_INSUFFICIENT_COINS',
  GAME_INVALID_UPGRADE: 'GAME_INVALID_UPGRADE',
  GAME_MAX_LEVEL_REACHED: 'GAME_MAX_LEVEL_REACHED',
  GAME_PRESTIGE_NOT_AVAILABLE: 'GAME_PRESTIGE_NOT_AVAILABLE',
  
  // Validation errors
  VALIDATION_INVALID_DATA: 'VALIDATION_INVALID_DATA',
  VALIDATION_MISSING_REQUIRED_FIELD: 'VALIDATION_MISSING_REQUIRED_FIELD',
  VALIDATION_FIELD_OUT_OF_RANGE: 'VALIDATION_FIELD_OUT_OF_RANGE',
  
  // Rate limiting errors
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  RATE_LIMIT_TAP_TOO_FAST: 'RATE_LIMIT_TAP_TOO_FAST',
  RATE_LIMIT_API_QUOTA_EXCEEDED: 'RATE_LIMIT_API_QUOTA_EXCEEDED',
  
  // Social feature errors
  SOCIAL_FRIEND_NOT_FOUND: 'SOCIAL_FRIEND_NOT_FOUND',
  SOCIAL_GIFT_LIMIT_EXCEEDED: 'SOCIAL_GIFT_LIMIT_EXCEEDED',
  SOCIAL_CANNOT_GIFT_SELF: 'SOCIAL_CANNOT_GIFT_SELF',
  SOCIAL_GIFT_ALREADY_CLAIMED: 'SOCIAL_GIFT_ALREADY_CLAIMED',
  
  // System errors
  SYSTEM_DATABASE_ERROR: 'SYSTEM_DATABASE_ERROR',
  SYSTEM_REDIS_ERROR: 'SYSTEM_REDIS_ERROR',
  SYSTEM_INTERNAL_ERROR: 'SYSTEM_INTERNAL_ERROR',
  SYSTEM_MAINTENANCE_MODE: 'SYSTEM_MAINTENANCE_MODE',
  
  // Security errors
  SECURITY_SUSPICIOUS_ACTIVITY: 'SECURITY_SUSPICIOUS_ACTIVITY',
  SECURITY_ACCOUNT_BANNED: 'SECURITY_ACCOUNT_BANNED',
  SECURITY_INVALID_CHECKSUM: 'SECURITY_INVALID_CHECKSUM'
};

// Success response codes
const SUCCESS_CODES = {
  GAME_TAP_SUCCESS: 'GAME_TAP_SUCCESS',
  GAME_UPGRADE_SUCCESS: 'GAME_UPGRADE_SUCCESS',
  GAME_PRESTIGE_SUCCESS: 'GAME_PRESTIGE_SUCCESS',
  GAME_SYNC_SUCCESS: 'GAME_SYNC_SUCCESS',
  SOCIAL_GIFT_SENT: 'SOCIAL_GIFT_SENT',
  SOCIAL_GIFT_CLAIMED: 'SOCIAL_GIFT_CLAIMED',
  ACHIEVEMENT_UNLOCKED: 'ACHIEVEMENT_UNLOCKED',
  DAILY_BONUS_CLAIMED: 'DAILY_BONUS_CLAIMED'
};

// Event priorities for handling order
const EVENT_PRIORITIES = {
  HIGH: 1,    // Critical game actions (taps, purchases)
  MEDIUM: 2,  // Social interactions, achievements
  LOW: 3      // UI updates, notifications
};

// Map events to their priorities
const EVENT_PRIORITY_MAP = {
  [SOCKET_EVENTS.GAME_TAP]: EVENT_PRIORITIES.HIGH,
  [SOCKET_EVENTS.GAME_UPGRADE]: EVENT_PRIORITIES.HIGH,
  [SOCKET_EVENTS.GAME_PRESTIGE]: EVENT_PRIORITIES.HIGH,
  [SOCKET_EVENTS.GAME_SYNC]: EVENT_PRIORITIES.HIGH,
  
  [SOCKET_EVENTS.SOCIAL_SEND_GIFT]: EVENT_PRIORITIES.MEDIUM,
  [SOCKET_EVENTS.ACHIEVEMENT_UNLOCKED]: EVENT_PRIORITIES.MEDIUM,
  [SOCKET_EVENTS.DAILY_BONUS_CLAIMED]: EVENT_PRIORITIES.MEDIUM,
  
  [SOCKET_EVENTS.LEADERBOARD_UPDATE]: EVENT_PRIORITIES.LOW,
  [SOCKET_EVENTS.SYSTEM_ANNOUNCEMENT]: EVENT_PRIORITIES.LOW
};

module.exports = {
  SOCKET_EVENTS,
  EVENT_SCHEMAS,
  ERROR_CODES,
  SUCCESS_CODES,
  EVENT_PRIORITIES,
  EVENT_PRIORITY_MAP
};