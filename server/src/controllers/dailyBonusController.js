const DailyBonusService = require('../services/dailyBonusService');

/**
 * Controller for daily bonus and streak system endpoints
 */
class DailyBonusController {
  constructor() {
    this.dailyBonusService = new DailyBonusService();
  }

  /**
   * Get daily bonus status for user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDailyBonusStatus(req, res) {
    try {
      const userId = req.user.id;
      const statistics = await this.dailyBonusService.getStreakStatistics(userId);
      
      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Error getting daily bonus status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get daily bonus status'
      });
    }
  }

  /**
   * Claim daily bonus
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async claimDailyBonus(req, res) {
    try {
      const userId = req.user.id;
      const result = await this.dailyBonusService.claimDailyBonus(userId);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error claiming daily bonus:', error);
      
      // Handle specific error cases
      if (error.message.includes('not available') || error.message.includes('already claimed')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to claim daily bonus'
      });
    }
  }

  /**
   * Get daily bonus history
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDailyBonusHistory(req, res) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 30;
      
      const history = await this.dailyBonusService.getDailyBonusHistory(userId, limit);
      
      res.json({
        success: true,
        data: {
          history,
          count: history.length
        }
      });
    } catch (error) {
      console.error('Error getting daily bonus history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get daily bonus history'
      });
    }
  }

  /**
   * Get daily bonus statistics (admin endpoint)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDailyBonusStatistics(req, res) {
    try {
      const statistics = await this.dailyBonusService.getDailyBonusStatistics();
      
      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Error getting daily bonus statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get daily bonus statistics'
      });
    }
  }

  /**
   * Reset all user streaks (admin endpoint)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async resetAllStreaks(req, res) {
    try {
      const affectedUsers = await this.dailyBonusService.resetAllStreaks();
      
      res.json({
        success: true,
        data: {
          message: `Reset streaks for ${affectedUsers} users`,
          affectedUsers
        }
      });
    } catch (error) {
      console.error('Error resetting streaks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset streaks'
      });
    }
  }
}

module.exports = DailyBonusController;