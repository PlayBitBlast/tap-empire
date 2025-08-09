const BaseRepository = require('./BaseRepository');

/**
 * Game session repository for anti-cheat tracking and session management
 */
class GameSessionRepository extends BaseRepository {
  constructor() {
    super('game_sessions');
  }

  /**
   * Start a new game session
   * @param {number} userId - User ID
   * @param {string} ipAddress - Client IP address
   * @param {string} userAgent - Client user agent
   * @returns {Promise<Object>} Created session record
   */
  async startSession(userId, ipAddress = null, userAgent = null) {
    return await this.create({
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      start_time: new Date(),
      total_taps: 0,
      total_earnings: 0,
      suspicious_activity: false
    });
  }

  /**
   * End a game session
   * @param {number} sessionId - Session ID
   * @returns {Promise<Object>} Updated session record
   */
  async endSession(sessionId) {
    return await this.update(sessionId, {
      end_time: new Date()
    });
  }

  /**
   * Update session statistics
   * @param {number} sessionId - Session ID
   * @param {number} taps - Number of taps to add
   * @param {number} earnings - Earnings to add
   * @returns {Promise<Object>} Updated session record
   */
  async updateSessionStats(sessionId, taps, earnings) {
    const query = `
      UPDATE game_sessions
      SET total_taps = total_taps + $2,
          total_earnings = total_earnings + $3,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    return await this.db.queryOne(query, [sessionId, taps, earnings]);
  }

  /**
   * Mark session as suspicious
   * @param {number} sessionId - Session ID
   * @param {string} reason - Reason for suspicion
   * @returns {Promise<Object>} Updated session record
   */
  async markSuspicious(sessionId, reason = null) {
    return await this.update(sessionId, {
      suspicious_activity: true,
      // Store reason in a separate field if needed
    });
  }

  /**
   * Get active sessions for a user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Active sessions
   */
  async getActiveSessions(userId) {
    return await this.findAll({
      user_id: userId,
      end_time: null
    }, { orderBy: 'start_time DESC' });
  }

  /**
   * Get user's session history
   * @param {number} userId - User ID
   * @param {number} limit - Number of sessions to return
   * @returns {Promise<Array>} Session history
   */
  async getUserSessions(userId, limit = 50) {
    return await this.findAll(
      { user_id: userId },
      { 
        orderBy: 'start_time DESC',
        limit
      }
    );
  }

  /**
   * Get suspicious sessions for review
   * @param {number} limit - Number of sessions to return
   * @returns {Promise<Array>} Suspicious sessions
   */
  async getSuspiciousSessions(limit = 100) {
    const query = `
      SELECT 
        gs.*,
        u.username,
        u.first_name,
        u.last_name,
        u.telegram_id
      FROM game_sessions gs
      JOIN users u ON gs.user_id = u.id
      WHERE gs.suspicious_activity = true
      ORDER BY gs.start_time DESC
      LIMIT $1
    `;
    return await this.db.queryMany(query, [limit]);
  }

  /**
   * Get session statistics for a user
   * @param {number} userId - User ID
   * @param {number} days - Number of days to look back
   * @returns {Promise<Object>} Session statistics
   */
  async getUserSessionStats(userId, days = 30) {
    const query = `
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE end_time IS NOT NULL) as completed_sessions,
        COUNT(*) FILTER (WHERE suspicious_activity = true) as suspicious_sessions,
        SUM(total_taps) as total_taps,
        SUM(total_earnings) as total_earnings,
        AVG(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time))) as avg_session_duration,
        MAX(total_taps) as max_taps_per_session,
        MAX(total_earnings) as max_earnings_per_session
      FROM game_sessions
      WHERE user_id = $1 
        AND start_time >= NOW() - INTERVAL '${days} days'
    `;
    return await this.db.queryOne(query, [userId]);
  }

  /**
   * Get tap rate analysis for anti-cheat
   * @param {number} sessionId - Session ID
   * @returns {Promise<Array>} Tap events with timing analysis
   */
  async getSessionTapAnalysis(sessionId) {
    const query = `
      SELECT 
        te.*,
        LAG(te.tap_timestamp) OVER (ORDER BY te.tap_timestamp) as prev_tap_time,
        EXTRACT(EPOCH FROM (te.tap_timestamp - LAG(te.tap_timestamp) OVER (ORDER BY te.tap_timestamp))) as time_diff
      FROM tap_events te
      WHERE te.session_id = $1
      ORDER BY te.tap_timestamp
    `;
    return await this.db.queryMany(query, [sessionId]);
  }

  /**
   * Record a tap event
   * @param {number} userId - User ID
   * @param {number} sessionId - Session ID
   * @param {number} earnings - Earnings from tap
   * @param {boolean} isGoldenTap - Whether it was a golden tap
   * @param {number} clientTimestamp - Client-side timestamp
   * @returns {Promise<Object>} Created tap event record
   */
  async recordTapEvent(userId, sessionId, earnings, isGoldenTap = false, clientTimestamp = null) {
    const query = `
      INSERT INTO tap_events (user_id, session_id, earnings, is_golden_tap, client_timestamp)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    return await this.db.queryOne(query, [userId, sessionId, earnings, isGoldenTap, clientTimestamp]);
  }

  /**
   * Get recent tap events for rate limiting
   * @param {number} userId - User ID
   * @param {number} seconds - Time window in seconds
   * @returns {Promise<Array>} Recent tap events
   */
  async getRecentTaps(userId, seconds = 1) {
    const query = `
      SELECT * FROM tap_events
      WHERE user_id = $1 
        AND tap_timestamp >= NOW() - INTERVAL '${seconds} seconds'
      ORDER BY tap_timestamp DESC
    `;
    return await this.db.queryMany(query, [userId]);
  }

  /**
   * Clean up old sessions and tap events
   * @param {number} daysOld - Age threshold in days
   * @returns {Promise<Object>} Cleanup statistics
   */
  async cleanupOldData(daysOld = 90) {
    return await this.transaction(async (client) => {
      // Delete old tap events first (foreign key constraint)
      const tapEventsQuery = `
        DELETE FROM tap_events
        WHERE created_at < NOW() - INTERVAL '${daysOld} days'
      `;
      const tapEventsResult = await client.query(tapEventsQuery);

      // Delete old sessions
      const sessionsQuery = `
        DELETE FROM game_sessions
        WHERE start_time < NOW() - INTERVAL '${daysOld} days'
      `;
      const sessionsResult = await client.query(sessionsQuery);

      return {
        deletedTapEvents: tapEventsResult.rowCount,
        deletedSessions: sessionsResult.rowCount
      };
    });
  }

  /**
   * Get global session statistics
   * @returns {Promise<Object>} Global session statistics
   */
  async getGlobalStats() {
    const query = `
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(*) FILTER (WHERE suspicious_activity = true) as suspicious_sessions,
        SUM(total_taps) as total_taps,
        SUM(total_earnings) as total_earnings,
        AVG(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time))) as avg_session_duration,
        COUNT(*) FILTER (WHERE start_time >= NOW() - INTERVAL '24 hours') as sessions_today,
        COUNT(*) FILTER (WHERE start_time >= NOW() - INTERVAL '7 days') as sessions_this_week
      FROM game_sessions
    `;
    return await this.db.queryOne(query);
  }

  /**
   * Get hourly session distribution for analytics
   * @param {number} days - Number of days to analyze
   * @returns {Promise<Array>} Hourly session counts
   */
  async getHourlyDistribution(days = 7) {
    const query = `
      SELECT 
        EXTRACT(HOUR FROM start_time) as hour,
        COUNT(*) as session_count,
        COUNT(DISTINCT user_id) as unique_users
      FROM game_sessions
      WHERE start_time >= NOW() - INTERVAL '${days} days'
      GROUP BY EXTRACT(HOUR FROM start_time)
      ORDER BY hour
    `;
    return await this.db.queryMany(query);
  }

  /**
   * Detect potential bot behavior
   * @param {number} userId - User ID
   * @param {number} hours - Time window in hours
   * @returns {Promise<Object>} Bot detection analysis
   */
  async detectBotBehavior(userId, hours = 24) {
    const query = `
      WITH session_analysis AS (
        SELECT 
          gs.id,
          gs.total_taps,
          gs.total_earnings,
          EXTRACT(EPOCH FROM (COALESCE(gs.end_time, NOW()) - gs.start_time)) as duration_seconds,
          COUNT(te.id) as tap_events_count
        FROM game_sessions gs
        LEFT JOIN tap_events te ON gs.id = te.session_id
        WHERE gs.user_id = $1 
          AND gs.start_time >= NOW() - INTERVAL '${hours} hours'
        GROUP BY gs.id, gs.total_taps, gs.total_earnings, gs.start_time, gs.end_time
      )
      SELECT 
        COUNT(*) as sessions_analyzed,
        AVG(total_taps / NULLIF(duration_seconds, 0)) as avg_taps_per_second,
        MAX(total_taps / NULLIF(duration_seconds, 0)) as max_taps_per_second,
        AVG(total_earnings / NULLIF(total_taps, 0)) as avg_earnings_per_tap,
        COUNT(*) FILTER (WHERE total_taps / NULLIF(duration_seconds, 0) > 20) as sessions_over_limit,
        COUNT(*) FILTER (WHERE tap_events_count = 0 AND total_taps > 0) as sessions_missing_events
      FROM session_analysis
    `;
    return await this.db.queryOne(query, [userId]);
  }
}

module.exports = GameSessionRepository;