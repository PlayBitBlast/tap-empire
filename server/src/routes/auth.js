const express = require('express');
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const { createRateLimit } = require('../middleware/rateLimit');

const router = express.Router();
const authController = new AuthController();

// Apply rate limiting to auth routes
const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts',
    message: 'Please try again later'
  }
});

/**
 * @route POST /api/auth/telegram
 * @desc Authenticate user with Telegram Web App data
 * @access Public
 */
router.post('/telegram', authRateLimit, (req, res) => {
  authController.authenticateWithTelegram(req, res);
});

/**
 * @route POST /api/auth/refresh
 * @desc Refresh user session
 * @access Private
 */
router.post('/refresh', authMiddleware, (req, res) => {
  authController.refreshSession(req, res);
});

/**
 * @route GET /api/auth/profile
 * @desc Get current user profile
 * @access Private
 */
router.get('/profile', authMiddleware, (req, res) => {
  authController.getProfile(req, res);
});

/**
 * @route PUT /api/auth/profile
 * @desc Update user profile
 * @access Private
 */
router.put('/profile', authMiddleware, (req, res) => {
  authController.updateProfile(req, res);
});

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 * @access Private
 */
router.post('/logout', authMiddleware, (req, res) => {
  authController.logout(req, res);
});

module.exports = router;