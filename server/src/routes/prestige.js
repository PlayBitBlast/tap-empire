const express = require('express');
const PrestigeController = require('../controllers/prestigeController');
const authMiddleware = require('../middleware/auth');
const { apiRateLimit } = require('../middleware/rateLimit');

const router = express.Router();
const prestigeController = new PrestigeController();

// Apply authentication middleware to all prestige routes
router.use(authMiddleware);

// Apply rate limiting to prevent abuse
router.use(apiRateLimit);

/**
 * @route GET /api/prestige/info
 * @desc Get complete prestige information for user
 * @access Private
 */
router.get('/info', async (req, res) => {
  await prestigeController.getPrestigeInfo(req, res);
});

/**
 * @route GET /api/prestige/eligibility
 * @desc Check if user can prestige
 * @access Private
 */
router.get('/eligibility', async (req, res) => {
  await prestigeController.checkPrestigeEligibility(req, res);
});

/**
 * @route POST /api/prestige/perform
 * @desc Perform prestige reset
 * @access Private
 */
router.post('/perform', apiRateLimit, async (req, res) => {
  await prestigeController.performPrestige(req, res);
});

/**
 * @route GET /api/prestige/upgrades
 * @desc Get available prestige upgrades
 * @access Private
 */
router.get('/upgrades', async (req, res) => {
  await prestigeController.getPrestigeUpgrades(req, res);
});

/**
 * @route POST /api/prestige/upgrades/purchase
 * @desc Purchase prestige upgrade
 * @access Private
 */
router.post('/upgrades/purchase', apiRateLimit, async (req, res) => {
  await prestigeController.purchasePrestigeUpgrade(req, res);
});

/**
 * @route GET /api/prestige/stats
 * @desc Get prestige statistics
 * @access Private
 */
router.get('/stats', async (req, res) => {
  await prestigeController.getPrestigeStats(req, res);
});

/**
 * @route GET /api/prestige/leaderboard
 * @desc Get prestige leaderboard
 * @access Private
 */
router.get('/leaderboard', async (req, res) => {
  await prestigeController.getPrestigeLeaderboard(req, res);
});

/**
 * @route GET /api/prestige/progress
 * @desc Get prestige progress
 * @access Private
 */
router.get('/progress', async (req, res) => {
  await prestigeController.getPrestigeProgress(req, res);
});

module.exports = router;