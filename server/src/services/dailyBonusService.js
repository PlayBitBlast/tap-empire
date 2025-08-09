const UserRepository = require('../repositories/UserRepository');
const { DAILY_BONUS_CONFIG } = require('../../../shared/constants/gameConfig');

/**
 * Service for managing daily login bonuses and streak system
 */
class DailyBonusService {
  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Check if user is eligible for daily bonus
   * @param {Object} user - User record
   * @returns {Object} Eligibility status and bonus info
   */
  checkDailyBonusEligibility(user) {
    const now = new Date();
    const lastLogin = user.last_login ? new Date(user.last_login) : null;
    
    // If no previous login, user is eligible
    if (!lastLogin) {
      return {
        eligible: true,
        streakDay: 1,
        bonusAmount: this.calculateBonusAmount(1),
        multiplier: 1,
        isNewStreak: true
      };
    }

    // Calculate hours since last login
    const hoursSinceLogin = (now - lastLogin) / (1000 * 60 * 60);
    
    // Must be at least 20 hours since last login to be eligible
    if (hoursSinceLogin < 20) {
      const hoursUntilEligible = Math.ceil(24 - hoursSinceLogin);
      return {
        eligible: false,
        hoursUntilEligible,
        currentStreak: user.login_streak,
        nextBonusAmount: this.calculateBonusAmount(user.login_streak + 1)
      };
    }

    // Check if streak should continue or reset
    const daysSinceLogin = hoursSinceLogin / 24;
    let newStreakDay;
    let isNewStreak = false;

    if (daysSinceLogin <= 1.5) { // Within 36 hours - continue streak
      newStreakDay = Math.min(user.login_streak + 1, DAILY_BONUS_CONFIG.MAX_STREAK);
    } else { // More than 36 hours - reset streak
      newStreakDay = 1;
      isNewStreak = true;
    }

    const bonusAmount = this.calculateBonusAmount(newStreakDay);
    const multiplier = this.getStreakMultiplier(newStreakDay);

    return {
      eligible: true,
      streakDay: newStreakDay,
      bonusAmount,
      multiplier,
      isNewStreak,
      previousStreak: user.login_streak
    };
  }

  /**
   * Calculate bonus amount based on streak day
   * @param {number} streakDay - Current streak day (1-7)
   * @returns {number} Bonus amount in coins
   */
  calculateBonusAmount(streakDay) {
    const baseAmount = DAILY_BONUS_CONFIG.BASE_AMOUNT;
    const multiplier = this.getStreakMultiplier(streakDay);
    return Math.floor(baseAmount * multiplier);
  }

  /**
   * Get streak multiplier for given day
   * @param {number} streakDay - Current streak day (1-7)
   * @returns {number} Multiplier value
   */
  getStreakMultiplier(streakDay) {
    const clampedDay = Math.min(Math.max(streakDay, 1), DAILY_BONUS_CONFIG.MAX_STREAK);
    return DAILY_BONUS_CONFIG.STREAK_MULTIPLIERS[clampedDay - 1] || 1;
  }

  /**
   * Claim daily bonus for user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Bonus claim result
   */
  async claimDailyBonus(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const eligibility = this.checkDailyBonusEligibility(user);
    if (!eligibility.eligible) {
      throw new Error(`Daily bonus not available. Try again in ${eligibility.hoursUntilEligible} hours.`);
    }

    // Check if bonus already claimed today
    const today = new Date().toISOString().split('T')[0];
    const existingBonus = await this.getDailyBonusRecord(userId, today);
    if (existingBonus) {
      throw new Error('Daily bonus already claimed today');
    }

    // Update user streak and last login
    await this.userRepository.updateLoginStreak(userId, eligibility.streakDay);
    
    // Add bonus coins
    await this.userRepository.addCoins(userId, eligibility.bonusAmount);

    // Record the bonus claim
    await this.recordDailyBonus(userId, eligibility);

    return {
      success: true,
      bonusAmount: eligibility.bonusAmount,
      streakDay: eligibility.streakDay,
      multiplier: eligibility.multiplier,
      isNewStreak: eligibility.isNewStreak,
      previousStreak: eligibility.previousStreak,
      nextBonusAmount: this.calculateBonusAmount(Math.min(eligibility.streakDay + 1, DAILY_BONUS_CONFIG.MAX_STREAK))
    };
  }

  /**
   * Get daily bonus record for specific date
   * @param {number} userId - User ID
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Object|null>} Bonus record or null
   */
  async getDailyBonusRecord(userId, date) {
    const query = `
      SELECT * FROM daily_bonuses 
      WHERE user_id = $1 AND bonus_date = $2
    `;
    return await this.userRepository.db.queryOne(query, [userId, date]);
  }

  /**
   * Record daily bonus claim in database
   * @param {number} userId - User ID
   * @param {Object} bonusInfo - Bonus information
   * @returns {Promise<Object>} Created bonus record
   */
  async recordDailyBonus(userId, bonusInfo) {
    const query = `
      INSERT INTO daily_bonuses (user_id, bonus_date, streak_day, bonus_amount, multiplier)
      VALUES ($1, CURRENT_DATE, $2, $3, $4)
      RETURNING *
    `;
    return await this.userRepository.db.queryOne(query, [
      userId,
      bonusInfo.streakDay,
      bonusInfo.bonusAmount,
      bonusInfo.multiplier
    ]);
  }

  /**
   * Get user's daily bonus history
   * @param {number} userId - User ID
   * @param {number} limit - Number of records to return
   * @returns {Promise<Array>} Bonus history
   */
  async getDailyBonusHistory(userId, limit = 30) {
    const query = `
      SELECT bonus_date, streak_day, bonus_amount, multiplier, claimed_at
      FROM daily_bonuses 
      WHERE user_id = $1
      ORDER BY bonus_date DESC
      LIMIT $2
    `;
    return await this.userRepository.db.queryMany(query, [userId, limit]);
  }

  /**
   * Get streak statistics for user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Streak statistics
   */
  async getStreakStatistics(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const eligibility = this.checkDailyBonusEligibility(user);
    
    // Get longest streak from history
    const longestStreakQuery = `
      WITH streak_groups AS (
        SELECT bonus_date, streak_day,
               ROW_NUMBER() OVER (ORDER BY bonus_date) - 
               ROW_NUMBER() OVER (PARTITION BY streak_day ORDER BY bonus_date) as grp
        FROM daily_bonuses 
        WHERE user_id = $1
        ORDER BY bonus_date
      ),
      streak_lengths AS (
        SELECT MAX(streak_day) as max_streak_in_group
        FROM streak_groups
        GROUP BY grp
      )
      SELECT COALESCE(MAX(max_streak_in_group), 0) as longest_streak
      FROM streak_lengths
    `;
    const longestStreakResult = await this.userRepository.db.queryOne(longestStreakQuery, [userId]);

    // Get total bonuses claimed
    const totalBonusesQuery = `
      SELECT COUNT(*) as total_bonuses, COALESCE(SUM(bonus_amount), 0) as total_bonus_coins
      FROM daily_bonuses 
      WHERE user_id = $1
    `;
    const totalBonusesResult = await this.userRepository.db.queryOne(totalBonusesQuery, [userId]);

    return {
      currentStreak: user.login_streak,
      longestStreak: parseInt(longestStreakResult.longest_streak),
      totalBonusesClaimed: parseInt(totalBonusesResult.total_bonuses),
      totalBonusCoins: parseInt(totalBonusesResult.total_bonus_coins),
      eligibility,
      nextBonusAmount: eligibility.eligible ? eligibility.bonusAmount : eligibility.nextBonusAmount
    };
  }

  /**
   * Reset all user streaks (admin function)
   * @returns {Promise<number>} Number of users affected
   */
  async resetAllStreaks() {
    const query = `
      UPDATE users 
      SET login_streak = 0, updated_at = NOW()
      WHERE login_streak > 0
    `;
    const result = await this.userRepository.db.query(query);
    return result.rowCount;
  }

  /**
   * Get daily bonus statistics for admin dashboard
   * @returns {Promise<Object>} Daily bonus statistics
   */
  async getDailyBonusStatistics() {
    const query = `
      SELECT 
        COUNT(DISTINCT user_id) as unique_claimers,
        COUNT(*) as total_claims,
        SUM(bonus_amount) as total_coins_given,
        AVG(streak_day) as avg_streak_day,
        MAX(streak_day) as max_streak_day,
        COUNT(*) FILTER (WHERE bonus_date = CURRENT_DATE) as claims_today,
        COUNT(*) FILTER (WHERE bonus_date >= CURRENT_DATE - INTERVAL '7 days') as claims_this_week
      FROM daily_bonuses
    `;
    return await this.userRepository.db.queryOne(query);
  }
}

module.exports = DailyBonusService;