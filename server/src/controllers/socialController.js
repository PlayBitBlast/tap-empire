const SocialService = require('../services/socialService');
const { validateRequest } = require('../middleware/validation');
const { body, param, query } = require('express-validator');

/**
 * Social controller for handling friend system and social features
 */
class SocialController {
  constructor() {
    this.socialService = new SocialService();
  }

  /**
   * Import friends from Telegram
   */
  async importTelegramFriends(req, res, next) {
    try {
      const { telegramFriends } = req.body;
      const userId = req.user.id;

      if (!Array.isArray(telegramFriends)) {
        return res.status(400).json({
          error: 'Invalid telegram friends data',
          code: 'INVALID_FRIENDS_DATA'
        });
      }

      const result = await this.socialService.importTelegramFriends(userId, telegramFriends);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's friends list
   */
  async getFriends(req, res, next) {
    try {
      const userId = req.user.id;
      const friends = await this.socialService.getUserFriends(userId);

      res.json({
        success: true,
        data: {
          friends,
          count: friends.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get friends leaderboard
   */
  async getFriendsLeaderboard(req, res, next) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 50;

      const leaderboard = await this.socialService.getFriendsLeaderboard(userId, limit);

      res.json({
        success: true,
        data: {
          leaderboard,
          count: leaderboard.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send gift to a friend
   */
  async sendGift(req, res, next) {
    try {
      const { receiverId, amount, message } = req.body;
      const senderId = req.user.id;

      const result = await this.socialService.sendGift(senderId, receiverId, amount, message);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get received gifts
   */
  async getReceivedGifts(req, res, next) {
    try {
      const userId = req.user.id;
      const gifts = await this.socialService.getReceivedGifts(userId);

      res.json({
        success: true,
        data: {
          gifts,
          count: gifts.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Claim a gift
   */
  async claimGift(req, res, next) {
    try {
      const { giftId } = req.params;
      const userId = req.user.id;

      const result = await this.socialService.claimGift(parseInt(giftId), userId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get social statistics
   */
  async getSocialStats(req, res, next) {
    try {
      const userId = req.user.id;
      const stats = await this.socialService.getUserSocialStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get friend activity feed
   */
  async getFriendActivity(req, res, next) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 20;

      const activities = await this.socialService.getFriendActivityFeed(userId, limit);

      res.json({
        success: true,
        data: {
          activities,
          count: activities.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get friend suggestions
   */
  async getFriendSuggestions(req, res, next) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 10;

      const suggestions = await this.socialService.getFriendSuggestions(userId, limit);

      res.json({
        success: true,
        data: {
          suggestions,
          count: suggestions.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add a friend
   */
  async addFriend(req, res, next) {
    try {
      const { friendId } = req.body;
      const userId = req.user.id;

      const result = await this.socialService.addFriend(userId, friendId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove a friend
   */
  async removeFriend(req, res, next) {
    try {
      const { friendId } = req.params;
      const userId = req.user.id;

      const result = await this.socialService.removeFriend(userId, parseInt(friendId));

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate gift sending capability
   */
  async validateGiftSending(req, res, next) {
    try {
      const { receiverId } = req.params;
      const senderId = req.user.id;

      const validation = await this.socialService.validateGiftSending(senderId, parseInt(receiverId));

      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validation middleware for routes
   */
  static getValidationRules() {
    return {
      importTelegramFriends: [
        body('telegramFriends')
          .isArray()
          .withMessage('Telegram friends must be an array')
          .custom((friends) => {
            if (friends.length > 1000) {
              throw new Error('Too many friends to import at once');
            }
            return true;
          })
      ],

      sendGift: [
        body('receiverId')
          .isInt({ min: 1 })
          .withMessage('Receiver ID must be a positive integer'),
        body('amount')
          .isInt({ min: 10, max: 1000 })
          .withMessage('Gift amount must be between 10 and 1000 coins'),
        body('message')
          .optional()
          .isLength({ max: 200 })
          .withMessage('Message must be less than 200 characters')
      ],

      claimGift: [
        param('giftId')
          .isInt({ min: 1 })
          .withMessage('Gift ID must be a positive integer')
      ],

      addFriend: [
        body('friendId')
          .isInt({ min: 1 })
          .withMessage('Friend ID must be a positive integer')
      ],

      removeFriend: [
        param('friendId')
          .isInt({ min: 1 })
          .withMessage('Friend ID must be a positive integer')
      ],

      validateGiftSending: [
        param('receiverId')
          .isInt({ min: 1 })
          .withMessage('Receiver ID must be a positive integer')
      ],

      getFriendsLeaderboard: [
        query('limit')
          .optional()
          .isInt({ min: 1, max: 100 })
          .withMessage('Limit must be between 1 and 100')
      ],

      getFriendActivity: [
        query('limit')
          .optional()
          .isInt({ min: 1, max: 50 })
          .withMessage('Limit must be between 1 and 50')
      ],

      getFriendSuggestions: [
        query('limit')
          .optional()
          .isInt({ min: 1, max: 20 })
          .withMessage('Limit must be between 1 and 20')
      ]
    };
  }
}

module.exports = SocialController;