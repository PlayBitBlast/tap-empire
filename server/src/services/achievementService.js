const AchievementRepository = require('../repositories/AchievementRepository');
const UserRepository = require('../repositories/UserRepository');
const { ACHIEVEMENT_CATEGORIES } = require('../../../shared/constants/gameConfig');

/**
 * Achievement service for managing achievements and milestone tracking
 */
class AchievementService {
  constructor() {
    this.achievementRepo = new AchievementRepository();
    this.userRepo = new UserRepository();
  }

  /**
   * Get all achievements with user progress
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Achievements grouped by category with progress
   */
  async getAchievementsWithProgress(userId) {
    const achievements = await this.achievementRepo.getUserAchievementProgress(userId);
    const userStats = await this.getUserStats(userId);
    
    // Group achievements by category
    const categorizedAchievements = {};
    
    for (const achievement of achievements) {
      const category = achievement.category;
      
      if (!categorizedAchievements[category]) {
        categorizedAchievements[category] = {
          ...ACHIEVEMENT_CATEGORIES[category],
          achievements: []
        };
      }
      
      // Calculate progress for locked achievements
      const progress = this.calculateAchievementProgress(achievement, userStats);
      
      categorizedAchievements[category].achievements.push({
        ...achievement,
        progress: progress.current,
        progressPercentage: progress.percentage,
        isUnlocked: achievement.unlocked
      });
    }
    
    return categorizedAchievements;
  }

  /**
   * Check and unlock achievements for a user based on their current stats
   * @param {number} userId - User ID
   * @param {string} triggerType - Type of action that triggered the check
   * @returns {Promise<Array>} Newly unlocked achievements
   */
  async checkAndUnlockAchievements(userId, triggerType = null) {
    const userStats = await this.getUserStats(userId);
    const unlockableAchievements = await this.achievementRepo.getUnlockableAchievements(userId, userStats);
    
    if (unlockableAchievements.length === 0) {
      return [];
    }
    
    // Filter achievements by trigger type if specified
    let achievementsToUnlock = unlockableAchievements;
    if (triggerType) {
      achievementsToUnlock = unlockableAchievements.filter(achievement => 
        this.isAchievementTriggeredBy(achievement, triggerType)
      );
    }
    
    // Unlock achievements
    const unlockedAchievements = [];
    for (const achievement of achievementsToUnlock) {
      const unlocked = await this.achievementRepo.unlockAchievement(userId, achievement.id);
      if (unlocked) {
        // Apply achievement rewards
        await this.applyAchievementRewards(userId, achievement);
        unlockedAchievements.push({
          ...achievement,
          unlockedAt: unlocked.unlocked_at || new Date()
        });
      }
    }
    
    return unlockedAchievements;
  }

  /**
   * Get user's achievement statistics
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Achievement statistics
   */
  async getUserAchievementStats(userId) {
    const completionRate = await this.achievementRepo.getUserCompletionRate(userId);
    const userAchievements = await this.achievementRepo.getUserAchievements(userId);
    
    // Group achievements by category for stats
    const categoryStats = {};
    for (const achievement of userAchievements) {
      const category = achievement.category;
      if (!categoryStats[category]) {
        categoryStats[category] = {
          name: ACHIEVEMENT_CATEGORIES[category]?.name || category,
          count: 0,
          totalRewardCoins: 0
        };
      }
      categoryStats[category].count++;
      categoryStats[category].totalRewardCoins += achievement.reward_coins || 0;
    }
    
    return {
      ...completionRate,
      categoryStats,
      recentAchievements: userAchievements.slice(0, 5) // Last 5 achievements
    };
  }

  /**
   * Get achievement leaderboard
   * @param {number} limit - Number of users to return
   * @returns {Promise<Array>} Achievement leaderboard
   */
  async getAchievementLeaderboard(limit = 100) {
    return await this.achievementRepo.getAchievementLeaderboard(limit);
  }

  /**
   * Get popular and rare achievements
   * @returns {Promise<Object>} Popular and rare achievements
   */
  async getAchievementStatistics() {
    const [popular, rare, stats] = await Promise.all([
      this.achievementRepo.getMostPopularAchievements(10),
      this.achievementRepo.getRarestAchievements(10),
      this.achievementRepo.getAchievementStatistics()
    ]);
    
    return {
      mostPopular: popular,
      rarest: rare,
      statistics: stats
    };
  }

  /**
   * Track milestone for achievement system
   * @param {number} userId - User ID
   * @param {string} milestoneType - Type of milestone
   * @param {number} value - Milestone value
   * @returns {Promise<Array>} Newly unlocked achievements
   */
  async trackMilestone(userId, milestoneType, value = 1) {
    // Update user stats based on milestone type
    await this.updateUserMilestone(userId, milestoneType, value);
    
    // Check for newly unlocked achievements
    return await this.checkAndUnlockAchievements(userId, milestoneType);
  }

  /**
   * Get recent achievement unlocks across all users
   * @param {number} limit - Number of recent unlocks
   * @returns {Promise<Array>} Recent achievement unlocks
   */
  async getRecentUnlocks(limit = 50) {
    return await this.achievementRepo.getRecentUnlocks(limit);
  }

  /**
   * Share achievement to Telegram
   * @param {number} userId - User ID
   * @param {number} achievementId - Achievement ID
   * @returns {Promise<Object>} Share data for Telegram
   */
  async shareAchievement(userId, achievementId) {
    const achievement = await this.achievementRepo.findById(achievementId);
    const user = await this.userRepo.findById(userId);
    
    if (!achievement || !user) {
      throw new Error('Achievement or user not found');
    }
    
    // Check if user has this achievement
    const hasAchievement = await this.achievementRepo.hasAchievement(userId, achievementId);
    if (!hasAchievement) {
      throw new Error('User does not have this achievement');
    }
    
    const shareText = `🏆 I just unlocked "${achievement.name}" in Tap Empire! ${achievement.description}`;
    const shareUrl = `https://t.me/TapEmpireBot/game?startapp=achievement_${achievementId}`;
    
    return {
      text: shareText,
      url: shareUrl,
      achievement: {
        name: achievement.name,
        description: achievement.description,
        category: achievement.category,
        icon: ACHIEVEMENT_CATEGORIES[achievement.category]?.icon || '🏆'
      }
    };
  }

  /**
   * Calculate achievement progress for a user
   * @param {Object} achievement - Achievement object
   * @param {Object} userStats - User statistics
   * @returns {Object} Progress information
   */
  calculateAchievementProgress(achievement, userStats) {
    const requirementType = achievement.requirement_type;
    const requirementValue = achievement.requirement_value;
    
    let currentValue = 0;
    
    switch (requirementType) {
      case 'total_taps':
        currentValue = userStats.totalTaps || 0;
        break;
      case 'total_coins_earned':
        currentValue = userStats.totalCoinsEarned || 0;
        break;
      case 'total_upgrades':
        currentValue = userStats.totalUpgrades || 0;
        break;
      case 'golden_taps_count':
        currentValue = userStats.goldenTapsCount || 0;
        break;
      case 'friends_count':
        currentValue = userStats.friendsCount || 0;
        break;
      case 'gifts_sent':
        currentValue = userStats.giftsSent || 0;
        break;
      case 'max_login_streak':
        currentValue = userStats.maxLoginStreak || 0;
        break;
      case 'prestige_level':
        currentValue = userStats.prestigeLevel || 0;
        break;
      case 'max_taps_per_second':
        currentValue = userStats.maxTapsPerSecond || 0;
        break;
      default:
        currentValue = 0;
    }
    
    const percentage = Math.min(100, Math.round((currentValue / requirementValue) * 100));
    
    return {
      current: currentValue,
      required: requirementValue,
      percentage
    };
  }

  /**
   * Get user statistics for achievement calculations
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User statistics
   */
  async getUserStats(userId) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Get additional stats from user_stats table if it exists
    const statsQuery = `
      SELECT 
        total_taps,
        golden_taps_count,
        max_taps_per_second,
        max_login_streak,
        gifts_sent,
        tutorial_completed,
        morning_sessions,
        night_sessions,
        weekend_events_participated
      FROM user_stats 
      WHERE user_id = $1
    `;
    
    let additionalStats = {};
    try {
      additionalStats = await this.userRepo.db.queryOne(statsQuery, [userId]) || {};
    } catch (error) {
      // user_stats table might not exist yet, use defaults
      additionalStats = {};
    }
    
    // Get friends count
    const friendsCountQuery = `
      SELECT COUNT(*) as count FROM friendships WHERE user_id = $1
    `;
    const friendsResult = await this.userRepo.db.queryOne(friendsCountQuery, [userId]);
    
    // Get total upgrades count
    const upgradesCountQuery = `
      SELECT COALESCE(SUM(level), 0) as count FROM user_upgrades WHERE user_id = $1
    `;
    const upgradesResult = await this.userRepo.db.queryOne(upgradesCountQuery, [userId]);
    
    return {
      totalTaps: additionalStats.total_taps || 0,
      totalCoinsEarned: user.total_coins_earned || 0,
      totalUpgrades: upgradesResult?.count || 0,
      goldenTapsCount: additionalStats.golden_taps_count || 0,
      friendsCount: friendsResult?.count || 0,
      giftsSent: additionalStats.gifts_sent || 0,
      maxLoginStreak: additionalStats.max_login_streak || user.login_streak || 0,
      prestigeLevel: user.prestige_level || 0,
      maxTapsPerSecond: additionalStats.max_taps_per_second || 0,
      tutorialCompleted: additionalStats.tutorial_completed || 0,
      morningSessions: additionalStats.morning_sessions || 0,
      nightSessions: additionalStats.night_sessions || 0,
      weekendEventsParticipated: additionalStats.weekend_events_participated || 0,
      prestigeProgress: user.total_coins_earned || 0
    };
  }

  /**
   * Check if achievement is triggered by specific action type
   * @param {Object} achievement - Achievement object
   * @param {string} triggerType - Trigger type
   * @returns {boolean} True if achievement is triggered by this action
   */
  isAchievementTriggeredBy(achievement, triggerType) {
    const triggerMap = {
      'tap': ['total_taps', 'max_taps_per_second'],
      'golden_tap': ['golden_taps_count'],
      'upgrade': ['total_upgrades'],
      'earn_coins': ['total_coins_earned'],
      'add_friend': ['friends_count'],
      'send_gift': ['gifts_sent'],
      'login_streak': ['max_login_streak'],
      'prestige': ['prestige_level'],
      'tutorial': ['tutorial_completed'],
      'morning_session': ['morning_sessions'],
      'night_session': ['night_sessions'],
      'weekend_event': ['weekend_events_participated']
    };
    
    const relevantTypes = triggerMap[triggerType] || [];
    return relevantTypes.includes(achievement.requirement_type);
  }

  /**
   * Apply achievement rewards to user
   * @param {number} userId - User ID
   * @param {Object} achievement - Achievement object
   */
  async applyAchievementRewards(userId, achievement) {
    if (achievement.reward_coins > 0) {
      await this.userRepo.updateCoins(userId, achievement.reward_coins);
    }
    
    // Apply multiplier bonus if needed (this would be handled by the game engine)
    if (achievement.reward_multiplier > 1.0) {
      // Store multiplier bonus in user profile or separate table
      const updateQuery = `
        UPDATE users 
        SET achievement_multiplier = COALESCE(achievement_multiplier, 1.0) * $2
        WHERE id = $1
      `;
      await this.userRepo.db.query(updateQuery, [userId, achievement.reward_multiplier]);
    }
  }

  /**
   * Update user milestone statistics
   * @param {number} userId - User ID
   * @param {string} milestoneType - Type of milestone
   * @param {number} value - Value to add/set
   */
  async updateUserMilestone(userId, milestoneType, value) {
    // Ensure user_stats table exists and has a record for this user
    const upsertStatsQuery = `
      INSERT INTO user_stats (user_id) 
      VALUES ($1) 
      ON CONFLICT (user_id) DO NOTHING
    `;
    await this.userRepo.db.query(upsertStatsQuery, [userId]);
    
    // Update specific milestone based on type
    let updateQuery = '';
    let params = [userId];
    
    switch (milestoneType) {
      case 'tap':
        updateQuery = `
          UPDATE user_stats 
          SET total_taps = COALESCE(total_taps, 0) + $2,
              updated_at = NOW()
          WHERE user_id = $1
        `;
        params.push(value);
        break;
        
      case 'golden_tap':
        updateQuery = `
          UPDATE user_stats 
          SET golden_taps_count = COALESCE(golden_taps_count, 0) + $2,
              updated_at = NOW()
          WHERE user_id = $1
        `;
        params.push(value);
        break;
        
      case 'max_taps_per_second':
        updateQuery = `
          UPDATE user_stats 
          SET max_taps_per_second = GREATEST(COALESCE(max_taps_per_second, 0), $2),
              updated_at = NOW()
          WHERE user_id = $1
        `;
        params.push(value);
        break;
        
      case 'send_gift':
        updateQuery = `
          UPDATE user_stats 
          SET gifts_sent = COALESCE(gifts_sent, 0) + $2,
              updated_at = NOW()
          WHERE user_id = $1
        `;
        params.push(value);
        break;
        
      case 'login_streak':
        updateQuery = `
          UPDATE user_stats 
          SET max_login_streak = GREATEST(COALESCE(max_login_streak, 0), $2),
              updated_at = NOW()
          WHERE user_id = $1
        `;
        params.push(value);
        break;
        
      case 'tutorial':
        updateQuery = `
          UPDATE user_stats 
          SET tutorial_completed = 1,
              updated_at = NOW()
          WHERE user_id = $1
        `;
        break;
        
      case 'morning_session':
        updateQuery = `
          UPDATE user_stats 
          SET morning_sessions = COALESCE(morning_sessions, 0) + 1,
              updated_at = NOW()
          WHERE user_id = $1
        `;
        break;
        
      case 'night_session':
        updateQuery = `
          UPDATE user_stats 
          SET night_sessions = COALESCE(night_sessions, 0) + 1,
              updated_at = NOW()
          WHERE user_id = $1
        `;
        break;
        
      case 'weekend_event':
        updateQuery = `
          UPDATE user_stats 
          SET weekend_events_participated = COALESCE(weekend_events_participated, 0) + 1,
              updated_at = NOW()
          WHERE user_id = $1
        `;
        break;
    }
    
    if (updateQuery) {
      await this.userRepo.db.query(updateQuery, params);
    }
  }
}

module.exports = AchievementService;