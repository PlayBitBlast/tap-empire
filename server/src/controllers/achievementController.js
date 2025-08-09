const AchievementService = require('../services/achievementService');

/**
 * Achievement controller for handling achievement-related API endpoints
 */
class AchievementController {
  constructor() {
    this.achievementService = new AchievementService();
  }

  /**
   * Get user's achievements with progress
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserAchievements(req, res) {
    try {
      const userId = req.user.id;
      const achievements = await this.achievementService.getAchievementsWithProgress(userId);
      
      res.json({
        success: true,
        data: achievements
      });
    } catch (error) {
      console.error('Error getting user achievements:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get achievements'
      });
    }
  }

  /**
   * Get user's achievement statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserAchievementStats(req, res) {
    try {
      const userId = req.user.id;
      const stats = await this.achievementService.getUserAchievementStats(userId);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting achievement stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get achievement statistics'
      });
    }
  }

  /**
   * Get achievement leaderboard
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAchievementLeaderboard(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const leaderboard = await this.achievementService.getAchievementLeaderboard(limit);
      
      res.json({
        success: true,
        data: leaderboard
      });
    } catch (error) {
      console.error('Error getting achievement leaderboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get achievement leaderboard'
      });
    }
  }

  /**
   * Get achievement statistics (popular, rare, etc.)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAchievementStatistics(req, res) {
    try {
      const statistics = await this.achievementService.getAchievementStatistics();
      
      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Error getting achievement statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get achievement statistics'
      });
    }
  }

  /**
   * Get recent achievement unlocks
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getRecentUnlocks(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const recentUnlocks = await this.achievementService.getRecentUnlocks(limit);
      
      res.json({
        success: true,
        data: recentUnlocks
      });
    } catch (error) {
      console.error('Error getting recent unlocks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get recent unlocks'
      });
    }
  }

  /**
   * Share achievement to Telegram
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async shareAchievement(req, res) {
    try {
      const userId = req.user.id;
      const { achievementId } = req.params;
      
      if (!achievementId) {
        return res.status(400).json({
          success: false,
          error: 'Achievement ID is required'
        });
      }
      
      const shareData = await this.achievementService.shareAchievement(userId, parseInt(achievementId));
      
      res.json({
        success: true,
        data: shareData
      });
    } catch (error) {
      console.error('Error sharing achievement:', error);
      
      if (error.message === 'Achievement or user not found') {
        return res.status(404).json({
          success: false,
          error: 'Achievement not found'
        });
      }
      
      if (error.message === 'User does not have this achievement') {
        return res.status(403).json({
          success: false,
          error: 'You do not have this achievement'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to share achievement'
      });
    }
  }

  /**
   * Manually check for new achievements (for testing/admin)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async checkAchievements(req, res) {
    try {
      const userId = req.user.id;
      const { triggerType } = req.body;
      
      const newAchievements = await this.achievementService.checkAndUnlockAchievements(userId, triggerType);
      
      res.json({
        success: true,
        data: {
          newAchievements,
          count: newAchievements.length
        }
      });
    } catch (error) {
      console.error('Error checking achievements:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check achievements'
      });
    }
  }

  /**
   * Track milestone (internal endpoint for game actions)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async trackMilestone(req, res) {
    try {
      const userId = req.user.id;
      const { milestoneType, value } = req.body;
      
      if (!milestoneType) {
        return res.status(400).json({
          success: false,
          error: 'Milestone type is required'
        });
      }
      
      const newAchievements = await this.achievementService.trackMilestone(
        userId, 
        milestoneType, 
        value || 1
      );
      
      res.json({
        success: true,
        data: {
          newAchievements,
          count: newAchievements.length
        }
      });
    } catch (error) {
      console.error('Error tracking milestone:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track milestone'
      });
    }
  }
}

module.exports = AchievementController;