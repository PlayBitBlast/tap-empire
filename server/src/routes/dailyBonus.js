const express = require('express');
const DailyBonusController = require('../controllers/dailyBonusController');
const authMiddleware = require('../middleware/auth');
const { apiRateLimit } = require('../middleware/rateLimit');

const router = express.Router();
const dailyBonusController = new DailyBonusController();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @route GET /api/daily-bonus/status
 * @desc Get daily bonus status and streak information
 * @access Private
 */
router.get('/status', apiRateLimit, (req, res) => {
  dailyBonusController.getDailyBonusStatus(req, res);
});

/**
 * @route POST /api/daily-bonus/claim
 * @desc Claim daily bonus
 * @access Private
 */
router.post('/claim', apiRateLimit, (req, res) => {
  dailyBonusController.claimDailyBonus(req, res);
});

/**
 * @route GET /api/daily-bonus/history
 * @desc Get daily bonus claim history
 * @access Private
 */
router.get('/history', apiRateLimit, (req, res) => {
  dailyBonusController.getDailyBonusHistory(req, res);
});

/**
 * @route GET /api/daily-bonus/statistics
 * @desc Get daily bonus statistics (admin only)
 * @access Private (Admin)
 */
router.get('/statistics', apiRateLimit, (req, res) => {
  // TODO: Add admin middleware when implemented
  dailyBonusController.getDailyBonusStatistics(req, res);
});

/**
 * @route POST /api/daily-bonus/reset-streaks
 * @desc Reset all user streaks (admin only)
 * @access Private (Admin)
 */
router.post('/reset-streaks', apiRateLimit, (req, res) => {
  // TODO: Add admin middleware when implemented
  dailyBonusController.resetAllStreaks(req, res);
});

module.exports = router;