const BaseRepository = require('./BaseRepository');

/**
 * Social repository for managing friendships and gifts
 */
class SocialRepository extends BaseRepository {
  constructor() {
    super('friendships');
  }

  /**
   * Get user's friends
   * @param {number} userId - User ID
   * @returns {Promise<Array>} User's friends with their game data
   */
  async getUserFriends(userId) {
    const query = `
      SELECT 
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        u.total_coins_earned,
        u.prestige_level,
        u.last_login,
        f.created_at as friendship_created,
        CASE 
          WHEN u.last_login > NOW() - INTERVAL '24 hours' THEN 'online'
          WHEN u.last_login > NOW() - INTERVAL '7 days' THEN 'recent'
          ELSE 'inactive'
        END as activity_status
      FROM friendships f
      JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = $1 AND f.status = 'active' AND u.is_active = true
      ORDER BY u.total_coins_earned DESC
    `;
    return await this.db.queryMany(query, [userId]);
  }

  /**
   * Add friend relationship
   * @param {number} userId - User ID
   * @param {number} friendId - Friend's user ID
   * @returns {Promise<Object>} Created friendship record
   */
  async addFriend(userId, friendId) {
    if (userId === friendId) {
      throw new Error('Cannot add yourself as a friend');
    }

    // Check if friendship already exists
    const existing = await this.findOne({
      user_id: userId,
      friend_id: friendId
    });

    if (existing) {
      if (existing.status === 'blocked') {
        return await this.update(existing.id, { status: 'active' });
      }
      return existing;
    }

    return await this.create({
      user_id: userId,
      friend_id: friendId,
      status: 'active'
    });
  }

  /**
   * Remove friend relationship
   * @param {number} userId - User ID
   * @param {number} friendId - Friend's user ID
   * @returns {Promise<boolean>} True if removed
   */
  async removeFriend(userId, friendId) {
    return await this.deleteWhere({
      user_id: userId,
      friend_id: friendId
    }) > 0;
  }

  /**
   * Block a friend
   * @param {number} userId - User ID
   * @param {number} friendId - Friend's user ID
   * @returns {Promise<Object>} Updated friendship record
   */
  async blockFriend(userId, friendId) {
    const friendship = await this.findOne({
      user_id: userId,
      friend_id: friendId
    });

    if (friendship) {
      return await this.update(friendship.id, { status: 'blocked' });
    } else {
      return await this.create({
        user_id: userId,
        friend_id: friendId,
        status: 'blocked'
      });
    }
  }

  /**
   * Check if users are friends
   * @param {number} userId - User ID
   * @param {number} friendId - Friend's user ID
   * @returns {Promise<boolean>} True if they are friends
   */
  async areFriends(userId, friendId) {
    const friendship = await this.findOne({
      user_id: userId,
      friend_id: friendId,
      status: 'active'
    });
    return !!friendship;
  }

  /**
   * Get mutual friends between two users
   * @param {number} userId1 - First user ID
   * @param {number} userId2 - Second user ID
   * @returns {Promise<Array>} Mutual friends
   */
  async getMutualFriends(userId1, userId2) {
    const query = `
      SELECT 
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        u.total_coins_earned
      FROM users u
      WHERE u.id IN (
        SELECT f1.friend_id
        FROM friendships f1
        WHERE f1.user_id = $1 AND f1.status = 'active'
        INTERSECT
        SELECT f2.friend_id
        FROM friendships f2
        WHERE f2.user_id = $2 AND f2.status = 'active'
      )
      AND u.is_active = true
      ORDER BY u.total_coins_earned DESC
    `;
    return await this.db.queryMany(query, [userId1, userId2]);
  }

  /**
   * Get friend count for a user
   * @param {number} userId - User ID
   * @returns {Promise<number>} Number of friends
   */
  async getFriendCount(userId) {
    return await this.count({
      user_id: userId,
      status: 'active'
    });
  }

  /**
   * Send a gift to a friend
   * @param {number} senderId - Sender's user ID
   * @param {number} receiverId - Receiver's user ID
   * @param {number} amount - Gift amount
   * @param {string} message - Optional message
   * @returns {Promise<Object>} Created gift record
   */
  async sendGift(senderId, receiverId, amount, message = null) {
    // Check if they are friends
    const areFriends = await this.areFriends(senderId, receiverId);
    if (!areFriends) {
      throw new Error('Can only send gifts to friends');
    }

    // Check daily gift limit
    const dailyGifts = await this.getDailyGiftCount(senderId);
    if (dailyGifts >= 5) {
      throw new Error('Daily gift limit reached (5 gifts per day)');
    }

    const query = `
      INSERT INTO gifts (sender_id, receiver_id, amount, message)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    return await this.db.queryOne(query, [senderId, receiverId, amount, message]);
  }

  /**
   * Get daily gift count for a user
   * @param {number} userId - User ID
   * @returns {Promise<number>} Number of gifts sent today
   */
  async getDailyGiftCount(userId) {
    const query = `
      SELECT COUNT(*) as count
      FROM gifts
      WHERE sender_id = $1 
        AND sent_at >= CURRENT_DATE
        AND sent_at < CURRENT_DATE + INTERVAL '1 day'
    `;
    const result = await this.db.queryOne(query, [userId]);
    return parseInt(result.count);
  }

  /**
   * Get gifts received by a user
   * @param {number} userId - User ID
   * @param {string} status - Gift status filter
   * @returns {Promise<Array>} Received gifts
   */
  async getReceivedGifts(userId, status = 'sent') {
    const query = `
      SELECT 
        g.*,
        u.username as sender_username,
        u.first_name as sender_first_name,
        u.last_name as sender_last_name
      FROM gifts g
      JOIN users u ON g.sender_id = u.id
      WHERE g.receiver_id = $1 AND g.status = $2
      ORDER BY g.sent_at DESC
    `;
    return await this.db.queryMany(query, [userId, status]);
  }

  /**
   * Get gifts sent by a user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Sent gifts
   */
  async getSentGifts(userId) {
    const query = `
      SELECT 
        g.*,
        u.username as receiver_username,
        u.first_name as receiver_first_name,
        u.last_name as receiver_last_name
      FROM gifts g
      JOIN users u ON g.receiver_id = u.id
      WHERE g.sender_id = $1
      ORDER BY g.sent_at DESC
    `;
    return await this.db.queryMany(query, [userId]);
  }

  /**
   * Claim a gift
   * @param {number} giftId - Gift ID
   * @param {number} userId - User ID claiming the gift
   * @returns {Promise<Object>} Updated gift record
   */
  async claimGift(giftId, userId) {
    const query = `
      UPDATE gifts
      SET status = 'claimed', claimed_at = NOW()
      WHERE id = $1 AND receiver_id = $2 AND status = 'sent' AND expires_at > NOW()
      RETURNING *
    `;
    return await this.db.queryOne(query, [giftId, userId]);
  }

  /**
   * Get expired gifts for cleanup
   * @returns {Promise<Array>} Expired gifts
   */
  async getExpiredGifts() {
    const query = `
      SELECT * FROM gifts
      WHERE status = 'sent' AND expires_at <= NOW()
    `;
    return await this.db.queryMany(query);
  }

  /**
   * Mark expired gifts
   * @returns {Promise<number>} Number of gifts marked as expired
   */
  async markExpiredGifts() {
    const query = `
      UPDATE gifts
      SET status = 'expired'
      WHERE status = 'sent' AND expires_at <= NOW()
    `;
    const result = await this.db.query(query);
    return result.rowCount;
  }

  /**
   * Get social statistics for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Social statistics
   */
  async getUserSocialStats(userId) {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM friendships WHERE user_id = $1 AND status = 'active') as friends_count,
        (SELECT COUNT(*) FROM gifts WHERE sender_id = $1) as gifts_sent,
        (SELECT COUNT(*) FROM gifts WHERE receiver_id = $1) as gifts_received,
        (SELECT COUNT(*) FROM gifts WHERE receiver_id = $1 AND status = 'claimed') as gifts_claimed,
        (SELECT COALESCE(SUM(amount), 0) FROM gifts WHERE sender_id = $1) as total_coins_gifted,
        (SELECT COALESCE(SUM(amount), 0) FROM gifts WHERE receiver_id = $1 AND status = 'claimed') as total_coins_received
    `;
    return await this.db.queryOne(query, [userId]);
  }

  /**
   * Get top gift senders
   * @param {number} limit - Number of users to return
   * @returns {Promise<Array>} Top gift senders
   */
  async getTopGiftSenders(limit = 100) {
    const query = `
      SELECT 
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        COUNT(g.id) as gifts_sent,
        SUM(g.amount) as total_coins_gifted
      FROM users u
      JOIN gifts g ON u.id = g.sender_id
      WHERE u.is_active = true AND u.is_banned = false
      GROUP BY u.id, u.username, u.first_name, u.last_name
      ORDER BY total_coins_gifted DESC
      LIMIT $1
    `;
    return await this.db.queryMany(query, [limit]);
  }

  /**
   * Get friend activity feed
   * @param {number} userId - User ID
   * @param {number} limit - Number of activities to return
   * @returns {Promise<Array>} Friend activities
   */
  async getFriendActivityFeed(userId, limit = 50) {
    const query = `
      SELECT 
        'achievement' as activity_type,
        u.id as friend_id,
        u.username,
        u.first_name,
        u.last_name,
        a.name as achievement_name,
        ua.unlocked_at as activity_time
      FROM friendships f
      JOIN users u ON f.friend_id = u.id
      JOIN user_achievements ua ON u.id = ua.user_id
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE f.user_id = $1 AND f.status = 'active'
        AND ua.unlocked_at > NOW() - INTERVAL '7 days'
      
      UNION ALL
      
      SELECT 
        'prestige' as activity_type,
        u.id as friend_id,
        u.username,
        u.first_name,
        u.last_name,
        'Reached prestige level ' || u.prestige_level as achievement_name,
        u.updated_at as activity_time
      FROM friendships f
      JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = $1 AND f.status = 'active'
        AND u.prestige_level > 0
        AND u.updated_at > NOW() - INTERVAL '7 days'
      
      ORDER BY activity_time DESC
      LIMIT $2
    `;
    return await this.db.queryMany(query, [userId, limit]);
  }

  /**
   * Suggest friends based on mutual connections
   * @param {number} userId - User ID
   * @param {number} limit - Number of suggestions to return
   * @returns {Promise<Array>} Friend suggestions
   */
  async getFriendSuggestions(userId, limit = 10) {
    const query = `
      WITH user_friends AS (
        SELECT friend_id FROM friendships 
        WHERE user_id = $1 AND status = 'active'
      ),
      mutual_connections AS (
        SELECT 
          f.friend_id as suggested_user_id,
          COUNT(*) as mutual_count
        FROM friendships f
        WHERE f.user_id IN (SELECT friend_id FROM user_friends)
          AND f.status = 'active'
          AND f.friend_id != $1
          AND f.friend_id NOT IN (SELECT friend_id FROM user_friends)
          AND f.friend_id NOT IN (
            SELECT friend_id FROM friendships 
            WHERE user_id = $1 AND status = 'blocked'
          )
        GROUP BY f.friend_id
      )
      SELECT 
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        u.total_coins_earned,
        mc.mutual_count
      FROM mutual_connections mc
      JOIN users u ON mc.suggested_user_id = u.id
      WHERE u.is_active = true AND u.is_banned = false
      ORDER BY mc.mutual_count DESC, u.total_coins_earned DESC
      LIMIT $2
    `;
    return await this.db.queryMany(query, [userId, limit]);
  }
}

module.exports = SocialRepository;