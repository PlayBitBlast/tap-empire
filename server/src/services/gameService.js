const { GAME_CONFIG } = require('../../../shared/constants/gameConfig');
const { 
  calculateCoinsPerTap, 
  calculateGoldenTapChance, 
  calculateGoldenTapEarnings,
  validateTapRate,
  generateGameStateChecksum
} = require('../../../shared/utils/calculations');
const UserRepository = require('../repositories/UserRepository');
const EventRepository = require('../repositories/EventRepository');
const LeaderboardService = require('./leaderboardService');
const AchievementService = require('./achievementService');

/**
 * Game service with comprehensive anti-cheat protection
 * Handles all core game mechanics with server-side validation
 */
class GameService {
  constructor(io = null) {
    this.userRepository = new UserRepository();
    this.eventRepository = new EventRepository();
    this.leaderboardService = new LeaderboardService(io);
    this.achievementService = new AchievementService();
    
    // In-memory storage for tap rate tracking
    this.userTapHistory = new Map();
    this.suspiciousActivity = new Map();
    
    // Clean up old tap history every 5 minutes (only in production)
    if (process.env.NODE_ENV !== 'test') {
      this.cleanupInterval = setInterval(() => this.cleanupTapHistory(), 5 * 60 * 1000);
    }
  }

  /**
   * Set Socket.io instance for real-time updates
   * @param {Object} io - Socket.io instance
   */
  setSocketIO(io) {
    this.leaderboardService.setSocketIO(io);
  }

  /**
   * Cleanup method for graceful shutdown
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Process a tap action with comprehensive validation
   * @param {number} userId - User ID
   * @param {Object} tapData - Tap data from client
   * @returns {Promise<Object>} Tap result with earnings and validation
   */
  async processTap(userId, tapData) {
    const { timestamp, clientChecksum } = tapData;
    
    try {
      // Get current user state
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate tap rate (anti-cheat)
      if (!this.validateTapRate(userId, timestamp)) {
        await this.flagSuspiciousActivity(userId, 'excessive_tap_rate', {
          timestamp,
          message: 'Tap rate exceeded maximum allowed'
        });
        throw new Error('Tap rate too high');
      }

      // Validate timestamp (prevent replay attacks)
      if (!this.validateTimestamp(timestamp)) {
        await this.flagSuspiciousActivity(userId, 'invalid_timestamp', {
          timestamp,
          serverTime: Date.now(),
          message: 'Invalid or old timestamp'
        });
        throw new Error('Invalid timestamp');
      }

      // Calculate server-side earnings
      const userState = await this.buildUserState(user);
      const baseEarnings = calculateCoinsPerTap(userState);
      
      // Check for Golden Tap
      const goldenTapChance = calculateGoldenTapChance(userState);
      const isGoldenTap = Math.random() < goldenTapChance;
      const finalEarnings = isGoldenTap ? calculateGoldenTapEarnings(baseEarnings) : baseEarnings;

      // Validate earnings against expected range (anti-cheat)
      if (!this.validateEarnings(finalEarnings, userState)) {
        await this.flagSuspiciousActivity(userId, 'invalid_earnings', {
          calculatedEarnings: finalEarnings,
          userState: this.sanitizeUserState(userState),
          message: 'Earnings calculation mismatch'
        });
        throw new Error('Invalid earnings calculation');
      }

      // Update user coins and total earned
      const updatedUser = await this.userRepository.addCoins(userId, finalEarnings);
      
      // Update leaderboard rankings
      try {
        await this.leaderboardService.updatePlayerRank(userId, updatedUser.total_coins_earned);
      } catch (leaderboardError) {
        console.error('Error updating leaderboard:', leaderboardError);
        // Don't fail the tap if leaderboard update fails
      }
      
      // Track achievements
      try {
        await this.achievementService.trackMilestone(userId, 'tap', 1);
        await this.achievementService.trackMilestone(userId, 'earn_coins', finalEarnings);
        
        if (isGoldenTap) {
          await this.achievementService.trackMilestone(userId, 'golden_tap', 1);
        }
        
        // Track taps per second for speed achievements
        const tapsPerSecond = this.calculateTapsPerSecond(userId);
        if (tapsPerSecond > 0) {
          await this.achievementService.trackMilestone(userId, 'max_taps_per_second', tapsPerSecond);
        }
      } catch (achievementError) {
        console.error('Error tracking achievements:', achievementError);
        // Don't fail the tap if achievement tracking fails
      }
      
      // Record tap in history for rate limiting
      this.recordTap(userId, timestamp);

      // Log game session activity
      await this.eventRepository.logGameAction(userId, 'tap', {
        earnings: finalEarnings,
        isGoldenTap,
        timestamp
      });

      // Generate new checksum for client validation
      const newChecksum = generateGameStateChecksum({
        coins: updatedUser.coins,
        total_coins_earned: updatedUser.total_coins_earned,
        coins_per_tap: updatedUser.coins_per_tap,
        auto_clicker_rate: updatedUser.auto_clicker_rate
      });

      return {
        success: true,
        earnings: finalEarnings,
        isGoldenTap,
        newCoins: updatedUser.coins,
        totalCoinsEarned: updatedUser.total_coins_earned,
        checksum: newChecksum,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error(`Tap processing error for user ${userId}:`, error);
      
      // Return safe error response
      return {
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Validate tap rate against anti-cheat limits
   * @param {number} userId - User ID
   * @param {number} timestamp - Tap timestamp
   * @returns {boolean} True if tap rate is valid
   */
  validateTapRate(userId, timestamp) {
    if (!this.userTapHistory.has(userId)) {
      this.userTapHistory.set(userId, []);
    }

    const tapHistory = this.userTapHistory.get(userId);
    const now = Date.now();
    const validationWindow = GAME_CONFIG.TAP_VALIDATION_WINDOW_MS;

    // Remove old taps outside validation window
    const recentTaps = tapHistory.filter(tapTime => now - tapTime < validationWindow);
    
    // Update tap history
    this.userTapHistory.set(userId, recentTaps);

    // Check if tap rate exceeds maximum
    return validateTapRate(recentTaps, GAME_CONFIG.MAX_TAPS_PER_SECOND);
  }

  /**
   * Validate timestamp to prevent replay attacks
   * @param {number} timestamp - Client timestamp
   * @returns {boolean} True if timestamp is valid
   */
  validateTimestamp(timestamp) {
    const now = Date.now();
    const maxAge = 30000; // 30 seconds max age
    const maxFuture = 5000; // 5 seconds max future
    
    return timestamp > (now - maxAge) && timestamp < (now + maxFuture);
  }

  /**
   * Validate earnings calculation against expected values
   * @param {number} earnings - Calculated earnings
   * @param {Object} userState - User's current state
   * @returns {boolean} True if earnings are valid
   */
  validateEarnings(earnings, userState) {
    const expectedBase = calculateCoinsPerTap(userState);
    const goldenMultiplier = GAME_CONFIG.GOLDEN_TAP_MULTIPLIER;
    
    // Earnings should be either base amount or golden tap amount
    return earnings === expectedBase || earnings === (expectedBase * goldenMultiplier);
  }

  /**
   * Build complete user state for calculations
   * @param {Object} user - User database record
   * @returns {Promise<Object>} Complete user state
   */
  async buildUserState(user) {
    // Get user upgrades
    const upgrades = await this.userRepository.db.queryMany(
      'SELECT upgrade_type, level FROM user_upgrades WHERE user_id = $1',
      [user.id]
    );

    // Build upgrades object
    const upgradeState = {};
    for (const upgrade of upgrades) {
      upgradeState[upgrade.upgrade_type] = upgrade.level;
    }

    // Get user achievements
    const achievements = await this.userRepository.db.queryMany(
      'SELECT achievement_id FROM user_achievements WHERE user_id = $1',
      [user.id]
    );

    return {
      ...user,
      upgrades: upgradeState,
      achievements: achievements.map(a => a.achievement_id),
      activeEventMultiplier: 1 // TODO: Get from active events
    };
  }

  /**
   * Record tap in user's tap history
   * @param {number} userId - User ID
   * @param {number} timestamp - Tap timestamp
   */
  recordTap(userId, timestamp) {
    if (!this.userTapHistory.has(userId)) {
      this.userTapHistory.set(userId, []);
    }

    const tapHistory = this.userTapHistory.get(userId);
    tapHistory.push(timestamp);

    // Keep only recent taps (last 10 seconds)
    const cutoff = Date.now() - 10000;
    const recentTaps = tapHistory.filter(tapTime => tapTime > cutoff);
    this.userTapHistory.set(userId, recentTaps);
  }

  /**
   * Flag suspicious activity for review
   * @param {number} userId - User ID
   * @param {string} activityType - Type of suspicious activity
   * @param {Object} details - Activity details
   */
  async flagSuspiciousActivity(userId, activityType, details) {
    const key = `${userId}_${activityType}`;
    
    if (!this.suspiciousActivity.has(key)) {
      this.suspiciousActivity.set(key, {
        userId,
        activityType,
        count: 0,
        firstOccurrence: Date.now(),
        lastOccurrence: Date.now(),
        details: []
      });
    }

    const activity = this.suspiciousActivity.get(key);
    activity.count++;
    activity.lastOccurrence = Date.now();
    activity.details.push({
      timestamp: Date.now(),
      ...details
    });

    // Log to database for admin review
    await this.eventRepository.logSuspiciousActivity(userId, activityType, details);

    // Auto-ban if too many violations
    if (activity.count >= 5) {
      await this.autoFlagAccount(userId, activityType, activity);
    }
  }

  /**
   * Automatically flag account for review or temporary ban
   * @param {number} userId - User ID
   * @param {string} reason - Reason for flagging
   * @param {Object} evidence - Evidence of suspicious activity
   */
  async autoFlagAccount(userId, reason, evidence) {
    try {
      // Mark user as flagged for review
      await this.userRepository.update(userId, {
        is_flagged: true,
        flag_reason: reason,
        flag_timestamp: new Date()
      });

      // Log the auto-flag event
      await this.eventRepository.logGameAction(userId, 'account_flagged', {
        reason,
        evidence: {
          count: evidence.count,
          timespan: evidence.lastOccurrence - evidence.firstOccurrence,
          details: evidence.details.slice(-3) // Last 3 incidents
        },
        automated: true
      });

      console.warn(`Account ${userId} auto-flagged for ${reason}`);
    } catch (error) {
      console.error(`Failed to auto-flag account ${userId}:`, error);
    }
  }

  /**
   * Validate and correct client game state
   * @param {number} userId - User ID
   * @param {Object} clientState - Client's reported game state
   * @returns {Promise<Object>} Corrected server state
   */
  async validateAndCorrectState(userId, clientState) {
    try {
      // Get authoritative server state
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const serverState = await this.buildUserState(user);
      
      // Compare critical values
      const discrepancies = [];
      
      if (Math.abs(clientState.coins - serverState.coins) > 1000) {
        discrepancies.push({
          field: 'coins',
          client: clientState.coins,
          server: serverState.coins,
          difference: Math.abs(clientState.coins - serverState.coins)
        });
      }

      if (clientState.total_coins_earned < serverState.total_coins_earned) {
        discrepancies.push({
          field: 'total_coins_earned',
          client: clientState.total_coins_earned,
          server: serverState.total_coins_earned,
          difference: serverState.total_coins_earned - clientState.total_coins_earned
        });
      }

      // If significant discrepancies found, flag and correct
      if (discrepancies.length > 0) {
        await this.flagSuspiciousActivity(userId, 'state_mismatch', {
          discrepancies,
          clientState: this.sanitizeUserState(clientState),
          serverState: this.sanitizeUserState(serverState)
        });

        // Return corrected server state
        return {
          corrected: true,
          discrepancies,
          serverState: {
            coins: serverState.coins,
            total_coins_earned: serverState.total_coins_earned,
            coins_per_tap: serverState.coins_per_tap,
            auto_clicker_rate: serverState.auto_clicker_rate,
            checksum: generateGameStateChecksum(serverState)
          }
        };
      }

      return {
        corrected: false,
        serverState: {
          coins: serverState.coins,
          total_coins_earned: serverState.total_coins_earned,
          coins_per_tap: serverState.coins_per_tap,
          auto_clicker_rate: serverState.auto_clicker_rate,
          checksum: generateGameStateChecksum(serverState)
        }
      };

    } catch (error) {
      console.error(`State validation error for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Clean up old tap history data
   */
  cleanupTapHistory() {
    const cutoff = Date.now() - (5 * 60 * 1000); // 5 minutes ago
    
    for (const [userId, tapHistory] of this.userTapHistory.entries()) {
      const recentTaps = tapHistory.filter(tapTime => tapTime > cutoff);
      
      if (recentTaps.length === 0) {
        this.userTapHistory.delete(userId);
      } else {
        this.userTapHistory.set(userId, recentTaps);
      }
    }

    // Clean up old suspicious activity records
    for (const [key, activity] of this.suspiciousActivity.entries()) {
      if (Date.now() - activity.lastOccurrence > (24 * 60 * 60 * 1000)) { // 24 hours
        this.suspiciousActivity.delete(key);
      }
    }
  }

  /**
   * Calculate current taps per second for a user
   * @param {number} userId - User ID
   * @returns {number} Taps per second
   */
  calculateTapsPerSecond(userId) {
    const tapHistory = this.userTapHistory.get(userId) || [];
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    
    // Count taps in the last second
    const recentTaps = tapHistory.filter(tapTime => tapTime > oneSecondAgo);
    return recentTaps.length;
  }

  /**
   * Sanitize user state for logging (remove sensitive data)
   * @param {Object} userState - User state object
   * @returns {Object} Sanitized state
   */
  sanitizeUserState(userState) {
    return {
      coins: userState.coins,
      total_coins_earned: userState.total_coins_earned,
      coins_per_tap: userState.coins_per_tap,
      auto_clicker_rate: userState.auto_clicker_rate,
      prestige_level: userState.prestige_level,
      upgradeCount: Object.keys(userState.upgrades || {}).length,
      achievementCount: (userState.achievements || []).length
    };
  }

  /**
   * Get anti-cheat statistics for admin dashboard
   * @returns {Object} Anti-cheat statistics
   */
  getAntiCheatStats() {
    const stats = {
      activeTapSessions: this.userTapHistory.size,
      suspiciousActivities: this.suspiciousActivity.size,
      activityBreakdown: {}
    };

    // Count suspicious activities by type
    for (const activity of this.suspiciousActivity.values()) {
      if (!stats.activityBreakdown[activity.activityType]) {
        stats.activityBreakdown[activity.activityType] = 0;
      }
      stats.activityBreakdown[activity.activityType]++;
    }

    return stats;
  }
}

module.exports = GameService;