import telegramAuthService from './telegramAuth';

// Mock the Telegram Web App SDK
jest.mock('@twa-dev/sdk', () => ({
  ready: jest.fn(),
  expand: jest.fn(),
  enableClosingConfirmation: jest.fn(),
  setHeaderColor: jest.fn(),
  initData: 'mock_init_data',
  version: '6.1',
  platform: 'web',
  colorScheme: 'dark',
  isExpanded: true,
  themeParams: {
    bg_color: '#17212b',
    text_color: '#ffffff'
  },
  initDataUnsafe: {
    user: {
      id: 123456789,
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser'
    }
  },
  showAlert: jest.fn(),
  showConfirm: jest.fn((message, callback) => callback(true)),
  HapticFeedback: {
    impactOccurred: jest.fn()
  }
}));

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('TelegramAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    
    // Reset service state
    telegramAuthService.token = null;
    telegramAuthService.user = null;
  });

  describe('initialization', () => {
    it('should initialize Telegram Web App correctly', () => {
      const WebApp = require('@twa-dev/sdk');
      expect(WebApp.ready).toHaveBeenCalled();
      expect(WebApp.expand).toHaveBeenCalled();
      expect(WebApp.enableClosingConfirmation).toHaveBeenCalled();
      expect(WebApp.setHeaderColor).toHaveBeenCalledWith('#1a1a1a');
    });
  });

  describe('isTelegramEnvironment', () => {
    it('should return true when initData is available', () => {
      expect(telegramAuthService.isTelegramEnvironment()).toBe(true);
    });

    it('should return false when initData is not available', () => {
      const WebApp = require('@twa-dev/sdk');
      const originalInitData = WebApp.initData;
      WebApp.initData = '';
      
      expect(telegramAuthService.isTelegramEnvironment()).toBe(false);
      
      WebApp.initData = originalInitData;
    });
  });

  describe('getTelegramInitData', () => {
    it('should return init data when in Telegram environment', () => {
      const result = telegramAuthService.getTelegramInitData();
      expect(result).toBe('mock_init_data');
    });

    it('should throw error when not in Telegram environment', () => {
      const WebApp = require('@twa-dev/sdk');
      const originalInitData = WebApp.initData;
      WebApp.initData = '';
      
      expect(() => {
        telegramAuthService.getTelegramInitData();
      }).toThrow('Not running in Telegram Web App environment');
      
      WebApp.initData = originalInitData;
    });
  });

  describe('authenticate', () => {
    it('should authenticate successfully with Telegram data', async () => {
      const mockResponse = {
        success: true,
        token: 'mock-jwt-token',
        user: {
          id: 1,
          telegram_id: 123456789,
          username: 'testuser',
          first_name: 'Test',
          coins: 0
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await telegramAuthService.authenticate();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/telegram',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: 'mock_init_data' })
        })
      );

      expect(result).toEqual(mockResponse);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('tap_empire_token', 'mock-jwt-token');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('tap_empire_user', JSON.stringify(mockResponse.user));
    });

    it('should use mock data when not in Telegram environment', async () => {
      const WebApp = require('@twa-dev/sdk');
      const originalInitData = WebApp.initData;
      WebApp.initData = '';

      const mockResponse = {
        success: true,
        token: 'mock-jwt-token',
        user: { id: 1, telegram_id: 123456789 }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await telegramAuthService.authenticate();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/telegram',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('mock_hash_for_development')
        })
      );

      expect(result).toEqual(mockResponse);
      
      WebApp.initData = originalInitData;
    });

    it('should throw error on authentication failure', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          success: false,
          message: 'Authentication failed'
        })
      });

      await expect(telegramAuthService.authenticate()).rejects.toThrow('Authentication failed');
    });

    it('should throw error on network failure', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(telegramAuthService.authenticate()).rejects.toThrow('Network error');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when token and user are available', () => {
      telegramAuthService.token = 'mock-token';
      telegramAuthService.user = { id: 1 };

      expect(telegramAuthService.isAuthenticated()).toBe(true);
    });

    it('should return false when token or user is missing', () => {
      telegramAuthService.token = null;
      telegramAuthService.user = null;

      expect(telegramAuthService.isAuthenticated()).toBe(false);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user', () => {
      const mockUser = { id: 1, username: 'test' };
      telegramAuthService.user = mockUser;

      expect(telegramAuthService.getCurrentUser()).toEqual(mockUser);
    });

    it('should load user from localStorage if not in memory', () => {
      const mockUser = { id: 1, username: 'test' };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockUser));

      const result = telegramAuthService.getCurrentUser();

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('tap_empire_user');
      expect(result).toEqual(mockUser);
    });

    it('should handle invalid JSON in localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');
      jest.spyOn(telegramAuthService, 'logout').mockImplementation(() => {});

      const result = telegramAuthService.getCurrentUser();

      expect(telegramAuthService.logout).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('apiRequest', () => {
    beforeEach(() => {
      telegramAuthService.token = 'mock-token';
    });

    it('should make authenticated API request successfully', async () => {
      const mockResponse = { success: true, data: 'test' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await telegramAuthService.apiRequest('/test');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle 401 unauthorized response', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' })
      });

      jest.spyOn(telegramAuthService, 'logout').mockImplementation(() => {});

      await expect(telegramAuthService.apiRequest('/test')).rejects.toThrow('Authentication expired');
      expect(telegramAuthService.logout).toHaveBeenCalled();
    });

    it('should throw error when no token available', async () => {
      telegramAuthService.token = null;

      await expect(telegramAuthService.apiRequest('/test')).rejects.toThrow('No authentication token available');
    });
  });

  describe('logout', () => {
    it('should clear authentication data', async () => {
      telegramAuthService.token = 'mock-token';
      telegramAuthService.user = { id: 1 };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await telegramAuthService.logout();

      expect(telegramAuthService.token).toBeNull();
      expect(telegramAuthService.user).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('tap_empire_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('tap_empire_user');
    });

    it('should clear data even if API call fails', async () => {
      telegramAuthService.token = 'mock-token';
      telegramAuthService.user = { id: 1 };

      fetch.mockRejectedValueOnce(new Error('Network error'));

      await telegramAuthService.logout();

      expect(telegramAuthService.token).toBeNull();
      expect(telegramAuthService.user).toBeNull();
    });
  });

  describe('Telegram-specific methods', () => {
    it('should show alert in Telegram environment', () => {
      const WebApp = require('@twa-dev/sdk');
      telegramAuthService.showAlert('Test message');
      expect(WebApp.showAlert).toHaveBeenCalledWith('Test message');
    });

    it('should show confirm dialog in Telegram environment', async () => {
      const WebApp = require('@twa-dev/sdk');
      const result = await telegramAuthService.showConfirm('Test confirm');
      expect(WebApp.showConfirm).toHaveBeenCalledWith('Test confirm', expect.any(Function));
      expect(result).toBe(true);
    });

    it('should trigger haptic feedback', () => {
      const WebApp = require('@twa-dev/sdk');
      telegramAuthService.hapticFeedback('heavy');
      expect(WebApp.HapticFeedback.impactOccurred).toHaveBeenCalledWith('heavy');
    });

    it('should return theme parameters', () => {
      const WebApp = require('@twa-dev/sdk');
      const result = telegramAuthService.getThemeParams();
      expect(result).toEqual(WebApp.themeParams);
    });

    it('should return Telegram user data', () => {
      const WebApp = require('@twa-dev/sdk');
      const result = telegramAuthService.getTelegramUser();
      expect(result).toEqual(WebApp.initDataUnsafe.user);
    });
  });
});