const express = require('express');
const UpgradeController = require('../controllers/upgradeController');
const authMiddleware = require('../middleware/auth');
const { purchaseRateLimit } = require('../middleware/rateLimit');

const router = express.Router();
const upgradeController = new UpgradeController();

// Apply authentication middleware to all upgrade routes
router.use(authMiddleware);

// Rate limiting is imported from middleware

/**
 * GET /api/upgrades
 * Get all available upgrades for the authenticated user
 */
router.get('/', upgradeController.getUpgrades.bind(upgradeController));

/**
 * GET /api/upgrades/stats
 * Get upgrade statistics for the authenticated user
 */
router.get('/stats', upgradeController.getUpgradeStats.bind(upgradeController));

/**
 * POST /api/upgrades/:upgradeType/purchase
 * Purchase a specific upgrade
 */
router.post('/:upgradeType/purchase', 
  purchaseRateLimit,
  upgradeController.purchaseUpgrade.bind(upgradeController)
);

/**
 * POST /api/upgrades/:upgradeType/validate
 * Validate if a purchase can be made (without actually purchasing)
 */
router.post('/:upgradeType/validate', 
  upgradeController.validatePurchase.bind(upgradeController)
);

/**
 * GET /api/upgrades/:upgradeType/leaderboard
 * Get leaderboard for a specific upgrade type
 */
router.get('/:upgradeType/leaderboard', 
  upgradeController.getUpgradeLeaderboard.bind(upgradeController)
);

module.exports = router;