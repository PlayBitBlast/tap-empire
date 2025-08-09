const OfflineProgressService = require('../services/offlineProgressService');

/**
 * Controller for offline progress endpoints
 */
class OfflineProgressController {
  constructor() {
    this.offlineProgressService = new OfflineProgressService();
  }

  /**
   * Calculate and collect offline progress
   * POST /api/offline-progress/collect
   */
  async collectOfflineProgress(req, res) {
    try {
      const userId = req.user.id;
      const clientData = req.body;

      // Validate offline progress against server calculation
      const validation = await this.offlineProgressService.validateOfflineProgress(userId, clientData);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid offline progress data',
          discrepancies: validation.discrepancies,
          serverResult: validation.serverResult
        });
      }

      const result = validation.serverResult;

      if (!result.hasOfflineProgress) {
        return res.json({
          success: true,
          hasOfflineProgress: false,
          reason: result.reason,
          message: 'No offline progress to collect'
        });
      }

      res.json({
        success: true,
        hasOfflineProgress: true,
        earnings: result.earnings,
        offlineHours: result.offlineHours,
        actualOfflineHours: result.actualOfflineHours,
        autoClickerRate: result.autoClickerRate,
        breakdown: result.breakdown,
        newTotalCoins: result.newTotalCoins,
        newTotalEarned: result.newTotalEarned,
        timestamp: result.timestamp
      });

    } catch (error) {
      console.error('Collect offline progress error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to collect offline progress'
      });
    }
  }

  /**
   * Get offline progress preview without collecting
   * GET /api/offline-progress/preview
   */
  async getOfflineProgressPreview(req, res) {
    try {
      const userId = req.user.id;

      const preview = await this.offlineProgressService.getOfflineProgressPreview(userId);

      res.json({
        success: true,
        ...preview
      });

    } catch (error) {
      console.error('Get offline progress preview error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get offline progress preview'
      });
    }
  }

  /**
   * Force update offline calculation timestamp (admin only)
   * POST /api/offline-progress/force-update
   */
  async forceUpdateOfflineTimestamp(req, res) {
    try {
      const userId = req.body.userId || req.user.id;

      // In a real app, you'd check for admin permissions here
      // if (!req.user.isAdmin) {
      //   return res.status(403).json({ success: false, error: 'Admin access required' });
      // }

      const result = await this.offlineProgressService.forceUpdateOfflineTimestamp(userId);

      res.json({
        success: true,
        ...result
      });

    } catch (error) {
      console.error('Force update offline timestamp error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update offline timestamp'
      });
    }
  }

  /**
   * Get offline progress statistics (admin only)
   * GET /api/offline-progress/stats
   */
  async getOfflineProgressStats(req, res) {
    try {
      // In a real app, you'd check for admin permissions here
      // if (!req.user.isAdmin) {
      //   return res.status(403).json({ success: false, error: 'Admin access required' });
      // }

      const stats = await this.offlineProgressService.getOfflineProgressStats();

      res.json({
        success: true,
        stats
      });

    } catch (error) {
      console.error('Get offline progress stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get offline progress statistics'
      });
    }
  }
}

module.exports = OfflineProgressController;