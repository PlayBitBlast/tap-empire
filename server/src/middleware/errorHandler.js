/**
 * Centralized error handling middleware for the server
 */

const logger = require('../utils/logger');

class ServerErrorHandler {
  /**
   * Express error handling middleware
   */
  static errorMiddleware(error, req, res, next) {
    // Log the error
    logger.error('Server error:', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });

    // Handle different error types
    if (error.type === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        code: 'VALIDATION_FAILED',
        details: error.details || error.message
      });
    }

    if (error.type === 'AuthenticationError') {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (error.type === 'AuthorizationError') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    if (error.type === 'RateLimitError') {
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        code: 'RATE_LIMITED',
        retryAfter: error.retryAfter || 60000
      });
    }

    if (error.type === 'GameStateError') {
      return res.status(409).json({
        success: false,
        error: 'Invalid game state',
        code: 'INVALID_STATE',
        correction: error.correctState
      });
    }

    if (error.type === 'DatabaseError') {
      return res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable',
        code: 'SERVICE_UNAVAILABLE'
      });
    }

    if (error.type === 'NetworkError') {
      return res.status(502).json({
        success: false,
        error: 'Network error',
        code: 'NETWORK_ERROR'
      });
    }

    // Handle specific HTTP status codes
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        error: error.message || 'Request failed',
        code: error.code || 'REQUEST_FAILED'
      });
    }

    // Default to 500 for unhandled errors
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV === 'development' && {
        details: error.message,
        stack: error.stack
      })
    });
  }

  /**
   * Handle async route errors
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Create custom error types
   */
  static createError(type, message, details = {}) {
    const error = new Error(message);
    error.type = type;
    Object.assign(error, details);
    return error;
  }

  /**
   * Validation error helper
   */
  static validationError(message, details) {
    return this.createError('ValidationError', message, { details });
  }

  /**
   * Authentication error helper
   */
  static authError(message = 'Authentication required') {
    return this.createError('AuthenticationError', message);
  }

  /**
   * Authorization error helper
   */
  static authzError(message = 'Access denied') {
    return this.createError('AuthorizationError', message);
  }

  /**
   * Rate limit error helper
   */
  static rateLimitError(message = 'Too many requests', retryAfter = 60000) {
    return this.createError('RateLimitError', message, { retryAfter });
  }

  /**
   * Game state error helper
   */
  static gameStateError(message, correctState) {
    return this.createError('GameStateError', message, { correctState });
  }

  /**
   * Database error helper
   */
  static databaseError(message = 'Database operation failed', originalError) {
    return this.createError('DatabaseError', message, { originalError });
  }

  /**
   * Network error helper
   */
  static networkError(message = 'Network operation failed', originalError) {
    return this.createError('NetworkError', message, { originalError });
  }

  /**
   * Handle database connection errors
   */
  static handleDatabaseError(error, operation = 'database operation') {
    logger.error(`Database error during ${operation}:`, error);

    if (error.code === 'ECONNREFUSED') {
      throw this.databaseError('Database connection refused', error);
    }

    if (error.code === 'ETIMEDOUT') {
      throw this.databaseError('Database operation timed out', error);
    }

    if (error.code === '23505') { // Unique constraint violation
      throw this.validationError('Duplicate entry', error.detail);
    }

    if (error.code === '23503') { // Foreign key constraint violation
      throw this.validationError('Invalid reference', error.detail);
    }

    if (error.code === '23502') { // Not null constraint violation
      throw this.validationError('Required field missing', error.detail);
    }

    // Generic database error
    throw this.databaseError(`Failed to ${operation}`, error);
  }

  /**
   * Handle Redis connection errors
   */
  static handleRedisError(error, operation = 'cache operation') {
    logger.error(`Redis error during ${operation}:`, error);

    if (error.code === 'ECONNREFUSED') {
      // Redis is down, continue without cache
      logger.warn('Redis unavailable, continuing without cache');
      return null;
    }

    if (error.code === 'ETIMEDOUT') {
      logger.warn('Redis timeout, continuing without cache');
      return null;
    }

    // For other Redis errors, log but don't fail the request
    logger.warn(`Redis error during ${operation}, continuing without cache:`, error);
    return null;
  }

  /**
   * Handle WebSocket errors
   */
  static handleSocketError(socket, error, context = {}) {
    logger.error('WebSocket error:', {
      error: error.message,
      socketId: socket.id,
      userId: socket.userId,
      context,
      timestamp: new Date().toISOString()
    });

    // Send error to client
    socket.emit('error', {
      type: error.type || 'SOCKET_ERROR',
      code: error.code || 'SOCKET_ERROR',
      message: this.getUserFriendlyMessage(error),
      timestamp: Date.now()
    });
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error) {
    const friendlyMessages = {
      'ValidationError': 'Invalid data provided',
      'VALIDATION_ERROR': 'Invalid data provided',
      'AuthenticationError': 'Please log in again',
      'AuthorizationError': 'You don\'t have permission for this action',
      'RateLimitError': 'You\'re doing that too fast. Please slow down.',
      'GameStateError': 'Game state was corrected',
      'DatabaseError': 'Service temporarily unavailable',
      'NetworkError': 'Connection problem. Please try again.',
      'ECONNREFUSED': 'Service temporarily unavailable',
      'ETIMEDOUT': 'Request timed out. Please try again.',
      'ENOTFOUND': 'Service not available'
    };

    return friendlyMessages[error.type] || 
           friendlyMessages[error.code] || 
           'Something went wrong. Please try again.';
  }

  /**
   * Log error for monitoring
   */
  static logError(error, context = {}) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      error: {
        type: error.type,
        code: error.code,
        message: error.message,
        stack: error.stack
      },
      context,
      severity: this.getErrorSeverity(error)
    };

    // Log based on severity
    if (errorLog.severity === 'critical') {
      logger.error('CRITICAL ERROR:', errorLog);
      // Send to monitoring service
      this.sendToMonitoring(errorLog);
    } else if (errorLog.severity === 'high') {
      logger.error('HIGH SEVERITY ERROR:', errorLog);
    } else {
      logger.warn('ERROR:', errorLog);
    }
  }

  /**
   * Determine error severity
   */
  static getErrorSeverity(error) {
    const criticalErrors = [
      'DatabaseError',
      'AuthenticationError',
      'GameStateError'
    ];

    const highSeverityErrors = [
      'ValidationError',
      'RateLimitError',
      'NetworkError'
    ];

    if (criticalErrors.includes(error.type)) {
      return 'critical';
    }

    if (highSeverityErrors.includes(error.type)) {
      return 'high';
    }

    return 'medium';
  }

  /**
   * Send critical errors to monitoring service
   */
  static async sendToMonitoring(errorLog) {
    try {
      // Implement your monitoring service integration here
      // For example: Sentry, DataDog, New Relic, etc.
      
      // Example with a generic HTTP endpoint:
      // await fetch('/api/monitoring/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorLog)
      // });
      
      console.log('Would send to monitoring:', errorLog);
    } catch (monitoringError) {
      logger.error('Failed to send error to monitoring:', monitoringError);
    }
  }

  /**
   * Health check error handler
   */
  static handleHealthCheckError(service, error) {
    logger.error(`Health check failed for ${service}:`, error);
    
    return {
      service,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Graceful shutdown error handler
   */
  static handleShutdownError(error) {
    logger.error('Error during graceful shutdown:', error);
    
    // Force exit after timeout
    setTimeout(() => {
      process.exit(1);
    }, 5000);
  }
}

module.exports = ServerErrorHandler;