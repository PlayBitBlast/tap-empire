const express = require('express');
const AchievementController = require('../controllers/achievementController');
const authMiddleware = require('../middleware/auth');
const { apiRateLimit } = require('../middleware/rateLimit');

const router = express.Router();
const achievementController = new AchievementController();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Apply rate limiting
router.use(apiRateLimit);

/**
 * @route GET /api/achievements
 * @desc Get user's achievements with progress
 * @access Private
 */
router.get('/', async (req, res) => {
  await achievementController.getUserAchievements(req, res);
});

/**
 * @route GET /api/achievements/stats
 * @desc Get user's achievement statistics
 * @access Private
 */
router.get('/stats', async (req, res) => {
  await achievementController.getUserAchievementStats(req, res);
});

/**
 * @route GET /api/achievements/leaderboard
 * @desc Get achievement leaderboard
 * @access Private
 */
router.get('/leaderboard', async (req, res) => {
  await achievementController.getAchievementLeaderboard(req, res);
});

/**
 * @route GET /api/achievements/statistics
 * @desc Get global achievement statistics
 * @access Private
 */
router.get('/statistics', async (req, res) => {
  await achievementController.getAchievementStatistics(req, res);
});

/**
 * @route GET /api/achievements/recent
 * @desc Get recent achievement unlocks
 * @access Private
 */
router.get('/recent', async (req, res) => {
  await achievementController.getRecentUnlocks(req, res);
});

/**
 * @route POST /api/achievements/:achievementId/share
 * @desc Share achievement to Telegram
 * @access Private
 */
router.post('/:achievementId/share', async (req, res) => {
  await achievementController.shareAchievement(req, res);
});

/**
 * @route POST /api/achievements/check
 * @desc Manually check for new achievements
 * @access Private
 */
router.post('/check', async (req, res) => {
  await achievementController.checkAchievements(req, res);
});

/**
 * @route POST /api/achievements/milestone
 * @desc Track milestone for achievement system
 * @access Private
 */
router.post('/milestone', async (req, res) => {
  await achievementController.trackMilestone(req, res);
});

module.exports = router;