import WebApp from '@twa-dev/sdk';

/**
 * Service for handling Telegram Web App authentication
 */
class TelegramAuthService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3005/api';
    this.token = localStorage.getItem('tap_empire_token');
    this.user = null;
    
    // Initialize Telegram Web App
    this.initTelegramWebApp();
  }

  /**
   * Initialize Telegram Web App SDK
   */
  initTelegramWebApp() {
    try {
      // Initialize the Web App
      WebApp.ready();
      
      // Expand the Web App to full height
      WebApp.expand();
      
      // Enable closing confirmation
      WebApp.enableClosingConfirmation();
      
      // Set header color
      WebApp.setHeaderColor('#1a1a1a');
      
      console.log('Telegram Web App initialized:', {
        version: WebApp.version,
        platform: WebApp.platform,
        colorScheme: WebApp.colorScheme,
        isExpanded: WebApp.isExpanded
      });
    } catch (error) {
      console.warn('Telegram Web App not available:', error);
    }
  }

  /**
   * Check if running in Telegram Web App environment
   * @returns {boolean} True if in Telegram environment
   */
  isTelegramEnvironment() {
    return WebApp.initData && WebApp.initData.length > 0;
  }

  /**
   * Get Telegram Web App init data
   * @returns {string} Init data string
   */
  getTelegramInitData() {
    if (!this.isTelegramEnvironment()) {
      throw new Error('Not running in Telegram Web App environment');
    }
    return WebApp.initData;
  }

  /**
   * Authenticate with Telegram
   * @returns {Promise<Object>} Authentication result
   */
  async authenticate() {
    try {
      let initData;
      
      if (this.isTelegramEnvironment()) {
        initData = this.getTelegramInitData();
      } else {
        // For development/testing outside Telegram
        console.warn('Not in Telegram environment, using mock data');
        initData = this.getMockInitData();
      }

      const response = await fetch(`${this.baseURL}/auth/telegram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ initData })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      if (data.success) {
        this.token = data.token;
        this.user = data.user;
        localStorage.setItem('tap_empire_token', this.token);
        localStorage.setItem('tap_empire_user', JSON.stringify(this.user));
        
        console.log('Authentication successful:', this.user);
        return data;
      } else {
        throw new Error(data.message || 'Authentication failed');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  }

  /**
   * Get mock init data for development
   * @returns {string} Mock init data
   */
  getMockInitData() {
    const mockUser = {
      id: 123456789,
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
      language_code: 'en',
      is_premium: false
    };

    const authDate = Math.floor(Date.now() / 1000);
    const userData = encodeURIComponent(JSON.stringify(mockUser));
    
    // Create a simple hash for development (not secure, only for testing)
    const dataString = `auth_date=${authDate}&user=${userData}`;
    const hash = 'mock_hash_for_development';
    
    return `${dataString}&hash=${hash}`;
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} True if authenticated
   */
  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  /**
   * Get current user
   * @returns {Object|null} User object or null
   */
  getCurrentUser() {
    if (!this.user && localStorage.getItem('tap_empire_user')) {
      try {
        this.user = JSON.parse(localStorage.getItem('tap_empire_user'));
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        this.logout();
      }
    }
    return this.user;
  }

  /**
   * Get authentication token
   * @returns {string|null} JWT token or null
   */
  getToken() {
    if (!this.token) {
      this.token = localStorage.getItem('tap_empire_token');
    }
    return this.token;
  }

  /**
   * Make authenticated API request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} API response
   */
  async apiRequest(endpoint, options = {}) {
    const token = this.getToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (response.status === 401) {
        // Token expired or invalid
        this.logout();
        throw new Error('Authentication expired. Please log in again.');
      }

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  /**
   * Refresh user session
   * @returns {Promise<Object>} Updated user data
   */
  async refreshSession() {
    try {
      const data = await this.apiRequest('/auth/refresh', {
        method: 'POST'
      });

      if (data.success) {
        this.user = data.user;
        localStorage.setItem('tap_empire_user', JSON.stringify(this.user));
        return data.user;
      } else {
        throw new Error(data.message || 'Session refresh failed');
      }
    } catch (error) {
      console.error('Session refresh error:', error);
      throw error;
    }
  }

  /**
   * Get user profile
   * @returns {Promise<Object>} User profile data
   */
  async getProfile() {
    try {
      const data = await this.apiRequest('/auth/profile');
      
      if (data.success) {
        this.user = data.user;
        localStorage.setItem('tap_empire_user', JSON.stringify(this.user));
        return data.user;
      } else {
        throw new Error(data.message || 'Failed to get profile');
      }
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} Updated user data
   */
  async updateProfile(updates) {
    try {
      const data = await this.apiRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(updates)
      });

      if (data.success) {
        this.user = data.user;
        localStorage.setItem('tap_empire_user', JSON.stringify(this.user));
        return data.user;
      } else {
        throw new Error(data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      if (this.token) {
        await this.apiRequest('/auth/logout', {
          method: 'POST'
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.token = null;
      this.user = null;
      localStorage.removeItem('tap_empire_token');
      localStorage.removeItem('tap_empire_user');
    }
  }

  /**
   * Show Telegram alert
   * @param {string} message - Alert message
   */
  showAlert(message) {
    if (this.isTelegramEnvironment()) {
      WebApp.showAlert(message);
    } else {
      alert(message);
    }
  }

  /**
   * Show Telegram confirm dialog
   * @param {string} message - Confirm message
   * @returns {Promise<boolean>} User confirmation
   */
  showConfirm(message) {
    return new Promise((resolve) => {
      if (this.isTelegramEnvironment()) {
        WebApp.showConfirm(message, resolve);
      } else {
        resolve(window.confirm(message));
      }
    });
  }

  /**
   * Haptic feedback
   * @param {string} type - Feedback type ('light', 'medium', 'heavy')
   */
  hapticFeedback(type = 'light') {
    if (this.isTelegramEnvironment() && WebApp.HapticFeedback) {
      switch (type) {
        case 'light':
          WebApp.HapticFeedback.impactOccurred('light');
          break;
        case 'medium':
          WebApp.HapticFeedback.impactOccurred('medium');
          break;
        case 'heavy':
          WebApp.HapticFeedback.impactOccurred('heavy');
          break;
        default:
          WebApp.HapticFeedback.impactOccurred('light');
      }
    }
  }

  /**
   * Get Telegram theme parameters
   * @returns {Object} Theme parameters
   */
  getThemeParams() {
    if (this.isTelegramEnvironment()) {
      return WebApp.themeParams;
    }
    return {};
  }

  /**
   * Get Telegram user data
   * @returns {Object|null} Telegram user data
   */
  getTelegramUser() {
    if (this.isTelegramEnvironment()) {
      return WebApp.initDataUnsafe?.user || null;
    }
    return null;
  }
}

// Create singleton instance
const telegramAuthService = new TelegramAuthService();

export default telegramAuthService;