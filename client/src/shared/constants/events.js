// WebSocket event constants for Tap Empire
// This is a copy of the shared/constants/events.js file for client-side use

const SOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  RECONNECT: 'reconnect',
  
  // Authentication events
  AUTH_REQUEST: 'auth:request',
  AUTH_SUCCESS: 'auth:success',
  AUTH_FAILED: 'auth:failed',
  
  // Game state events
  GAME_STATE_REQUEST: 'game:state_request',
  GAME_STATE_UPDATE: 'game:state_update',
  GAME_SYNC: 'game:sync',
  GAME_SYNC_RESPONSE: 'game:sync_response',
  
  // Tap events
  TAP_ACTION: 'tap:action',
  TAP_RESULT: 'tap:result',
  TAP_RATE_LIMITED: 'tap:rate_limited',
  
  // Upgrade events
  UPGRADE_PURCHASE: 'upgrade:purchase',
  UPGRADE_SUCCESS: 'upgrade:success',
  UPGRADE_FAILED: 'upgrade:failed',
  
  // Social events
  FRIEND_LIST_REQUEST: 'social:friend_list_request',
  FRIEND_LIST_UPDATE: 'social:friend_list_update',
  GIFT_SEND: 'social:gift_send',
  GIFT_RECEIVE: 'social:gift_receive',
  GIFT_NOTIFICATION: 'social:gift_notification',
  
  // Leaderboard events
  LEADERBOARD_REQUEST: 'leaderboard:request',
  LEADERBOARD_UPDATE: 'leaderboard:update',
  RANK_CHANGE: 'leaderboard:rank_change',
  
  // Achievement events
  ACHIEVEMENT_UNLOCK: 'achievement:unlock',
  ACHIEVEMENT_PROGRESS: 'achievement:progress',
  
  // Prestige events
  PRESTIGE_REQUEST: 'prestige:request',
  PRESTIGE_SUCCESS: 'prestige:success',
  PRESTIGE_FAILED: 'prestige:failed',
  
  // Event system
  EVENT_START: 'event:start',
  EVENT_END: 'event:end',
  EVENT_UPDATE: 'event:update',
  
  // Daily bonus events
  DAILY_BONUS_CLAIM: 'daily:bonus_claim',
  DAILY_BONUS_AVAILABLE: 'daily:bonus_available',
  STREAK_UPDATE: 'daily:streak_update',
  
  // Offline progress events
  OFFLINE_PROGRESS_REQUEST: 'offline:progress_request',
  OFFLINE_PROGRESS_RESULT: 'offline:progress_result',
  
  // Error events
  ERROR: 'error',
  VALIDATION_ERROR: 'error:validation',
  RATE_LIMIT_ERROR: 'error:rate_limit',
  SERVER_ERROR: 'error:server',
  
  // Admin events (for debugging/monitoring)
  ADMIN_BROADCAST: 'admin:broadcast',
  ADMIN_USER_UPDATE: 'admin:user_update',
  ADMIN_EVENT_TRIGGER: 'admin:event_trigger'
};

// Event categories for easier management
const EVENT_CATEGORIES = {
  CONNECTION: [
    SOCKET_EVENTS.CONNECT,
    SOCKET_EVENTS.DISCONNECT,
    SOCKET_EVENTS.RECONNECT
  ],
  
  AUTHENTICATION: [
    SOCKET_EVENTS.AUTH_REQUEST,
    SOCKET_EVENTS.AUTH_SUCCESS,
    SOCKET_EVENTS.AUTH_FAILED
  ],
  
  GAME_CORE: [
    SOCKET_EVENTS.GAME_STATE_REQUEST,
    SOCKET_EVENTS.GAME_STATE_UPDATE,
    SOCKET_EVENTS.GAME_SYNC,
    SOCKET_EVENTS.GAME_SYNC_RESPONSE,
    SOCKET_EVENTS.TAP_ACTION,
    SOCKET_EVENTS.TAP_RESULT
  ],
  
  SOCIAL: [
    SOCKET_EVENTS.FRIEND_LIST_REQUEST,
    SOCKET_EVENTS.FRIEND_LIST_UPDATE,
    SOCKET_EVENTS.GIFT_SEND,
    SOCKET_EVENTS.GIFT_RECEIVE,
    SOCKET_EVENTS.GIFT_NOTIFICATION
  ],
  
  PROGRESSION: [
    SOCKET_EVENTS.UPGRADE_PURCHASE,
    SOCKET_EVENTS.ACHIEVEMENT_UNLOCK,
    SOCKET_EVENTS.PRESTIGE_REQUEST,
    SOCKET_EVENTS.DAILY_BONUS_CLAIM
  ],
  
  ERRORS: [
    SOCKET_EVENTS.ERROR,
    SOCKET_EVENTS.VALIDATION_ERROR,
    SOCKET_EVENTS.RATE_LIMIT_ERROR,
    SOCKET_EVENTS.SERVER_ERROR,
    SOCKET_EVENTS.TAP_RATE_LIMITED
  ]
};

export {
  SOCKET_EVENTS,
  EVENT_CATEGORIES
};