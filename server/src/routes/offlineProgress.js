const express = require('express');
const OfflineProgressController = require('../controllers/offlineProgressController');
const authMiddleware = require('../middleware/auth');
const { apiRateLimit } = require('../middleware/rateLimit');

const router = express.Router();
const offlineProgressController = new OfflineProgressController();

// Apply authentication to all routes
router.use(authMiddleware);

// Apply rate limiting
router.use(apiRateLimit);

/**
 * @route POST /api/offline-progress/collect
 * @desc Calculate and collect offline progress earnings
 * @access Private
 */
router.post('/collect', (req, res) => {
  offlineProgressController.collectOfflineProgress(req, res);
});

/**
 * @route GET /api/offline-progress/preview
 * @desc Get offline progress preview without collecting
 * @access Private
 */
router.get('/preview', (req, res) => {
  offlineProgressController.getOfflineProgressPreview(req, res);
});

/**
 * @route POST /api/offline-progress/force-update
 * @desc Force update offline calculation timestamp (admin only)
 * @access Private (Admin)
 */
router.post('/force-update', (req, res) => {
  offlineProgressController.forceUpdateOfflineTimestamp(req, res);
});

/**
 * @route GET /api/offline-progress/stats
 * @desc Get offline progress statistics (admin only)
 * @access Private (Admin)
 */
router.get('/stats', (req, res) => {
  offlineProgressController.getOfflineProgressStats(req, res);
});

module.exports = router;