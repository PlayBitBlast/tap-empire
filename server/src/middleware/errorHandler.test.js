/**
 * Tests for the ServerErrorHandler middleware
 */

const ServerErrorHandler = require('./errorHandler');

// Mock logger
jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
}));

describe('ServerErrorHandler', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      url: '/api/test',
      method: 'POST',
      user: { id: 'user123' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('errorMiddleware', () => {
    it('should handle ValidationError', () => {
      const error = {
        type: 'ValidationError',
        message: 'Invalid data',
        details: 'Missing required field'
      };

      ServerErrorHandler.errorMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid request data',
        code: 'VALIDATION_FAILED',
        details: 'Missing required field'
      });
    });

    it('should handle AuthenticationError', () => {
      const error = {
        type: 'AuthenticationError',
        message: 'Token expired'
      };

      ServerErrorHandler.errorMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    });

    it('should handle RateLimitError', () => {
      const error = {
        type: 'RateLimitError',
        message: 'Too many requests',
        retryAfter: 60000
      };

      ServerErrorHandler.errorMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Too many requests',
        code: 'RATE_LIMITED',
        retryAfter: 60000
      });
    });

    it('should handle GameStateError', () => {
      const error = {
        type: 'GameStateError',
        message: 'Invalid state',
        correctState: { coins: 100 }
      };

      ServerErrorHandler.errorMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid game state',
        code: 'INVALID_STATE',
        correction: { coins: 100 }
      });
    });

    it('should handle DatabaseError', () => {
      const error = {
        type: 'DatabaseError',
        message: 'Connection failed'
      };

      ServerErrorHandler.errorMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Service temporarily unavailable',
        code: 'SERVICE_UNAVAILABLE'
      });
    });

    it('should handle generic errors', () => {
      const error = new Error('Something went wrong');

      ServerErrorHandler.errorMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    });

    it('should include debug info in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      ServerErrorHandler.errorMiddleware(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: 'Test error',
          stack: 'Error stack trace'
        })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('asyncHandler', () => {
    it('should handle successful async operations', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = ServerErrorHandler.asyncHandler(asyncFn);

      await wrappedFn(req, res, next);

      expect(asyncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    it('should catch and forward async errors', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = ServerErrorHandler.asyncHandler(asyncFn);

      await wrappedFn(req, res, next);

      expect(asyncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('error creation helpers', () => {
    it('should create validation errors', () => {
      const error = ServerErrorHandler.validationError('Invalid input', { field: 'email' });

      expect(error.type).toBe('ValidationError');
      expect(error.message).toBe('Invalid input');
      expect(error.details).toEqual({ field: 'email' });
    });

    it('should create authentication errors', () => {
      const error = ServerErrorHandler.authError('Token invalid');

      expect(error.type).toBe('AuthenticationError');
      expect(error.message).toBe('Token invalid');
    });

    it('should create rate limit errors', () => {
      const error = ServerErrorHandler.rateLimitError('Too fast', 30000);

      expect(error.type).toBe('RateLimitError');
      expect(error.message).toBe('Too fast');
      expect(error.retryAfter).toBe(30000);
    });

    it('should create game state errors', () => {
      const correctState = { coins: 100 };
      const error = ServerErrorHandler.gameStateError('Invalid state', correctState);

      expect(error.type).toBe('GameStateError');
      expect(error.message).toBe('Invalid state');
      expect(error.correctState).toEqual(correctState);
    });
  });

  describe('handleDatabaseError', () => {
    it('should handle connection refused errors', () => {
      const dbError = { code: 'ECONNREFUSED', message: 'Connection refused' };

      expect(() => {
        ServerErrorHandler.handleDatabaseError(dbError, 'user lookup');
      }).toThrow('Database connection refused');
    });

    it('should handle timeout errors', () => {
      const dbError = { code: 'ETIMEDOUT', message: 'Timeout' };

      expect(() => {
        ServerErrorHandler.handleDatabaseError(dbError, 'user update');
      }).toThrow('Database operation timed out');
    });

    it('should handle unique constraint violations', () => {
      const dbError = { 
        code: '23505', 
        detail: 'Key (email)=(test@test.com) already exists.' 
      };

      expect(() => {
        ServerErrorHandler.handleDatabaseError(dbError, 'user creation');
      }).toThrow('Duplicate entry');
    });

    it('should handle foreign key constraint violations', () => {
      const dbError = { 
        code: '23503', 
        detail: 'Key (user_id)=(123) is not present in table "users".' 
      };

      expect(() => {
        ServerErrorHandler.handleDatabaseError(dbError, 'upgrade purchase');
      }).toThrow('Invalid reference');
    });

    it('should handle not null constraint violations', () => {
      const dbError = { 
        code: '23502', 
        detail: 'null value in column "username" violates not-null constraint' 
      };

      expect(() => {
        ServerErrorHandler.handleDatabaseError(dbError, 'user creation');
      }).toThrow('Required field missing');
    });
  });

  describe('handleRedisError', () => {
    it('should handle Redis connection errors gracefully', () => {
      const redisError = { code: 'ECONNREFUSED', message: 'Redis connection refused' };

      const result = ServerErrorHandler.handleRedisError(redisError, 'cache lookup');

      expect(result).toBeNull();
    });

    it('should handle Redis timeout errors gracefully', () => {
      const redisError = { code: 'ETIMEDOUT', message: 'Redis timeout' };

      const result = ServerErrorHandler.handleRedisError(redisError, 'cache set');

      expect(result).toBeNull();
    });

    it('should handle other Redis errors gracefully', () => {
      const redisError = { code: 'UNKNOWN', message: 'Unknown Redis error' };

      const result = ServerErrorHandler.handleRedisError(redisError, 'cache operation');

      expect(result).toBeNull();
    });
  });

  describe('handleSocketError', () => {
    it('should handle socket errors and emit to client', () => {
      const socket = {
        id: 'socket123',
        userId: 'user123',
        emit: jest.fn()
      };

      const error = {
        type: 'VALIDATION_ERROR',
        code: 'INVALID_DATA',
        message: 'Invalid socket data'
      };

      const context = { event: 'game_sync', data: { test: true } };

      ServerErrorHandler.handleSocketError(socket, error, context);

      expect(socket.emit).toHaveBeenCalledWith('error', {
        type: 'VALIDATION_ERROR',
        code: 'INVALID_DATA',
        message: 'Invalid data provided',
        timestamp: expect.any(Number)
      });
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return friendly messages for known error types', () => {
      const testCases = [
        { type: 'ValidationError', expected: 'Invalid data provided' },
        { type: 'AuthenticationError', expected: 'Please log in again' },
        { type: 'RateLimitError', expected: 'You\'re doing that too fast. Please slow down.' },
        { type: 'DatabaseError', expected: 'Service temporarily unavailable' },
        { code: 'ECONNREFUSED', expected: 'Service temporarily unavailable' },
        { code: 'ETIMEDOUT', expected: 'Request timed out. Please try again.' }
      ];

      testCases.forEach(({ type, code, expected }) => {
        const error = { type, code };
        const message = ServerErrorHandler.getUserFriendlyMessage(error);
        expect(message).toBe(expected);
      });
    });

    it('should return generic message for unknown errors', () => {
      const error = { type: 'UNKNOWN_ERROR', code: 'UNKNOWN_CODE' };
      const message = ServerErrorHandler.getUserFriendlyMessage(error);
      expect(message).toBe('Something went wrong. Please try again.');
    });
  });

  describe('getErrorSeverity', () => {
    it('should classify critical errors', () => {
      const criticalErrors = [
        { type: 'DatabaseError' },
        { type: 'AuthenticationError' },
        { type: 'GameStateError' }
      ];

      criticalErrors.forEach(error => {
        expect(ServerErrorHandler.getErrorSeverity(error)).toBe('critical');
      });
    });

    it('should classify high severity errors', () => {
      const highSeverityErrors = [
        { type: 'ValidationError' },
        { type: 'RateLimitError' },
        { type: 'NetworkError' }
      ];

      highSeverityErrors.forEach(error => {
        expect(ServerErrorHandler.getErrorSeverity(error)).toBe('high');
      });
    });

    it('should classify medium severity errors', () => {
      const error = { type: 'UNKNOWN_ERROR' };
      expect(ServerErrorHandler.getErrorSeverity(error)).toBe('medium');
    });
  });
});