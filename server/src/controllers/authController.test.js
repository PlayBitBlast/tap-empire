const AuthController = require('./authController');
const TelegramAuthService = require('../services/telegramAuthService');

// Mock dependencies
jest.mock('../services/telegramAuthService');

describe('AuthController', () => {
  let authController;
  let mockTelegramAuthService;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Mock TelegramAuthService
    mockTelegramAuthService = {
      authenticateUser: jest.fn(),
      refreshSession: jest.fn()
    };
    TelegramAuthService.mockImplementation(() => mockTelegramAuthService);

    authController = new AuthController();

    // Mock request and response objects
    mockReq = {
      body: {},
      user: { id: 1, username: 'test' }
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticateWithTelegram', () => {
    it('should authenticate user successfully', async () => {
      const mockResult = {
        success: true,
        token: 'mock-jwt-token',
        user: { id: 1, telegram_id: 123456789 }
      };

      mockReq.body = { initData: 'valid_init_data' };
      mockTelegramAuthService.authenticateUser.mockResolvedValue(mockResult);

      await authController.authenticateWithTelegram(mockReq, mockRes);

      expect(mockTelegramAuthService.authenticateUser).toHaveBeenCalledWith('valid_init_data');
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return validation error for missing initData', async () => {
      mockReq.body = {};

      await authController.authenticateWithTelegram(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation error',
        message: '"initData" is required'
      });
    });

    it('should return validation error for invalid initData type', async () => {
      mockReq.body = { initData: 123 };

      await authController.authenticateWithTelegram(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation error',
        message: '"initData" must be a string'
      });
    });

    it('should handle authentication service error', async () => {
      mockReq.body = { initData: 'invalid_init_data' };
      mockTelegramAuthService.authenticateUser.mockRejectedValue(
        new Error('Invalid Telegram authentication data')
      );

      await authController.authenticateWithTelegram(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid Telegram authentication data'
      });
    });
  });

  describe('refreshSession', () => {
    it('should refresh session successfully', async () => {
      const mockUserData = {
        id: 1,
        telegram_id: 123456789,
        username: 'test',
        coins: 1000
      };

      mockTelegramAuthService.refreshSession.mockResolvedValue(mockUserData);

      await authController.refreshSession(mockReq, mockRes);

      expect(mockTelegramAuthService.refreshSession).toHaveBeenCalledWith(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        user: mockUserData
      });
    });

    it('should handle refresh session error', async () => {
      mockTelegramAuthService.refreshSession.mockRejectedValue(
        new Error('User not found')
      );

      await authController.refreshSession(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Session refresh failed',
        message: 'User not found'
      });
    });
  });

  describe('getProfile', () => {
    it('should return user profile successfully', async () => {
      const mockUser = {
        id: 1,
        telegram_id: 123456789,
        username: 'test',
        first_name: 'Test',
        last_name: 'User',
        coins: 1000,
        total_coins_earned: 5000,
        created_at: new Date(),
        last_login: new Date()
      };

      mockReq.user = mockUser;

      await authController.getProfile(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        user: expect.objectContaining({
          id: 1,
          telegram_id: 123456789,
          username: 'test',
          first_name: 'Test',
          last_name: 'User',
          coins: 1000,
          total_coins_earned: 5000
        })
      });
    });

    it('should handle get profile error', async () => {
      // Simulate an error by making req.user undefined
      mockReq.user = undefined;

      await authController.getProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get profile',
        message: expect.any(String)
      });
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const mockUpdatedUser = {
        id: 1,
        telegram_id: 123456789,
        username: 'updated',
        first_name: 'Updated'
      };

      mockReq.body = {
        first_name: 'Updated',
        username: 'updated'
      };

      mockTelegramAuthService.refreshSession.mockResolvedValue(mockUpdatedUser);

      await authController.updateProfile(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        user: mockUpdatedUser
      });
    });

    it('should return validation error for invalid profile data', async () => {
      mockReq.body = {
        first_name: 123 // Invalid type
      };

      await authController.updateProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation error',
        message: '"first_name" must be a string'
      });
    });

    it('should handle update profile error', async () => {
      mockReq.body = { first_name: 'Updated' };
      mockTelegramAuthService.refreshSession.mockRejectedValue(
        new Error('Update failed')
      );

      await authController.updateProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to update profile',
        message: 'Update failed'
      });
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      await authController.logout(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out successfully'
      });
    });

    it('should handle logout error gracefully', async () => {
      // Simulate an error during logout
      const originalConsoleError = console.error;
      console.error = jest.fn();

      // Force an error by making res.json throw
      mockRes.json.mockImplementationOnce(() => {
        throw new Error('Response error');
      });

      await authController.logout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      
      console.error = originalConsoleError;
    });
  });
});