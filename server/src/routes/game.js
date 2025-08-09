const express = require('express');
const GameController = require('../controllers/gameController');
const authMiddleware = require('../middleware/auth');
const { gameActionRateLimit } = require('../middleware/rateLimit');

const router = express.Router();
const gameController = new GameController();

/**
 * @route POST /api/game/tap
 * @desc Process a tap action with anti-cheat validation
 * @access Private
 */
router.post('/tap', 
  authMiddleware,
  gameActionRateLimit,
  gameController.tap.bind(gameController)
);

/**
 * @route POST /api/game/sync
 * @desc Validate and sync game state between client and server
 * @access Private
 */
router.post('/sync',
  authMiddleware,
  gameActionRateLimit,
  gameController.syncState.bind(gameController)
);

/**
 * @route GET /api/game/anti-cheat/stats
 * @desc Get anti-cheat statistics (admin only)
 * @access Private (Admin)
 */
router.get('/anti-cheat/stats',
  authMiddleware,
  gameController.getAntiCheatStats.bind(gameController)
);

/**
 * @route POST /api/game/anti-cheat/cleanup
 * @desc Force cleanup of tap history (admin only)
 * @access Private (Admin)
 */
router.post('/anti-cheat/cleanup',
  authMiddleware,
  gameController.forceCleanup.bind(gameController)
);

module.exports = router;