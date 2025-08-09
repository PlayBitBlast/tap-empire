/**
 * Tests for the ErrorHandler utility
 */

import ErrorHandler from './errorHandler';

// Mock toast
jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
    warning: jest.fn(),
    success: jest.fn(),
    dismiss: jest.fn()
  }
}));

// Mock fetch
global.fetch = jest.fn();

describe('ErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ErrorHandler.resetErrorCounts();
  });

  describe('handleGameError', () => {
    it('should handle sync failed errors', () => {
      const error = {
        type: 'SYNC_FAILED',
        code: 'SYNC_ERROR',
        message: 'Failed to sync'
      };

      const mockGameEngine = {
        forceSync: jest.fn(),
        setOfflineMode: jest.fn()
      };

      ErrorHandler.handleGameError(error, { gameEngine: mockGameEngine });

      // Should show retry dialog for first attempt
      expect(document.querySelector('.error-retry-dialog')).toBeTruthy();
    });

    it('should handle rate limit errors', () => {
      const error = {
        type: 'RATE_LIMITED',
        code: 'TAP_RATE_EXCEEDED',
        message: 'Tapping too fast',
        retryAfter: 5000
      };

      ErrorHandler.handleGameError(error, {});

      // Should show cooldown message
      expect(require('react-toastify').toast.warning).toHaveBeenCalledWith(
        'Slow down! Please wait 5 seconds.'
      );
    });

    it('should handle network errors with retry', () => {
      const error = {
        type: 'NETWORK_ERROR',
        code: 'CONNECTION_LOST',
        message: 'Network connection lost'
      };

      const retryCallback = jest.fn();

      ErrorHandler.handleGameError(error, { 
        retryCallback,
        retryCount: 0 
      });

      // Should attempt retry with exponential backoff
      setTimeout(() => {
        expect(retryCallback).toHaveBeenCalledWith(1);
      }, 1000);
    });

    it('should handle validation errors', () => {
      const error = {
        type: 'VALIDATION_ERROR',
        code: 'INVALID_DATA',
        message: 'Invalid game data'
      };

      const mockGameEngine = {
        setState: jest.fn()
      };

      ErrorHandler.handleGameError(error, { 
        gameEngine: mockGameEngine,
        lastValidState: { coins: 100 }
      });

      expect(require('react-toastify').toast.warning).toHaveBeenCalled();
      expect(mockGameEngine.setState).toHaveBeenCalledWith({ coins: 100 });
    });

    it('should handle authentication errors', () => {
      const error = {
        type: 'AUTH_ERROR',
        code: 'TOKEN_EXPIRED',
        message: 'Authentication failed'
      };

      // Mock localStorage
      const mockLocalStorage = {
        removeItem: jest.fn()
      };
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage
      });

      // Mock window.location.reload
      delete window.location;
      window.location = { reload: jest.fn() };

      ErrorHandler.handleGameError(error, {});

      expect(require('react-toastify').toast.error).toHaveBeenCalledWith(
        'Authentication failed. Please restart the app.'
      );
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('userData');
    });

    it('should handle invalid state errors', () => {
      const error = {
        type: 'INVALID_STATE',
        code: 'STATE_MISMATCH',
        message: 'Invalid game state',
        correctState: { coins: 200, upgrades: {} }
      };

      const mockGameEngine = {
        setState: jest.fn()
      };

      ErrorHandler.handleGameError(error, { gameEngine: mockGameEngine });

      expect(require('react-toastify').toast.warning).toHaveBeenCalledWith(
        'Game state corrected by server.'
      );
      expect(mockGameEngine.setState).toHaveBeenCalledWith(error.correctState);
    });
  });

  describe('createUserFriendlyMessage', () => {
    it('should return user-friendly messages for known error codes', () => {
      const testCases = [
        { code: 'NETWORK_TIMEOUT', expected: 'Connection timed out. Please check your internet.' },
        { code: 'SERVER_ERROR', expected: 'Server is having issues. Please try again later.' },
        { code: 'RATE_LIMITED', expected: 'You\'re tapping too fast! Please slow down.' },
        { code: 'INSUFFICIENT_COINS', expected: 'Not enough coins for this action.' }
      ];

      testCases.forEach(({ code, expected }) => {
        const message = ErrorHandler.createUserFriendlyMessage({ code });
        expect(message).toBe(expected);
      });
    });

    it('should return generic message for unknown errors', () => {
      const error = { code: 'UNKNOWN_ERROR', message: 'Something weird happened' };
      const message = ErrorHandler.createUserFriendlyMessage(error);
      expect(message).toBe('Something weird happened');
    });
  });

  describe('logError', () => {
    it('should log errors with context', () => {
      const error = {
        type: 'SYNC_FAILED',
        code: 'NETWORK_ERROR',
        message: 'Failed to sync',
        stack: 'Error stack trace'
      };

      const context = {
        userId: 'user123',
        action: 'tap'
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      ErrorHandler.logError(error, context);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should send critical errors to monitoring', async () => {
      const error = {
        type: 'AUTH_ERROR',
        code: 'CRITICAL_FAILURE',
        message: 'Critical authentication failure'
      };

      fetch.mockResolvedValueOnce({ ok: true });

      await ErrorHandler.logError(error, { userId: 'user123' });

      // Should attempt to send to monitoring service
      expect(fetch).toHaveBeenCalledWith('/api/errors/log', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }));
    });
  });

  describe('showRetryDialog', () => {
    it('should create and show retry dialog', async () => {
      const retryCallback = jest.fn();
      const message = 'Connection lost. Retry?';

      const dialogPromise = ErrorHandler.showRetryDialog(message, retryCallback);

      // Check if dialog was created
      const dialog = document.querySelector('.error-retry-dialog');
      expect(dialog).toBeTruthy();
      expect(dialog.textContent).toContain(message);

      // Simulate retry button click
      const retryBtn = dialog.querySelector('.retry-btn');
      retryBtn.click();

      const result = await dialogPromise;
      expect(result).toBe('retry');
      expect(retryCallback).toHaveBeenCalled();
      expect(document.querySelector('.error-retry-dialog')).toBeFalsy();
    });

    it('should handle cancel button click', async () => {
      const retryCallback = jest.fn();
      const message = 'Connection lost. Retry?';

      const dialogPromise = ErrorHandler.showRetryDialog(message, retryCallback);

      // Simulate cancel button click
      const dialog = document.querySelector('.error-retry-dialog');
      const cancelBtn = dialog.querySelector('.cancel-btn');
      cancelBtn.click();

      const result = await dialogPromise;
      expect(result).toBe('offline');
      expect(retryCallback).not.toHaveBeenCalled();
      expect(document.querySelector('.error-retry-dialog')).toBeFalsy();
    });
  });

  describe('error frequency tracking', () => {
    it('should track error frequency', () => {
      const error = {
        type: 'NETWORK_ERROR',
        code: 'CONNECTION_LOST'
      };

      // Trigger same error multiple times
      for (let i = 0; i < 3; i++) {
        ErrorHandler.handleGameError(error, {});
      }

      // Should track the error count
      const errorKey = 'NETWORK_ERROR_CONNECTION_LOST';
      expect(ErrorHandler.errorCounts.get(errorKey)).toBe(3);
    });

    it('should reset error counts', () => {
      const error = {
        type: 'NETWORK_ERROR',
        code: 'CONNECTION_LOST'
      };

      ErrorHandler.handleGameError(error, {});
      expect(ErrorHandler.errorCounts.size).toBeGreaterThan(0);

      ErrorHandler.resetErrorCounts();
      expect(ErrorHandler.errorCounts.size).toBe(0);
    });
  });

  describe('isCriticalError', () => {
    it('should identify critical error types', () => {
      const criticalErrors = [
        { type: 'AUTH_ERROR' },
        { type: 'INVALID_STATE' },
        { type: 'SERVER_ERROR' },
        { type: 'SYNC_FAILED' }
      ];

      criticalErrors.forEach(error => {
        expect(ErrorHandler.isCriticalError(error)).toBe(true);
      });
    });

    it('should identify non-critical errors', () => {
      const nonCriticalErrors = [
        { type: 'VALIDATION_ERROR' },
        { type: 'RATE_LIMITED' },
        { type: 'NETWORK_ERROR' }
      ];

      nonCriticalErrors.forEach(error => {
        expect(ErrorHandler.isCriticalError(error)).toBe(false);
      });
    });

    it('should consider frequent errors as critical', () => {
      const error = { type: 'NETWORK_ERROR', code: 'FREQUENT_ERROR' };
      
      // Simulate frequent errors
      for (let i = 0; i < 6; i++) {
        ErrorHandler.handleGameError(error, {});
      }

      expect(ErrorHandler.isCriticalError(error)).toBe(true);
    });
  });
});