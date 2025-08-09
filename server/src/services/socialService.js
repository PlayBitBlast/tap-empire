const SocialRepository = require('../repositories/SocialRepository');
const UserRepository = require('../repositories/UserRepository');
const { SOCIAL_LIMITS } = require('../../../shared/constants/gameConfig');

/**
 * Social service for managing friend system and social features
 */
class SocialService {
  constructor() {
    this.socialRepository = new SocialRepository();
    this.userRepository = new UserRepository();
  }

  /**
   * Import friends from Telegram friend list
   * @param {number} userId - User ID
   * @param {Array} telegramFriends - Array of Telegram friend data
   * @returns {Promise<Object>} Import results
   */
  async importTelegramFriends(userId, telegramFriends) {
    const results = {
      imported: 0,
      existing: 0,
      notFound: 0,
      errors: []
    };

    for (const telegramFriend of telegramFriends) {
      try {
        // Find user by Telegram ID
        const friend = await this.userRepository.findByTelegramId(telegramFriend.id);
        
        if (!friend) {
          results.notFound++;
          continue;
        }

        // Check if friendship already exists
        const existingFriendship = await this.socialRepository.areFriends(userId, friend.id);
        
        if (existingFriendship) {
          results.existing++;
          continue;
        }

        // Add friend relationship (bidirectional)
        await this.socialRepository.addFriend(userId, friend.id);
        await this.socialRepository.addFriend(friend.id, userId);
        
        results.imported++;
      } catch (error) {
        results.errors.push({
          telegramId: telegramFriend.id,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get user's friends with progress and activity status
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Friends list with game data
   */
  async getUserFriends(userId) {
    const friends = await this.socialRepository.getUserFriends(userId);
    
    // Enhance friend data with additional info
    return friends.map(friend => ({
      id: friend.id,
      username: friend.username,
      firstName: friend.first_name,
      lastName: friend.last_name,
      displayName: this.getDisplayName(friend),
      totalCoins: friend.total_coins_earned,
      prestigeLevel: friend.prestige_level,
      lastLogin: friend.last_login,
      activityStatus: friend.activity_status,
      friendshipCreated: friend.friendship_created,
      canReceiveGift: true // Will be validated when sending
    }));
  }

  /**
   * Send gift to a friend
   * @param {number} senderId - Sender's user ID
   * @param {number} receiverId - Receiver's user ID
   * @param {number} amount - Gift amount
   * @param {string} message - Optional message
   * @returns {Promise<Object>} Gift result
   */
  async sendGift(senderId, receiverId, amount, message = null) {
    // Validate gift amount first
    if (amount < SOCIAL_LIMITS.MIN_GIFT_AMOUNT || amount > SOCIAL_LIMITS.MAX_GIFT_AMOUNT) {
      throw new Error(`Gift amount must be between ${SOCIAL_LIMITS.MIN_GIFT_AMOUNT} and ${SOCIAL_LIMITS.MAX_GIFT_AMOUNT} coins`);
    }

    // Validate sender has enough coins
    const sender = await this.userRepository.findById(senderId);
    if (!sender) {
      throw new Error('Sender not found');
    }

    if (sender.coins < amount) {
      throw new Error('Insufficient coins to send gift');
    }

    // Validate receiver exists and is active
    const receiver = await this.userRepository.findById(receiverId);
    if (!receiver || !receiver.is_active) {
      throw new Error('Receiver not found or inactive');
    }

    // Check daily gift limit
    const dailyGifts = await this.socialRepository.getDailyGiftCount(senderId);
    if (dailyGifts >= SOCIAL_LIMITS.DAILY_GIFT_LIMIT) {
      throw new Error('Daily gift limit reached');
    }

    // Send the gift
    const gift = await this.socialRepository.sendGift(senderId, receiverId, amount, message);

    // Deduct coins from sender
    await this.userRepository.updateCoins(senderId, -amount);

    return {
      gift,
      remainingGifts: SOCIAL_LIMITS.DAILY_GIFT_LIMIT - dailyGifts - 1
    };
  }

  /**
   * Get received gifts for a user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Received gifts
   */
  async getReceivedGifts(userId) {
    const gifts = await this.socialRepository.getReceivedGifts(userId, 'sent');
    
    return gifts.map(gift => ({
      id: gift.id,
      senderId: gift.sender_id,
      senderName: this.getDisplayName({
        username: gift.sender_username,
        first_name: gift.sender_first_name,
        last_name: gift.sender_last_name
      }),
      amount: gift.amount,
      message: gift.message,
      sentAt: gift.sent_at,
      expiresAt: gift.expires_at
    }));
  }

  /**
   * Claim a gift
   * @param {number} giftId - Gift ID
   * @param {number} userId - User ID claiming the gift
   * @returns {Promise<Object>} Claimed gift
   */
  async claimGift(giftId, userId) {
    const gift = await this.socialRepository.claimGift(giftId, userId);
    
    if (!gift) {
      throw new Error('Gift not found, already claimed, or expired');
    }

    // Add coins to receiver
    await this.userRepository.updateCoins(userId, gift.amount);

    return {
      gift,
      coinsReceived: gift.amount
    };
  }

  /**
   * Get social statistics for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Social statistics
   */
  async getUserSocialStats(userId) {
    const stats = await this.socialRepository.getUserSocialStats(userId);
    const dailyGifts = await this.socialRepository.getDailyGiftCount(userId);
    
    return {
      friendsCount: parseInt(stats.friends_count),
      giftsSent: parseInt(stats.gifts_sent),
      giftsReceived: parseInt(stats.gifts_received),
      giftsClaimed: parseInt(stats.gifts_claimed),
      totalCoinsGifted: parseInt(stats.total_coins_gifted),
      totalCoinsReceived: parseInt(stats.total_coins_received),
      dailyGiftsSent: dailyGifts,
      remainingDailyGifts: SOCIAL_LIMITS.DAILY_GIFT_LIMIT - dailyGifts
    };
  }

  /**
   * Get friend activity feed
   * @param {number} userId - User ID
   * @param {number} limit - Number of activities to return
   * @returns {Promise<Array>} Friend activities
   */
  async getFriendActivityFeed(userId, limit = 20) {
    return await this.socialRepository.getFriendActivityFeed(userId, limit);
  }

  /**
   * Get friend suggestions
   * @param {number} userId - User ID
   * @param {number} limit - Number of suggestions
   * @returns {Promise<Array>} Friend suggestions
   */
  async getFriendSuggestions(userId, limit = 10) {
    const suggestions = await this.socialRepository.getFriendSuggestions(userId, limit);
    
    return suggestions.map(suggestion => ({
      id: suggestion.id,
      username: suggestion.username,
      firstName: suggestion.first_name,
      lastName: suggestion.last_name,
      displayName: this.getDisplayName(suggestion),
      totalCoins: suggestion.total_coins_earned,
      mutualFriends: suggestion.mutual_count
    }));
  }

  /**
   * Add a friend
   * @param {number} userId - User ID
   * @param {number} friendId - Friend's user ID
   * @returns {Promise<Object>} Result
   */
  async addFriend(userId, friendId) {
    if (userId === friendId) {
      throw new Error('Cannot add yourself as a friend');
    }

    // Check if friend exists and is active
    const friend = await this.userRepository.findById(friendId);
    if (!friend || !friend.is_active) {
      throw new Error('User not found or inactive');
    }

    // Add bidirectional friendship
    await this.socialRepository.addFriend(userId, friendId);
    await this.socialRepository.addFriend(friendId, userId);

    return {
      success: true,
      friend: {
        id: friend.id,
        username: friend.username,
        firstName: friend.first_name,
        lastName: friend.last_name,
        displayName: this.getDisplayName(friend),
        totalCoins: friend.total_coins_earned
      }
    };
  }

  /**
   * Remove a friend
   * @param {number} userId - User ID
   * @param {number} friendId - Friend's user ID
   * @returns {Promise<Object>} Result
   */
  async removeFriend(userId, friendId) {
    // Remove bidirectional friendship
    await this.socialRepository.removeFriend(userId, friendId);
    await this.socialRepository.removeFriend(friendId, userId);

    return { success: true };
  }

  /**
   * Get leaderboard of friends
   * @param {number} userId - User ID
   * @param {number} limit - Number of friends to return
   * @returns {Promise<Array>} Friends leaderboard
   */
  async getFriendsLeaderboard(userId, limit = 50) {
    const friends = await this.socialRepository.getUserFriends(userId);
    
    // Sort by total coins and add ranking
    const sortedFriends = friends
      .sort((a, b) => b.total_coins_earned - a.total_coins_earned)
      .slice(0, limit)
      .map((friend, index) => ({
        rank: index + 1,
        id: friend.id,
        username: friend.username,
        firstName: friend.first_name,
        lastName: friend.last_name,
        displayName: this.getDisplayName(friend),
        totalCoins: friend.total_coins_earned,
        prestigeLevel: friend.prestige_level,
        activityStatus: friend.activity_status
      }));

    return sortedFriends;
  }

  /**
   * Clean up expired gifts
   * @returns {Promise<number>} Number of gifts cleaned up
   */
  async cleanupExpiredGifts() {
    return await this.socialRepository.markExpiredGifts();
  }

  /**
   * Get display name for a user
   * @param {Object} user - User object
   * @returns {string} Display name
   */
  getDisplayName(user) {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    } else if (user.first_name) {
      return user.first_name;
    } else if (user.username) {
      return `@${user.username}`;
    } else {
      return 'Anonymous User';
    }
  }

  /**
   * Validate if user can send gift to friend
   * @param {number} senderId - Sender's user ID
   * @param {number} receiverId - Receiver's user ID
   * @returns {Promise<Object>} Validation result
   */
  async validateGiftSending(senderId, receiverId) {
    // Check if they are friends
    const areFriends = await this.socialRepository.areFriends(senderId, receiverId);
    if (!areFriends) {
      return { canSend: false, reason: 'Not friends' };
    }

    // Check daily limit
    const dailyGifts = await this.socialRepository.getDailyGiftCount(senderId);
    if (dailyGifts >= SOCIAL_LIMITS.DAILY_GIFT_LIMIT) {
      return { canSend: false, reason: 'Daily limit reached' };
    }

    // Check if receiver is active
    const receiver = await this.userRepository.findById(receiverId);
    if (!receiver || !receiver.is_active) {
      return { canSend: false, reason: 'Receiver inactive' };
    }

    return { 
      canSend: true, 
      remainingGifts: SOCIAL_LIMITS.DAILY_GIFT_LIMIT - dailyGifts 
    };
  }
}

module.exports = SocialService;