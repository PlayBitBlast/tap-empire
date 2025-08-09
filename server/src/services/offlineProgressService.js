const { GAME_CONFIG } = require('../../../shared/constants/gameConfig');
const { calculateOfflineEarnings } = require('../../../shared/utils/calculations');
const UserRepository = require('../repositories/UserRepository');

/**
 * Service for handling offline progress calculations
 * Manages offline earnings from auto-clickers with proper validation
 */
class OfflineProgressService {
  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Calculate offline progress for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Offline progress result
   */
  async calculateOfflineProgress(userId) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Calculate time offline
      const now = new Date();
      const lastCalculation = new Date(user.last_offline_calculation);
      const offlineTimeMs = now.getTime() - lastCalculation.getTime();
      const offlineHours = offlineTimeMs / (1000 * 60 * 60);

      // Only calculate if offline for more than 1 minute
      if (offlineHours < (1 / 60)) {
        return {
          hasOfflineProgress: false,
          reason: 'Not enough offline time',
          offlineHours: 0,
          earnings: 0
        };
      }

      // Cap offline hours to maximum allowed
      const cappedHours = Math.min(offlineHours, GAME_CONFIG.OFFLINE_EARNINGS_CAP_HOURS);

      // Calculate earnings based on auto-clicker rate
      const autoClickerRate = user.auto_clicker_rate || 0;
      
      if (autoClickerRate <= 0) {
        // Update offline calculation timestamp even if no earnings
        await this.userRepository.updateOfflineCalculation(userId);
        
        return {
          hasOfflineProgress: false,
          reason: 'No auto-clickers',
          offlineHours: cappedHours,
          earnings: 0
        };
      }

      // Calculate offline earnings
      const offlineEarnings = calculateOfflineEarnings(autoClickerRate, cappedHours);

      if (offlineEarnings <= 0) {
        // Update offline calculation timestamp
        await this.userRepository.updateOfflineCalculation(userId);
        
        return {
          hasOfflineProgress: false,
          reason: 'No earnings calculated',
          offlineHours: cappedHours,
          earnings: 0
        };
      }

      // Add coins to user account
      const updatedUser = await this.userRepository.addCoins(userId, offlineEarnings);
      
      // Update offline calculation timestamp
      await this.userRepository.updateOfflineCalculation(userId);

      // Create detailed breakdown
      const breakdown = this.createEarningsBreakdown(autoClickerRate, cappedHours, offlineEarnings);

      return {
        hasOfflineProgress: true,
        earnings: offlineEarnings,
        offlineHours: cappedHours,
        actualOfflineHours: offlineHours,
        autoClickerRate,
        breakdown,
        newTotalCoins: updatedUser.coins,
        newTotalEarned: updatedUser.total_coins_earned,
        timestamp: now.toISOString()
      };

    } catch (error) {
      console.error(`Offline progress calculation error for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Validate offline progress request to prevent cheating
   * @param {number} userId - User ID
   * @param {Object} clientData - Client-reported offline data
   * @returns {Promise<Object>} Validation result
   */
  async validateOfflineProgress(userId, clientData) {
    try {
      const serverResult = await this.calculateOfflineProgress(userId);
      
      // Compare server calculation with client data
      const discrepancies = [];
      
      if (clientData.earnings && Math.abs(clientData.earnings - serverResult.earnings) > 100) {
        discrepancies.push({
          field: 'earnings',
          client: clientData.earnings,
          server: serverResult.earnings,
          difference: Math.abs(clientData.earnings - serverResult.earnings)
        });
      }

      if (clientData.offlineHours && Math.abs(clientData.offlineHours - serverResult.offlineHours) > 0.1) {
        discrepancies.push({
          field: 'offlineHours',
          client: clientData.offlineHours,
          server: serverResult.offlineHours,
          difference: Math.abs(clientData.offlineHours - serverResult.offlineHours)
        });
      }

      return {
        isValid: discrepancies.length === 0,
        discrepancies,
        serverResult,
        clientData
      };

    } catch (error) {
      console.error(`Offline progress validation error for user ${userId}:`, error);
      return {
        isValid: false,
        error: error.message,
        serverResult: null,
        clientData
      };
    }
  }

  /**
   * Create detailed earnings breakdown for UI display
   * @param {number} autoClickerRate - Auto-clicker rate per second
   * @param {number} offlineHours - Hours spent offline
   * @param {number} totalEarnings - Total earnings calculated
   * @returns {Object} Earnings breakdown
   */
  createEarningsBreakdown(autoClickerRate, offlineHours, totalEarnings) {
    const offlineSeconds = Math.floor(offlineHours * 3600);
    const earningsPerSecond = autoClickerRate;
    const earningsPerMinute = earningsPerSecond * 60;
    const earningsPerHour = earningsPerMinute * 60;

    return {
      autoClickerRate,
      offlineHours: Math.round(offlineHours * 100) / 100, // Round to 2 decimal places
      offlineSeconds,
      earningsPerSecond,
      earningsPerMinute,
      earningsPerHour,
      totalEarnings,
      cappedAt: offlineHours >= GAME_CONFIG.OFFLINE_EARNINGS_CAP_HOURS,
      maxOfflineHours: GAME_CONFIG.OFFLINE_EARNINGS_CAP_HOURS
    };
  }

  /**
   * Get offline progress preview without applying changes
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Preview of offline progress
   */
  async getOfflineProgressPreview(userId) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Calculate time offline
      const now = new Date();
      const lastCalculation = new Date(user.last_offline_calculation);
      const offlineTimeMs = now.getTime() - lastCalculation.getTime();
      const offlineHours = offlineTimeMs / (1000 * 60 * 60);

      // Cap offline hours
      const cappedHours = Math.min(offlineHours, GAME_CONFIG.OFFLINE_EARNINGS_CAP_HOURS);

      // Calculate potential earnings
      const autoClickerRate = user.auto_clicker_rate || 0;
      const potentialEarnings = calculateOfflineEarnings(autoClickerRate, cappedHours);

      return {
        canCollect: potentialEarnings > 0 && offlineHours >= (1 / 60),
        potentialEarnings,
        offlineHours: cappedHours,
        actualOfflineHours: offlineHours,
        autoClickerRate,
        breakdown: this.createEarningsBreakdown(autoClickerRate, cappedHours, potentialEarnings),
        lastCalculation: lastCalculation.toISOString()
      };

    } catch (error) {
      console.error(`Offline progress preview error for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Force update offline calculation timestamp (for testing or admin purposes)
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Update result
   */
  async forceUpdateOfflineTimestamp(userId) {
    try {
      const updatedUser = await this.userRepository.updateOfflineCalculation(userId);
      
      return {
        success: true,
        userId,
        newTimestamp: updatedUser.last_offline_calculation,
        message: 'Offline calculation timestamp updated'
      };

    } catch (error) {
      console.error(`Force update offline timestamp error for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get offline progress statistics for admin dashboard
   * @returns {Promise<Object>} Offline progress statistics
   */
  async getOfflineProgressStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE auto_clicker_rate > 0) as users_with_auto_clickers,
          AVG(auto_clicker_rate) as avg_auto_clicker_rate,
          MAX(auto_clicker_rate) as max_auto_clicker_rate,
          COUNT(*) FILTER (WHERE last_offline_calculation < NOW() - INTERVAL '1 hour') as users_offline_1h,
          COUNT(*) FILTER (WHERE last_offline_calculation < NOW() - INTERVAL '4 hours') as users_offline_4h,
          COUNT(*) FILTER (WHERE last_offline_calculation < NOW() - INTERVAL '24 hours') as users_offline_24h
        FROM users 
        WHERE is_active = true AND is_banned = false
      `;

      const stats = await this.userRepository.db.queryOne(query);

      return {
        totalUsers: parseInt(stats.total_users),
        usersWithAutoClickers: parseInt(stats.users_with_auto_clickers),
        avgAutoClickerRate: Math.round(parseFloat(stats.avg_auto_clicker_rate) || 0),
        maxAutoClickerRate: parseInt(stats.max_auto_clicker_rate) || 0,
        usersOffline1Hour: parseInt(stats.users_offline_1h),
        usersOffline4Hours: parseInt(stats.users_offline_4h),
        usersOffline24Hours: parseInt(stats.users_offline_24h),
        offlineCapHours: GAME_CONFIG.OFFLINE_EARNINGS_CAP_HOURS
      };

    } catch (error) {
      console.error('Error getting offline progress stats:', error);
      throw error;
    }
  }
}

module.exports = OfflineProgressService;