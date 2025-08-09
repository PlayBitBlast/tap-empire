const express = require('express');
const SocialController = require('../controllers/socialController');
const authMiddleware = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { apiRateLimit } = require('../middleware/rateLimit');

const router = express.Router();
const socialController = new SocialController();
const validationRules = SocialController.getValidationRules();

// Apply authentication to all social routes
router.use(authMiddleware);

// Apply rate limiting to social routes
router.use(apiRateLimit);

/**
 * @route POST /api/social/friends/import
 * @desc Import friends from Telegram
 * @access Private
 */
router.post('/friends/import',
  validationRules.importTelegramFriends,
  validateRequest,
  socialController.importTelegramFriends.bind(socialController)
);

/**
 * @route GET /api/social/friends
 * @desc Get user's friends list
 * @access Private
 */
router.get('/friends',
  socialController.getFriends.bind(socialController)
);

/**
 * @route GET /api/social/friends/leaderboard
 * @desc Get friends leaderboard
 * @access Private
 */
router.get('/friends/leaderboard',
  validationRules.getFriendsLeaderboard,
  validateRequest,
  socialController.getFriendsLeaderboard.bind(socialController)
);

/**
 * @route POST /api/social/friends/add
 * @desc Add a friend
 * @access Private
 */
router.post('/friends/add',
  validationRules.addFriend,
  validateRequest,
  socialController.addFriend.bind(socialController)
);

/**
 * @route DELETE /api/social/friends/:friendId
 * @desc Remove a friend
 * @access Private
 */
router.delete('/friends/:friendId',
  validationRules.removeFriend,
  validateRequest,
  socialController.removeFriend.bind(socialController)
);

/**
 * @route GET /api/social/friends/suggestions
 * @desc Get friend suggestions
 * @access Private
 */
router.get('/friends/suggestions',
  validationRules.getFriendSuggestions,
  validateRequest,
  socialController.getFriendSuggestions.bind(socialController)
);

/**
 * @route GET /api/social/friends/activity
 * @desc Get friend activity feed
 * @access Private
 */
router.get('/friends/activity',
  validationRules.getFriendActivity,
  validateRequest,
  socialController.getFriendActivity.bind(socialController)
);

/**
 * @route POST /api/social/gifts/send
 * @desc Send gift to a friend
 * @access Private
 */
router.post('/gifts/send',
  validationRules.sendGift,
  validateRequest,
  socialController.sendGift.bind(socialController)
);

/**
 * @route GET /api/social/gifts/received
 * @desc Get received gifts
 * @access Private
 */
router.get('/gifts/received',
  socialController.getReceivedGifts.bind(socialController)
);

/**
 * @route POST /api/social/gifts/:giftId/claim
 * @desc Claim a gift
 * @access Private
 */
router.post('/gifts/:giftId/claim',
  validationRules.claimGift,
  validateRequest,
  socialController.claimGift.bind(socialController)
);

/**
 * @route GET /api/social/gifts/validate/:receiverId
 * @desc Validate if user can send gift to receiver
 * @access Private
 */
router.get('/gifts/validate/:receiverId',
  validationRules.validateGiftSending,
  validateRequest,
  socialController.validateGiftSending.bind(socialController)
);

/**
 * @route GET /api/social/stats
 * @desc Get social statistics
 * @access Private
 */
router.get('/stats',
  socialController.getSocialStats.bind(socialController)
);

module.exports = router;