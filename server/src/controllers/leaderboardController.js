const LeaderboardService = require('../services/leaderboardService');
const { ERROR_CODES, SUCCESS_CODES } = require('../../../shared/constants/events');

/**
 * LeaderboardController - Handles HTTP requests for leaderboard operations
 */
class LeaderboardController {
  constructor(io = null) {
    this.leaderboardService = new LeaderboardService(io);
  }

  /**
   * Set Socket.io instance
   * @param {Object} io - Socket.io instance
   */
  setSocketIO(io) {
    this.leaderboardService.setSocketIO(io);
  }

  /**
   * Get leaderboard data
   * GET /api/leaderboard/:type?limit=100&offset=0
   */
  async getLeaderboard(req, res) {
    try {
      const { type = 'all_time' } = req.params;
      const { limit = 100, offset = 0 } = req.query;

      // Validate parameters
      if (!['all_time', 'weekly', 'daily'].includes(type)) {
        return res.status(400).json({
          error: 'Invalid leaderboard type',
          code: ERROR_CODES.VALIDATION_INVALID_DATA,
          validTypes: ['all_time', 'weekly', 'daily']
        });
      }

      const parsedLimit = parseInt(limit);
      const parsedOffset = parseInt(offset);

      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return res.status(400).json({
          error: 'Invalid limit parameter (must be between 1 and 100)',
          code: ERROR_CODES.VALIDATION_FIELD_OUT_OF_RANGE
        });
      }

      if (isNaN(parsedOffset) || parsedOffset < 0) {
        return res.status(400).json({
          error: 'Invalid offset parameter (must be >= 0)',
          code: ERROR_CODES.VALIDATION_FIELD_OUT_OF_RANGE
        });
      }

      const leaderboard = await this.leaderboardService.getLeaderboard(
        type,
        parsedLimit,
        parsedOffset
      );

      res.json({
        success: true,
        code: SUCCESS_CODES.LEADERBOARD_DATA,
        data: leaderboard
      });
    } catch (error) {
      console.error('Error in getLeaderboard:', error);
      res.status(500).json({
        error: 'Failed to fetch leaderboard',
        code: ERROR_CODES.SYSTEM_INTERNAL_ERROR
      });
    }
  }

  /**
   * Get user's rank with nearby players
   * GET /api/leaderboard/:type/user/:userId?range=5
   */
  async getUserRank(req, res) {
    try {
      const { type = 'all_time', userId } = req.params;
      const { range = 5 } = req.query;

      // Validate parameters
      if (!['all_time', 'weekly', 'daily'].includes(type)) {
        return res.status(400).json({
          error: 'Invalid leaderboard type',
          code: ERROR_CODES.VALIDATION_INVALID_DATA
        });
      }

      const parsedUserId = parseInt(userId);
      const parsedRange = parseInt(range);

      if (isNaN(parsedUserId) || parsedUserId <= 0) {
        return res.status(400).json({
          error: 'Invalid user ID',
          code: ERROR_CODES.VALIDATION_INVALID_DATA
        });
      }

      if (isNaN(parsedRange) || parsedRange < 1 || parsedRange > 20) {
        return res.status(400).json({
          error: 'Invalid range parameter (must be between 1 and 20)',
          code: ERROR_CODES.VALIDATION_FIELD_OUT_OF_RANGE
        });
      }

      // Check if user is requesting their own rank or if they're authenticated
      if (req.user && req.user.id !== parsedUserId) {
        return res.status(403).json({
          error: 'Cannot access other users rank details',
          code: ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS
        });
      }

      const rankData = await this.leaderboardService.getUserRankWithContext(
        parsedUserId,
        type,
        parsedRange
      );

      res.json({
        success: true,
        code: SUCCESS_CODES.LEADERBOARD_DATA,
        data: rankData
      });
    } catch (error) {
      console.error('Error in getUserRank:', error);
      res.status(500).json({
        error: 'Failed to fetch user rank',
        code: ERROR_CODES.SYSTEM_INTERNAL_ERROR
      });
    }
  }

  /**
   * Get user's ranks across all leaderboard types
   * GET /api/leaderboard/user/:userId/ranks
   */
  async getUserRanks(req, res) {
    try {
      const { userId } = req.params;
      const parsedUserId = parseInt(userId);

      if (isNaN(parsedUserId) || parsedUserId <= 0) {
        return res.status(400).json({
          error: 'Invalid user ID',
          code: ERROR_CODES.VALIDATION_INVALID_DATA
        });
      }

      // Check if user is requesting their own ranks or if they're authenticated
      if (req.user && req.user.id !== parsedUserId) {
        return res.status(403).json({
          error: 'Cannot access other users rank details',
          code: ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS
        });
      }

      const ranks = await this.leaderboardService.getUserRanks(parsedUserId);

      res.json({
        success: true,
        code: SUCCESS_CODES.LEADERBOARD_DATA,
        data: ranks
      });
    } catch (error) {
      console.error('Error in getUserRanks:', error);
      res.status(500).json({
        error: 'Failed to fetch user ranks',
        code: ERROR_CODES.SYSTEM_INTERNAL_ERROR
      });
    }
  }

  /**
   * Get leaderboard statistics
   * GET /api/leaderboard/stats
   */
  async getLeaderboardStats(req, res) {
    try {
      const stats = await this.leaderboardService.getLeaderboardStats();

      res.json({
        success: true,
        code: SUCCESS_CODES.LEADERBOARD_DATA,
        data: stats
      });
    } catch (error) {
      console.error('Error in getLeaderboardStats:', error);
      res.status(500).json({
        error: 'Failed to fetch leaderboard statistics',
        code: ERROR_CODES.SYSTEM_INTERNAL_ERROR
      });
    }
  }

  /**
   * Update player rank (internal use, called by game service)
   * This method is typically called internally when a player's coins change
   */
  async updatePlayerRank(userId, totalCoins) {
    try {
      return await this.leaderboardService.updatePlayerRank(userId, totalCoins);
    } catch (error) {
      console.error('Error updating player rank:', error);
      throw error;
    }
  }

  /**
   * Remove user from leaderboards (admin only)
   * DELETE /api/leaderboard/user/:userId
   */
  async removeUser(req, res) {
    try {
      const { userId } = req.params;
      const parsedUserId = parseInt(userId);

      if (isNaN(parsedUserId) || parsedUserId <= 0) {
        return res.status(400).json({
          error: 'Invalid user ID',
          code: ERROR_CODES.VALIDATION_INVALID_DATA
        });
      }

      // Check if user has admin permissions (implement based on your auth system)
      if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({
          error: 'Admin permissions required',
          code: ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS
        });
      }

      await this.leaderboardService.removeUser(parsedUserId);

      res.json({
        success: true,
        message: 'User removed from leaderboards',
        code: SUCCESS_CODES.LEADERBOARD_DATA
      });
    } catch (error) {
      console.error('Error in removeUser:', error);
      res.status(500).json({
        error: 'Failed to remove user from leaderboards',
        code: ERROR_CODES.SYSTEM_INTERNAL_ERROR
      });
    }
  }

  /**
   * Reset daily leaderboard (admin only, typically called by cron job)
   * POST /api/leaderboard/reset/daily
   */
  async resetDailyLeaderboard(req, res) {
    try {
      // Check if user has admin permissions
      if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({
          error: 'Admin permissions required',
          code: ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS
        });
      }

      await this.leaderboardService.resetDailyLeaderboard();

      res.json({
        success: true,
        message: 'Daily leaderboard reset successfully',
        code: SUCCESS_CODES.LEADERBOARD_DATA
      });
    } catch (error) {
      console.error('Error in resetDailyLeaderboard:', error);
      res.status(500).json({
        error: 'Failed to reset daily leaderboard',
        code: ERROR_CODES.SYSTEM_INTERNAL_ERROR
      });
    }
  }

  /**
   * Reset weekly leaderboard (admin only, typically called by cron job)
   * POST /api/leaderboard/reset/weekly
   */
  async resetWeeklyLeaderboard(req, res) {
    try {
      // Check if user has admin permissions
      if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({
          error: 'Admin permissions required',
          code: ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS
        });
      }

      await this.leaderboardService.resetWeeklyLeaderboard();

      res.json({
        success: true,
        message: 'Weekly leaderboard reset successfully',
        code: SUCCESS_CODES.LEADERBOARD_DATA
      });
    } catch (error) {
      console.error('Error in resetWeeklyLeaderboard:', error);
      res.status(500).json({
        error: 'Failed to reset weekly leaderboard',
        code: ERROR_CODES.SYSTEM_INTERNAL_ERROR
      });
    }
  }
}

module.exports = { LeaderboardController };