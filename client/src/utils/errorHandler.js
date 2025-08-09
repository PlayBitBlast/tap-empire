/**
 * Centralized error handling system for the client
 */

import { toast } from 'react-toastify';

export class ErrorHandler {
  static errorCounts = new Map();
  static maxRetries = 3;
  static retryDelay = 1000;

  /**
   * Handle different types of game errors
   */
  static handleGameError(error, context = {}) {
    console.error('Game error:', error, context);
    
    // Track error frequency
    const errorKey = `${error.type || 'UNKNOWN'}_${error.code || 'GENERIC'}`;
    const count = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, count + 1);

    switch (error.type) {
      case 'SYNC_FAILED':
        return this.handleSyncError(error, context);
      case 'NETWORK_ERROR':
        return this.handleNetworkError(error, context);
      case 'VALIDATION_ERROR':
        return this.handleValidationError(error, context);
      case 'RATE_LIMITED':
        return this.handleRateLimitError(error, context);
      case 'AUTH_ERROR':
        return this.handleAuthError(error, context);
      case 'INVALID_STATE':
        return this.handleInvalidStateError(error, context);
      default:
        return this.handleGenericError(error, context);
    }
  }

  /**
   * Handle synchronization failures
   */
  static handleSyncError(error, context) {
    const { gameEngine, retryCount = 0 } = context;
    
    if (retryCount < this.maxRetries) {
      return this.showRetryDialog(
        'Connection lost. Your progress is safe.',
        () => {
          if (gameEngine) {
            gameEngine.forceSync();
          }
        },
        retryCount
      );
    }
    
    // Max retries reached - switch to offline mode
    toast.error('Playing in offline mode. Progress will sync when connection returns.');
    if (gameEngine) {
      gameEngine.setOfflineMode(true);
    }
  }

  /**
   * Handle network connectivity issues
   */
  static handleNetworkError(error, context) {
    const { retryCallback, retryCount = 0 } = context;
    
    if (!navigator.onLine) {
      toast.warning('No internet connection. Playing offline.');
      return;
    }
    
    if (retryCount < this.maxRetries && retryCallback) {
      setTimeout(() => {
        retryCallback(retryCount + 1);
      }, this.retryDelay * Math.pow(2, retryCount)); // Exponential backoff
    } else {
      toast.error('Connection problems. Please check your internet.');
    }
  }

  /**
   * Handle validation errors
   */
  static handleValidationError(error, context) {
    const message = error.message || 'Invalid action. Please try again.';
    toast.warning(message);
    
    // Reset to last valid state if available
    const { gameEngine, lastValidState } = context;
    if (gameEngine && lastValidState) {
      gameEngine.setState(lastValidState);
    }
  }

  /**
   * Handle rate limiting
   */
  static handleRateLimitError(error, context) {
    const cooldownTime = error.retryAfter || 5000;
    const seconds = Math.ceil(cooldownTime / 1000);
    
    toast.warning(`Slow down! Please wait ${seconds} seconds.`);
    
    // Show cooldown indicator
    this.showCooldownMessage(cooldownTime);
  }

  /**
   * Handle authentication errors
   */
  static handleAuthError(error, context) {
    toast.error('Authentication failed. Please restart the app.');
    
    // Clear stored auth data
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    
    // Redirect to login or reload
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }

  /**
   * Handle invalid game state
   */
  static handleInvalidStateError(error, context) {
    const { gameEngine } = context;
    
    toast.warning('Game state corrected by server.');
    
    if (gameEngine && error.correctState) {
      gameEngine.setState(error.correctState);
    } else if (gameEngine) {
      // Force a full sync to get correct state
      gameEngine.forceFullSync();
    }
  }

  /**
   * Handle generic errors
   */
  static handleGenericError(error, context) {
    const message = error.userMessage || 'Something went wrong. Please try again.';
    toast.error(message);
    
    // Log detailed error for debugging
    console.error('Unhandled error:', error, context);
  }

  /**
   * Show retry dialog with user-friendly message
   */
  static showRetryDialog(message, retryCallback, retryCount = 0) {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.className = 'error-retry-dialog';
      dialog.innerHTML = `
        <div class="error-dialog-content">
          <h3>Connection Issue</h3>
          <p>${message}</p>
          <div class="error-dialog-buttons">
            <button class="retry-btn">Retry</button>
            <button class="cancel-btn">Continue Offline</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(dialog);
      
      const retryBtn = dialog.querySelector('.retry-btn');
      const cancelBtn = dialog.querySelector('.cancel-btn');
      
      retryBtn.onclick = () => {
        document.body.removeChild(dialog);
        retryCallback();
        resolve('retry');
      };
      
      cancelBtn.onclick = () => {
        document.body.removeChild(dialog);
        resolve('offline');
      };
    });
  }

  /**
   * Show cooldown message with countdown
   */
  static showCooldownMessage(cooldownTime) {
    const toastId = 'cooldown-toast';
    let remainingTime = cooldownTime;
    
    const updateToast = () => {
      const seconds = Math.ceil(remainingTime / 1000);
      toast.warning(`Please wait ${seconds} seconds...`, {
        toastId,
        autoClose: false,
        closeButton: false
      });
      
      remainingTime -= 1000;
      
      if (remainingTime > 0) {
        setTimeout(updateToast, 1000);
      } else {
        toast.dismiss(toastId);
        toast.success('You can continue playing!');
      }
    };
    
    updateToast();
  }

  /**
   * Create user-friendly error messages
   */
  static createUserFriendlyMessage(error) {
    const errorMessages = {
      'NETWORK_TIMEOUT': 'Connection timed out. Please check your internet.',
      'SERVER_ERROR': 'Server is having issues. Please try again later.',
      'INVALID_REQUEST': 'Something went wrong. Please refresh and try again.',
      'INSUFFICIENT_COINS': 'Not enough coins for this action.',
      'UPGRADE_UNAVAILABLE': 'This upgrade is not available right now.',
      'RATE_LIMITED': 'You\'re tapping too fast! Please slow down.',
      'SYNC_CONFLICT': 'Your progress was updated from another device.',
      'ACHIEVEMENT_ERROR': 'Could not unlock achievement. Progress saved.',
      'LEADERBOARD_ERROR': 'Leaderboard temporarily unavailable.',
      'FRIEND_ERROR': 'Could not load friends. Please try again.',
      'GIFT_ERROR': 'Could not send gift. Please try again later.'
    };
    
    return errorMessages[error.code] || error.message || 'An unexpected error occurred.';
  }

  /**
   * Log errors for monitoring
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
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: context.userId || 'anonymous'
    };
    
    // Send to logging service (implement based on your monitoring solution)
    this.sendErrorLog(errorLog);
  }

  /**
   * Send error logs to monitoring service
   */
  static async sendErrorLog(errorLog) {
    try {
      // Only send critical errors to avoid spam
      if (this.isCriticalError(errorLog.error)) {
        await fetch('/api/errors/log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(errorLog)
        });
      }
    } catch (logError) {
      // Don't let logging errors break the app
      console.warn('Failed to send error log:', logError);
    }
  }

  /**
   * Determine if error is critical and should be logged
   */
  static isCriticalError(error) {
    const criticalTypes = [
      'AUTH_ERROR',
      'INVALID_STATE',
      'SERVER_ERROR',
      'SYNC_FAILED'
    ];
    
    return criticalTypes.includes(error.type) || 
           (this.errorCounts.get(`${error.type}_${error.code}`) || 0) > 5;
  }

  /**
   * Reset error counts (call periodically)
   */
  static resetErrorCounts() {
    this.errorCounts.clear();
  }
}

// Reset error counts every 5 minutes
setInterval(() => {
  ErrorHandler.resetErrorCounts();
}, 5 * 60 * 1000);

export default ErrorHandler;