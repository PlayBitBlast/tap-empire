const TelegramAuthService = require('../services/telegramAuthService');
const Joi = require('joi');

/**
 * Controller for handling authentication endpoints
 */
class AuthController {
  constructor() {
    this.telegramAuthService = new TelegramAuthService();
  }

  /**
   * Authenticate user with Telegram Web App data
   * POST /api/auth/telegram
   */
  async authenticateWithTelegram(req, res) {
    try {
      // Validate request body
      const schema = Joi.object({
        initData: Joi.string().required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: error.details[0].message
        });
      }

      // Authenticate user
      const result = await this.telegramAuthService.authenticateUser(value.initData);

      res.json(result);
    } catch (error) {
      console.error('Telegram authentication error:', error);
      res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: error.message
      });
    }
  }

  /**
   * Refresh user session
   * POST /api/auth/refresh
   */
  async refreshSession(req, res) {
    try {
      const userId = req.user.id;
      const userData = await this.telegramAuthService.refreshSession(userId);

      res.json({
        success: true,
        user: userData
      });
    } catch (error) {
      console.error('Session refresh error:', error);
      res.status(500).json({
        success: false,
        error: 'Session refresh failed',
        message: error.message
      });
    }
  }

  /**
   * Get current user profile
   * GET /api/auth/profile
   */
  async getProfile(req, res) {
    try {
      const user = req.user;

      res.json({
        success: true,
        user: {
          id: user.id,
          telegram_id: user.telegram_id,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          photo_url: user.photo_url,
          is_premium: user.is_premium,
          coins: user.coins,
          total_coins_earned: user.total_coins_earned,
          coins_per_tap: user.coins_per_tap,
          auto_clicker_rate: user.auto_clicker_rate,
          prestige_level: user.prestige_level,
          prestige_points: user.prestige_points,
          login_streak: user.login_streak,
          created_at: user.created_at,
          last_login: user.last_login
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get profile',
        message: error.message
      });
    }
  }

  /**
   * Update user profile
   * PUT /api/auth/profile
   */
  async updateProfile(req, res) {
    try {
      // Validate request body
      const schema = Joi.object({
        first_name: Joi.string().max(255).optional(),
        last_name: Joi.string().max(255).optional(),
        username: Joi.string().max(255).optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: error.details[0].message
        });
      }

      const userId = req.user.id;
      const updatedUser = await this.telegramAuthService.refreshSession(userId);

      res.json({
        success: true,
        user: updatedUser
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile',
        message: error.message
      });
    }
  }

  /**
   * Logout user (invalidate session)
   * POST /api/auth/logout
   */
  async logout(req, res) {
    try {
      // In a more complex system, we might maintain a blacklist of tokens
      // For now, we'll just return success and let the client handle token removal
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed',
        message: error.message
      });
    }
  }
}

module.exports = AuthController;