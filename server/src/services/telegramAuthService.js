const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const UserRepository = require('../repositories/UserRepository');

/**
 * Service for handling Telegram Web App authentication
 */
class TelegramAuthService {
  constructor() {
    this.userRepository = new UserRepository();
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
  }

  /**
   * Validate Telegram Web App init data
   * @param {string} initData - Raw init data from Telegram Web App
   * @returns {Object|null} Parsed and validated user data
   */
  validateTelegramData(initData) {
    if (!this.botToken) {
      throw new Error('Telegram bot token not configured');
    }

    try {
      // Parse the init data
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');
      urlParams.delete('hash');

      // Create data check string
      const dataCheckArr = [];
      for (const [key, value] of urlParams.entries()) {
        dataCheckArr.push(`${key}=${value}`);
      }
      dataCheckArr.sort();
      const dataCheckString = dataCheckArr.join('\n');

      // Create secret key
      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(this.botToken)
        .digest();

      // Calculate hash
      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      // Verify hash
      if (calculatedHash !== hash) {
        throw new Error('Invalid Telegram data hash');
      }

      // Check auth date (data should not be older than 24 hours)
      const authDate = parseInt(urlParams.get('auth_date'));
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime - authDate > 86400) { // 24 hours
        throw new Error('Telegram data is too old');
      }

      // Parse user data
      const userDataString = urlParams.get('user');
      if (!userDataString) {
        throw new Error('No user data in Telegram init data');
      }

      const userData = JSON.parse(userDataString);
      return {
        id: userData.id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        username: userData.username,
        language_code: userData.language_code,
        is_premium: userData.is_premium || false,
        photo_url: userData.photo_url,
        auth_date: authDate
      };
    } catch (error) {
      console.error('Telegram data validation error:', error);
      return null;
    }
  }

  /**
   * Authenticate user with Telegram data and return JWT token
   * @param {string} initData - Raw init data from Telegram Web App
   * @returns {Object} Authentication result with token and user data
   */
  async authenticateUser(initData) {
    // Validate Telegram data
    const telegramUser = this.validateTelegramData(initData);
    if (!telegramUser) {
      throw new Error('Invalid Telegram authentication data');
    }

    // Find or create user in database
    let user = await this.userRepository.findByTelegramId(telegramUser.id);
    
    if (!user) {
      // Create new user
      user = await this.userRepository.create({
        telegram_id: telegramUser.id,
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        language_code: telegramUser.language_code,
        is_premium: telegramUser.is_premium,
        photo_url: telegramUser.photo_url,
        coins: 0,
        total_coins_earned: 0,
        coins_per_tap: 1,
        auto_clicker_rate: 0,
        prestige_level: 0,
        prestige_points: 0,
        login_streak: 0,
        is_active: true,
        is_banned: false
      });
    } else {
      // Update existing user with latest Telegram data
      user = await this.userRepository.update(user.id, {
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        language_code: telegramUser.language_code,
        is_premium: telegramUser.is_premium,
        photo_url: telegramUser.photo_url,
        last_login: new Date()
      });
    }

    // Generate JWT token
    const token = this.generateToken(user);

    return {
      success: true,
      token,
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
        login_streak: user.login_streak
      }
    };
  }

  /**
   * Generate JWT token for user
   * @param {Object} user - User object from database
   * @returns {string} JWT token
   */
  generateToken(user) {
    const payload = {
      userId: user.id,
      telegramId: user.telegram_id,
      username: user.username,
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: '7d' // Token expires in 7 days
    });
  }

  /**
   * Verify and decode JWT token
   * @param {string} token - JWT token
   * @returns {Object} Decoded token payload
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Refresh user session and update last activity
   * @param {number} userId - User ID
   * @returns {Object} Updated user data
   */
  async refreshSession(userId) {
    const user = await this.userRepository.update(userId, {
      last_login: new Date()
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
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
      login_streak: user.login_streak
    };
  }
}

module.exports = TelegramAuthService;