// Shared validation utilities for Tap Empire
// Used by both client and server to ensure data consistency

const { GAME_CONFIG, UPGRADE_CONFIGS } = require('../constants/gameConfig');
const { ERROR_CODES } = require('../constants/events');

/**
 * Validate user input data
 * @param {Object} data - Data to validate
 * @param {Object} schema - Validation schema
 * @returns {Object} Validation result with success flag and errors
 */
function validateInput(data, schema) {
  const errors = [];
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    // Check required fields
    if (rules.required && (value === undefined || value === null)) {
      errors.push({
        field,
        code: ERROR_CODES.VALIDATION_MISSING_REQUIRED_FIELD,
        message: `Field '${field}' is required`
      });
      continue;
    }
    
    // Skip validation if field is not provided and not required
    if (value === undefined || value === null) continue;
    
    // Type validation
    if (rules.type && typeof value !== rules.type) {
      errors.push({
        field,
        code: ERROR_CODES.VALIDATION_INVALID_DATA,
        message: `Field '${field}' must be of type ${rules.type}`
      });
      continue;
    }
    
    // Range validation for numbers
    if (rules.type === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push({
          field,
          code: ERROR_CODES.VALIDATION_FIELD_OUT_OF_RANGE,
          message: `Field '${field}' must be at least ${rules.min}`
        });
      }
      
      if (rules.max !== undefined && value > rules.max) {
        errors.push({
          field,
          code: ERROR_CODES.VALIDATION_FIELD_OUT_OF_RANGE,
          message: `Field '${field}' must be at most ${rules.max}`
        });
      }
    }
    
    // String length validation
    if (rules.type === 'string') {
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        errors.push({
          field,
          code: ERROR_CODES.VALIDATION_FIELD_OUT_OF_RANGE,
          message: `Field '${field}' must be at least ${rules.minLength} characters`
        });
      }
      
      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        errors.push({
          field,
          code: ERROR_CODES.VALIDATION_FIELD_OUT_OF_RANGE,
          message: `Field '${field}' must be at most ${rules.maxLength} characters`
        });
      }
    }
    
    // Array validation
    if (rules.type === 'array') {
      if (!Array.isArray(value)) {
        errors.push({
          field,
          code: ERROR_CODES.VALIDATION_INVALID_DATA,
          message: `Field '${field}' must be an array`
        });
        continue;
      }
      
      if (rules.maxItems !== undefined && value.length > rules.maxItems) {
        errors.push({
          field,
          code: ERROR_CODES.VALIDATION_FIELD_OUT_OF_RANGE,
          message: `Field '${field}' must have at most ${rules.maxItems} items`
        });
      }
    }
    
    // Custom validation function
    if (rules.validate && typeof rules.validate === 'function') {
      const customResult = rules.validate(value);
      if (customResult !== true) {
        errors.push({
          field,
          code: ERROR_CODES.VALIDATION_INVALID_DATA,
          message: customResult || `Field '${field}' failed custom validation`
        });
      }
    }
  }
  
  return {
    success: errors.length === 0,
    errors
  };
}

/**
 * Validate tap event data
 * @param {Object} tapData - Tap event data
 * @returns {Object} Validation result
 */
function validateTapEvent(tapData) {
  const schema = {
    timestamp: {
      type: 'number',
      required: true,
      min: Date.now() - 60000, // Not older than 1 minute
      max: Date.now() + 5000    // Not more than 5 seconds in future
    },
    tapCount: {
      type: 'number',
      required: false,
      min: 1,
      max: GAME_CONFIG.MAX_TAPS_PER_SECOND
    },
    clientChecksum: {
      type: 'string',
      required: false,
      minLength: 1,
      maxLength: 100
    }
  };
  
  return validateInput(tapData, schema);
}

/**
 * Validate upgrade purchase data
 * @param {Object} upgradeData - Upgrade purchase data
 * @returns {Object} Validation result
 */
function validateUpgradeEvent(upgradeData) {
  const schema = {
    upgradeType: {
      type: 'string',
      required: true,
      validate: (value) => {
        if (!UPGRADE_CONFIGS[value]) {
          return `Invalid upgrade type: ${value}`;
        }
        return true;
      }
    },
    quantity: {
      type: 'number',
      required: false,
      min: 1,
      max: 100 // Prevent bulk purchases that might cause issues
    }
  };
  
  return validateInput(upgradeData, schema);
}

/**
 * Validate gift sending data
 * @param {Object} giftData - Gift data
 * @returns {Object} Validation result
 */
function validateGiftEvent(giftData) {
  const schema = {
    receiverId: {
      type: 'number',
      required: true,
      min: 1
    },
    amount: {
      type: 'number',
      required: true,
      min: GAME_CONFIG.MIN_GIFT_AMOUNT,
      max: GAME_CONFIG.MAX_GIFT_AMOUNT
    },
    message: {
      type: 'string',
      required: false,
      maxLength: 100,
      validate: (value) => {
        // Basic profanity filter (in production, use a proper filter)
        const profanityWords = ['spam', 'scam', 'hack'];
        const lowerValue = value.toLowerCase();
        for (const word of profanityWords) {
          if (lowerValue.includes(word)) {
            return 'Message contains inappropriate content';
          }
        }
        return true;
      }
    }
  };
  
  return validateInput(giftData, schema);
}

/**
 * Validate user state for consistency
 * @param {Object} userState - User's game state
 * @returns {Object} Validation result
 */
function validateUserState(userState) {
  const errors = [];
  
  // Basic sanity checks
  if (userState.coins < 0) {
    errors.push({
      field: 'coins',
      code: ERROR_CODES.VALIDATION_INVALID_DATA,
      message: 'Coins cannot be negative'
    });
  }
  
  if (userState.total_coins_earned < userState.coins) {
    errors.push({
      field: 'total_coins_earned',
      code: ERROR_CODES.VALIDATION_INVALID_DATA,
      message: 'Total coins earned cannot be less than current coins'
    });
  }
  
  if (userState.coins_per_tap < 1) {
    errors.push({
      field: 'coins_per_tap',
      code: ERROR_CODES.VALIDATION_INVALID_DATA,
      message: 'Coins per tap must be at least 1'
    });
  }
  
  if (userState.auto_clicker_rate < 0) {
    errors.push({
      field: 'auto_clicker_rate',
      code: ERROR_CODES.VALIDATION_INVALID_DATA,
      message: 'Auto clicker rate cannot be negative'
    });
  }
  
  if (userState.login_streak < 0) {
    errors.push({
      field: 'login_streak',
      code: ERROR_CODES.VALIDATION_INVALID_DATA,
      message: 'Login streak cannot be negative'
    });
  }
  
  if (userState.prestige_level < 0) {
    errors.push({
      field: 'prestige_level',
      code: ERROR_CODES.VALIDATION_INVALID_DATA,
      message: 'Prestige level cannot be negative'
    });
  }
  
  // Validate upgrade levels
  if (userState.upgrades) {
    for (const [upgradeType, level] of Object.entries(userState.upgrades)) {
      const config = UPGRADE_CONFIGS[upgradeType];
      if (!config) {
        errors.push({
          field: `upgrades.${upgradeType}`,
          code: ERROR_CODES.VALIDATION_INVALID_DATA,
          message: `Invalid upgrade type: ${upgradeType}`
        });
        continue;
      }
      
      if (level < 0) {
        errors.push({
          field: `upgrades.${upgradeType}`,
          code: ERROR_CODES.VALIDATION_INVALID_DATA,
          message: `Upgrade level cannot be negative`
        });
      }
      
      if (level > config.maxLevel) {
        errors.push({
          field: `upgrades.${upgradeType}`,
          code: ERROR_CODES.VALIDATION_INVALID_DATA,
          message: `Upgrade level exceeds maximum (${config.maxLevel})`
        });
      }
    }
  }
  
  return {
    success: errors.length === 0,
    errors
  };
}

/**
 * Validate Telegram user data
 * @param {Object} telegramUser - Telegram user data
 * @returns {Object} Validation result
 */
function validateTelegramUser(telegramUser) {
  const schema = {
    id: {
      type: 'number',
      required: true,
      min: 1
    },
    first_name: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 255
    },
    last_name: {
      type: 'string',
      required: false,
      maxLength: 255
    },
    username: {
      type: 'string',
      required: false,
      minLength: 1,
      maxLength: 255,
      validate: (value) => {
        // Username should only contain alphanumeric characters and underscores
        if (!/^[a-zA-Z0-9_]+$/.test(value)) {
          return 'Username contains invalid characters';
        }
        return true;
      }
    }
  };
  
  return validateInput(telegramUser, schema);
}

/**
 * Sanitize user input to prevent XSS and injection attacks
 * @param {string} input - User input string
 * @returns {string} Sanitized string
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .trim()
    .substring(0, 1000); // Limit length
}

/**
 * Validate rate limiting data
 * @param {Array} timestamps - Array of recent action timestamps
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} maxActions - Maximum actions allowed in window
 * @returns {boolean} True if within rate limits
 */
function validateRateLimit(timestamps, windowMs, maxActions) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  const actionsInWindow = timestamps.filter(timestamp => timestamp > windowStart);
  
  return actionsInWindow.length <= maxActions;
}

/**
 * Validate leaderboard request
 * @param {Object} requestData - Leaderboard request data
 * @returns {Object} Validation result
 */
function validateLeaderboardRequest(requestData) {
  const schema = {
    type: {
      type: 'string',
      required: true,
      validate: (value) => {
        const validTypes = ['daily', 'weekly', 'all_time'];
        if (!validTypes.includes(value)) {
          return `Invalid leaderboard type. Must be one of: ${validTypes.join(', ')}`;
        }
        return true;
      }
    },
    limit: {
      type: 'number',
      required: false,
      min: 1,
      max: GAME_CONFIG.LEADERBOARD_TOP_COUNT
    },
    offset: {
      type: 'number',
      required: false,
      min: 0,
      max: 10000 // Reasonable pagination limit
    }
  };
  
  return validateInput(requestData, schema);
}

module.exports = {
  validateInput,
  validateTapEvent,
  validateUpgradeEvent,
  validateGiftEvent,
  validateUserState,
  validateTelegramUser,
  sanitizeInput,
  validateRateLimit,
  validateLeaderboardRequest
};