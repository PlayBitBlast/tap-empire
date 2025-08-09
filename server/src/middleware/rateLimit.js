const rateLimit = require('express-rate-limit');

/**
 * Create a rate limiting middleware with custom options
 * @param {Object} options - Rate limiting options
 * @returns {Function} Express middleware function
 */
const createRateLimit = (options = {}) => {
  const defaultOptions = {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: 'Too many requests',
      message: 'Rate limit exceeded, please try again later'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
      res.status(429).json(options.message || defaultOptions.message);
    }
  };

  return rateLimit({
    ...defaultOptions,
    ...options
  });
};

/**
 * Game action rate limiting (for taps, purchases, etc.)
 */
const gameActionRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 game actions per minute
  message: {
    success: false,
    error: 'Too many game actions',
    message: 'You are performing actions too quickly, please slow down'
  }
});

/**
 * Purchase rate limiting (for upgrade purchases)
 */
const purchaseRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 purchases per minute
  message: {
    success: false,
    error: 'Too many purchases',
    message: 'You are making purchases too quickly, please wait a moment'
  }
});

/**
 * API rate limiting (general API calls)
 */
const apiRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 API calls per minute
  message: {
    success: false,
    error: 'API rate limit exceeded',
    message: 'Too many API requests, please try again later'
  }
});

/**
 * Strict rate limiting (for sensitive operations)
 */
const strictRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    success: false,
    error: 'Strict rate limit exceeded',
    message: 'This action is rate limited, please wait before trying again'
  }
});

module.exports = {
  createRateLimit,
  gameActionRateLimit,
  purchaseRateLimit,
  apiRateLimit,
  strictRateLimit
};