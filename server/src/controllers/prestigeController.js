const PrestigeService = require('../services/prestigeService');

/**
 * Prestige controller for handling prestige-related HTTP requests
 */
class PrestigeController {
  constructor() {
    this.prestigeService = new PrestigeService();
  }

  /**
   * Get prestige information for a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPrestigeInfo(req, res) {
    try {
      const userId = req.user.id;
      
      const [eligibility, stats, progress, upgrades] = await Promise.all([
        this.prestigeService.canPrestige(userId),
        this.prestigeService.getPrestigeStats(userId),
        this.prestigeService.getPrestigeProgress(userId),
        this.prestigeService.getPrestigeUpgrades(userId)
      ]);

      res.json({
        success: true,
        data: {
          eligibility,
          stats,
          progress,
          upgrades
        }
      });
    } catch (error) {
      console.error('Error getting prestige info:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get prestige information'
      });
    }
  }

  /**
   * Check if user can prestige
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async checkPrestigeEligibility(req, res) {
    try {
      const userId = req.user.id;
      const eligibility = await this.prestigeService.canPrestige(userId);

      res.json({
        success: true,
        data: eligibility
      });
    } catch (error) {
      console.error('Error checking prestige eligibility:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check prestige eligibility'
      });
    }
  }

  /**
   * Perform prestige reset
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async performPrestige(req, res) {
    try {
      const userId = req.user.id;
      
      // Validate prestige first
      const validation = await this.prestigeService.validatePrestige(userId);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: validation.reason,
          details: validation
        });
      }

      const result = await this.prestigeService.performPrestige(userId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error performing prestige:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get available prestige upgrades
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPrestigeUpgrades(req, res) {
    try {
      const userId = req.user.id;
      const upgrades = await this.prestigeService.getPrestigeUpgrades(userId);

      res.json({
        success: true,
        data: upgrades
      });
    } catch (error) {
      console.error('Error getting prestige upgrades:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get prestige upgrades'
      });
    }
  }

  /**
   * Purchase prestige upgrade
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async purchasePrestigeUpgrade(req, res) {
    try {
      const userId = req.user.id;
      const { upgradeType } = req.body;

      if (!upgradeType) {
        return res.status(400).json({
          success: false,
          error: 'Upgrade type is required'
        });
      }

      const result = await this.prestigeService.purchasePrestigeUpgrade(userId, upgradeType);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error purchasing prestige upgrade:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get prestige statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPrestigeStats(req, res) {
    try {
      const userId = req.user.id;
      const stats = await this.prestigeService.getPrestigeStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting prestige stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get prestige statistics'
      });
    }
  }

  /**
   * Get prestige leaderboard
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPrestigeLeaderboard(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const leaderboard = await this.prestigeService.getPrestigeLeaderboard(limit);

      res.json({
        success: true,
        data: {
          leaderboard,
          limit
        }
      });
    } catch (error) {
      console.error('Error getting prestige leaderboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get prestige leaderboard'
      });
    }
  }

  /**
   * Get prestige progress
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPrestigeProgress(req, res) {
    try {
      const userId = req.user.id;
      const progress = await this.prestigeService.getPrestigeProgress(userId);

      res.json({
        success: true,
        data: progress
      });
    } catch (error) {
      console.error('Error getting prestige progress:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get prestige progress'
      });
    }
  }
}

module.exports = PrestigeController;