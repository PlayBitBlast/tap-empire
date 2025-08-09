/**
 * Error logging routes
 */

const express = require('express');
const router = express.Router();
const ServerErrorHandler = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Log client-side errors
 */
router.post('/log', ServerErrorHandler.asyncHandler(async (req, res) => {
  const {
    timestamp,
    error,
    context,
    userAgent,
    url,
    userId
  } = req.body;

  // Validate required fields
  if (!error || !error.type) {
    throw ServerErrorHandler.validationError('Error type is required');
  }

  // Log the client error
  logger.error('Client-side error:', {
    clientTimestamp: timestamp,
    error,
    context,
    userAgent,
    clientUrl: url,
    userId: userId || req.user?.id,
    serverTimestamp: new Date().toISOString(),
    ip: req.ip
  });

  // Send to monitoring if critical
  if (error.type === 'AUTH_ERROR' || error.type === 'INVALID_STATE') {
    ServerErrorHandler.logError(error, {
      source: 'client',
      userId: userId || req.user?.id,
      context
    });
  }

  res.json({
    success: true,
    message: 'Error logged successfully'
  });
}));

/**
 * Get error statistics (admin only)
 */
router.get('/stats', ServerErrorHandler.asyncHandler(async (req, res) => {
  // This would typically require admin authentication
  // For now, just return mock data
  
  const stats = {
    totalErrors: 0,
    errorsByType: {},
    errorsByHour: {},
    criticalErrors: 0,
    lastUpdated: new Date().toISOString()
  };

  res.json({
    success: true,
    data: stats
  });
}));

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;