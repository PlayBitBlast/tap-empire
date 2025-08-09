const express = require('express');
const LeaderboardController = require('../controllers/leaderboardController');
const authMiddleware = require('../middleware/auth');
const { createRateLimit } = require('../middleware/rateLimit');

const router = express.Router();

// Get leaderboard controller instance from app.locals (set in app.js)
const getLeaderboardController = (req) => {
  return req.app.locals.leaderboardController || new LeaderboardController();
};

// Rate limiting for leaderboard endpoints
const leaderboardRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: 'Too many leaderboard requests, please try again later.'
});

const adminRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 admin requests per minute
  message: 'Too many admin requests, please try again later.'
});

// Public routes (no authentication required)

/**
 * GET /api/leaderboard/stats
 * Get leaderboard statistics (total players in each leaderboard)
 */
router.get('/stats', leaderboardRateLimit, (req, res) => {
  const controller = getLeaderboardController(req);
  controller.getLeaderboardStats(req, res);
});

/**
 * GET /api/leaderboard/:type
 * Get leaderboard data
 * Query params: limit (1-100), offset (>=0)
 * Types: all_time, weekly, daily
 */
router.get('/:type', leaderboardRateLimit, (req, res) => {
  const controller = getLeaderboardController(req);
  controller.getLeaderboard(req, res);
});

// Protected routes (authentication required)

/**
 * GET /api/leaderboard/:type/user/:userId
 * Get user's rank with nearby players
 * Query params: range (1-20, default: 5)
 * Types: all_time, weekly, daily
 */
router.get('/:type/user/:userId', authMiddleware, leaderboardRateLimit, (req, res) => {
  const controller = getLeaderboardController(req);
  controller.getUserRank(req, res);
});

/**
 * GET /api/leaderboard/user/:userId/ranks
 * Get user's ranks across all leaderboard types
 */
router.get('/user/:userId/ranks', authMiddleware, leaderboardRateLimit, (req, res) => {
  const controller = getLeaderboardController(req);
  controller.getUserRanks(req, res);
});

// Admin routes (admin authentication required)

/**
 * DELETE /api/leaderboard/user/:userId
 * Remove user from all leaderboards (admin only)
 */
router.delete('/user/:userId', authMiddleware, adminRateLimit, (req, res) => {
  const controller = getLeaderboardController(req);
  controller.removeUser(req, res);
});

/**
 * POST /api/leaderboard/reset/daily
 * Reset daily leaderboard (admin only)
 */
router.post('/reset/daily', authMiddleware, adminRateLimit, (req, res) => {
  const controller = getLeaderboardController(req);
  controller.resetDailyLeaderboard(req, res);
});

/**
 * POST /api/leaderboard/reset/weekly
 * Reset weekly leaderboard (admin only)
 */
router.post('/reset/weekly', authMiddleware, adminRateLimit, (req, res) => {
  const controller = getLeaderboardController(req);
  controller.resetWeeklyLeaderboard(req, res);
});

// Error handling middleware for this router
router.use((error, req, res, next) => {
  console.error('Leaderboard route error:', error);
  
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON payload',
      code: 'INVALID_JSON'
    });
  }
  
  res.status(500).json({
    error: 'Internal server error in leaderboard service',
    code: 'LEADERBOARD_ERROR'
  });
});

module.exports = router;