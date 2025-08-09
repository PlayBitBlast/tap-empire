const UpgradeService = require('../services/upgradeService');

/**
 * Upgrade controller for handling upgrade-related HTTP requests
 */
class UpgradeController {
  constructor() {
    this.upgradeService = new UpgradeService();
  }

  /**
   * Get available upgrades for a user
   * GET /api/upgrades
   */
  async getUpgrades(req, res) {
    try {
      const userId = req.user.id;
      const upgrades = await this.upgradeService.getAvailableUpgrades(userId);
      
      res.json({
        success: true,
        data: upgrades
      });
    } catch (error) {
      console.error('Error getting upgrades:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get upgrades',
        message: error.message
      });
    }
  }

  /**
   * Purchase an upgrade
   * POST /api/upgrades/:upgradeType/purchase
   */
  async purchaseUpgrade(req, res) {
    try {
      const userId = req.user.id;
      const { upgradeType } = req.params;
      
      // Validate the purchase first
      const validation = await this.upgradeService.validateUpgradePurchase(userId, upgradeType);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Purchase validation failed',
          reason: validation.reason,
          details: validation
        });
      }

      // Perform the purchase
      const result = await this.upgradeService.purchaseUpgrade(userId, upgradeType);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error purchasing upgrade:', error);
      
      // Handle specific error types
      if (error.message.includes('Insufficient')) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient funds',
          message: error.message
        });
      }
      
      if (error.message.includes('maximum level')) {
        return res.status(400).json({
          success: false,
          error: 'Upgrade at maximum level',
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to purchase upgrade',
        message: error.message
      });
    }
  }

  /**
   * Get user upgrade statistics
   * GET /api/upgrades/stats
   */
  async getUpgradeStats(req, res) {
    try {
      const userId = req.user.id;
      const stats = await this.upgradeService.getUserUpgradeStats(userId);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting upgrade stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get upgrade statistics',
        message: error.message
      });
    }
  }

  /**
   * Validate upgrade purchase (without actually purchasing)
   * POST /api/upgrades/:upgradeType/validate
   */
  async validatePurchase(req, res) {
    try {
      const userId = req.user.id;
      const { upgradeType } = req.params;
      
      const validation = await this.upgradeService.validateUpgradePurchase(userId, upgradeType);
      
      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      console.error('Error validating upgrade purchase:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate purchase',
        message: error.message
      });
    }
  }

  /**
   * Get upgrade leaderboard
   * GET /api/upgrades/:upgradeType/leaderboard
   */
  async getUpgradeLeaderboard(req, res) {
    try {
      const { upgradeType } = req.params;
      const limit = parseInt(req.query.limit) || 100;
      
      const leaderboard = await this.upgradeService.getUpgradeLeaderboard(upgradeType, limit);
      
      res.json({
        success: true,
        data: {
          upgradeType,
          leaderboard
        }
      });
    } catch (error) {
      console.error('Error getting upgrade leaderboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get upgrade leaderboard',
        message: error.message
      });
    }
  }
}

module.exports = UpgradeController;