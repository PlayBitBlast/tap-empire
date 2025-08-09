const GameService = require('../services/gameService');
const ServerErrorHandler = require('../middleware/errorHandler');

/**
 * Game controller for handling core game actions
 */
class GameController {
  constructor(io = null) {
    this.gameService = new GameService(io);
  }

  /**
   * Set Socket.io instance for real-time updates
   * @param {Object} io - Socket.io instance
   */
  setSocketIO(io) {
    this.gameService.setSocketIO(io);
  }

  /**
   * Handle tap action
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async tap(req, res, next) {
    try {
      const userId = req.user.id;
      const { timestamp, clientChecksum } = req.body;

      // Validate required fields
      if (!timestamp) {
        throw ServerErrorHandler.validationError('Timestamp is required for tap validation');
      }

      // Process tap with anti-cheat validation
      const result = await this.gameService.processTap(userId, {
        timestamp,
        clientChecksum
      });

      res.json(result);
    } catch (error) {
      // Handle specific game service errors
      if (error.type === 'RateLimitError') {
        throw ServerErrorHandler.rateLimitError(error.message, error.retryAfter);
      }
      
      if (error.type === 'ValidationError') {
        throw ServerErrorHandler.validationError(error.message);
      }
      
      if (error.type === 'GameStateError') {
        throw ServerErrorHandler.gameStateError(error.message, error.correctState);
      }

      // Pass to error middleware
      next(error);
    }
  }

  /**
   * Validate and sync game state
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async syncState(req, res) {
    try {
      const userId = req.user.id;
      const { clientState } = req.body;

      if (!clientState) {
        return res.status(400).json({
          success: false,
          error: 'Missing client state',
          message: 'Client state is required for synchronization'
        });
      }

      // Validate and correct state if necessary
      const result = await this.gameService.validateAndCorrectState(userId, clientState);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Sync state controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to sync game state'
      });
    }
  }

  /**
   * Get anti-cheat statistics (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAntiCheatStats(req, res) {
    try {
      // Check if user is admin (this would be implemented in auth middleware)
      if (!req.user.is_admin) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'Admin access required'
        });
      }

      const stats = this.gameService.getAntiCheatStats();

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('Anti-cheat stats controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get anti-cheat statistics'
      });
    }
  }

  /**
   * Force cleanup of tap history (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async forceCleanup(req, res) {
    try {
      // Check if user is admin
      if (!req.user.is_admin) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'Admin access required'
        });
      }

      this.gameService.cleanupTapHistory();

      res.json({
        success: true,
        message: 'Tap history cleanup completed'
      });
    } catch (error) {
      console.error('Force cleanup controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to cleanup tap history'
      });
    }
  }
}

module.exports = GameController;