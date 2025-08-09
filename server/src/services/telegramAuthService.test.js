const TelegramAuthService = require('./telegramAuthService');
const UserRepository = require('../repositories/UserRepository');

// Mock dependencies
jest.mock('../repositories/UserRepository');
jest.mock('jsonwebtoken');
jest.mock('crypto');

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

describe('TelegramAuthService', () => {
  let telegramAuthService;
  let mockUserRepository;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock UserRepository
    mockUserRepository = {
      findByTelegramId: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    };
    UserRepository.mockImplementation(() => mockUserRepository);
    
    // Mock environment variables
    process.env.JWT_SECRET = 'test-secret';
    process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
    
    telegramAuthService = new TelegramAuthService();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.TELEGRAM_BOT_TOKEN;
  });

  describe('validateTelegramData', () => {
    beforeEach(() => {
      // Mock crypto functions
      const mockHmac = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn()
      };
      crypto.createHmac = jest.fn().mockReturnValue(mockHmac);
    });

    it('should validate correct Telegram data', () => {
      const mockUser = {
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser'
      };
      
      const authDate = Math.floor(Date.now() / 1000);
      const userData = encodeURIComponent(JSON.stringify(mockUser));
      const initData = `auth_date=${authDate}&user=${userData}&hash=valid_hash`;
      
      // Mock hash validation to pass
      crypto.createHmac().digest
        .mockReturnValueOnce(Buffer.from('secret'))
        .mockReturnValueOnce('valid_hash');
      
      const result = telegramAuthService.validateTelegramData(initData);
      
      expect(result).toEqual({
        id: mockUser.id,
        first_name: mockUser.first_name,
        last_name: mockUser.last_name,
        username: mockUser.username,
        language_code: undefined,
        is_premium: false,
        photo_url: undefined,
        auth_date: authDate
      });
    });

    it('should reject data with invalid hash', () => {
      const mockUser = { id: 123456789, first_name: 'Test' };
      const authDate = Math.floor(Date.now() / 1000);
      const userData = encodeURIComponent(JSON.stringify(mockUser));
      const initData = `auth_date=${authDate}&user=${userData}&hash=invalid_hash`;
      
      // Mock hash validation to fail
      crypto.createHmac().digest
        .mockReturnValueOnce(Buffer.from('secret'))
        .mockReturnValueOnce('valid_hash');
      
      const result = telegramAuthService.validateTelegramData(initData);
      
      expect(result).toBeNull();
    });

    it('should reject old data (older than 24 hours)', () => {
      const mockUser = { id: 123456789, first_name: 'Test' };
      const oldAuthDate = Math.floor(Date.now() / 1000) - 86401; // 24 hours + 1 second ago
      const userData = encodeURIComponent(JSON.stringify(mockUser));
      const initData = `auth_date=${oldAuthDate}&user=${userData}&hash=valid_hash`;
      
      const result = telegramAuthService.validateTelegramData(initData);
      
      expect(result).toBeNull();
    });

    it('should handle missing bot token', () => {
      delete process.env.TELEGRAM_BOT_TOKEN;
      telegramAuthService = new TelegramAuthService();
      
      expect(() => {
        telegramAuthService.validateTelegramData('test_data');
      }).toThrow('Telegram bot token not configured');
    });
  });

  describe('authenticateUser', () => {
    it('should authenticate new user successfully', async () => {
      const mockTelegramUser = {
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        is_premium: false
      };
      
      const mockCreatedUser = {
        id: 1,
        telegram_id: 123456789,
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        coins: 0,
        total_coins_earned: 0,
        coins_per_tap: 1,
        auto_clicker_rate: 0,
        prestige_level: 0,
        prestige_points: 0,
        login_streak: 0
      };
      
      // Mock validation to return valid user data
      jest.spyOn(telegramAuthService, 'validateTelegramData')
        .mockReturnValue(mockTelegramUser);
      
      // Mock user not found, then created
      mockUserRepository.findByTelegramId.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockCreatedUser);
      
      // Mock JWT generation
      jwt.sign = jest.fn().mockReturnValue('mock-jwt-token');
      
      const result = await telegramAuthService.authenticateUser('mock_init_data');
      
      expect(result.success).toBe(true);
      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.telegram_id).toBe(123456789);
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          telegram_id: 123456789,
          username: 'testuser',
          first_name: 'Test',
          last_name: 'User'
        })
      );
    });

    it('should authenticate existing user successfully', async () => {
      const mockTelegramUser = {
        id: 123456789,
        first_name: 'Test',
        username: 'testuser'
      };
      
      const mockExistingUser = {
        id: 1,
        telegram_id: 123456789,
        username: 'oldusername',
        first_name: 'Old Name',
        coins: 1000
      };
      
      const mockUpdatedUser = {
        ...mockExistingUser,
        username: 'testuser',
        first_name: 'Test'
      };
      
      // Mock validation to return valid user data
      jest.spyOn(telegramAuthService, 'validateTelegramData')
        .mockReturnValue(mockTelegramUser);
      
      // Mock existing user found and updated
      mockUserRepository.findByTelegramId.mockResolvedValue(mockExistingUser);
      mockUserRepository.update.mockResolvedValue(mockUpdatedUser);
      
      // Mock JWT generation
      jwt.sign = jest.fn().mockReturnValue('mock-jwt-token');
      
      const result = await telegramAuthService.authenticateUser('mock_init_data');
      
      expect(result.success).toBe(true);
      expect(result.token).toBe('mock-jwt-token');
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          username: 'testuser',
          first_name: 'Test'
        })
      );
    });

    it('should throw error for invalid Telegram data', async () => {
      // Mock validation to return null (invalid data)
      jest.spyOn(telegramAuthService, 'validateTelegramData')
        .mockReturnValue(null);
      
      await expect(
        telegramAuthService.authenticateUser('invalid_init_data')
      ).rejects.toThrow('Invalid Telegram authentication data');
    });
  });

  describe('generateToken', () => {
    it('should generate JWT token with correct payload', () => {
      const mockUser = {
        id: 1,
        telegram_id: 123456789,
        username: 'testuser'
      };
      
      jwt.sign = jest.fn().mockReturnValue('mock-jwt-token');
      
      const token = telegramAuthService.generateToken(mockUser);
      
      expect(token).toBe('mock-jwt-token');
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          telegramId: 123456789,
          username: 'testuser'
        }),
        'test-secret',
        { expiresIn: '7d' }
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const mockPayload = { userId: 1, telegramId: 123456789 };
      jwt.verify = jest.fn().mockReturnValue(mockPayload);
      
      const result = telegramAuthService.verifyToken('valid-token');
      
      expect(result).toEqual(mockPayload);
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
    });

    it('should throw error for invalid token', () => {
      jwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      expect(() => {
        telegramAuthService.verifyToken('invalid-token');
      }).toThrow('Invalid or expired token');
    });
  });

  describe('refreshSession', () => {
    it('should refresh session successfully', async () => {
      const mockUser = {
        id: 1,
        telegram_id: 123456789,
        username: 'testuser',
        coins: 1000
      };
      
      mockUserRepository.update.mockResolvedValue(mockUser);
      
      const result = await telegramAuthService.refreshSession(1);
      
      expect(result.id).toBe(1);
      expect(result.telegram_id).toBe(123456789);
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          last_login: expect.any(Date)
        })
      );
    });

    it('should throw error if user not found', async () => {
      mockUserRepository.update.mockResolvedValue(null);
      
      await expect(
        telegramAuthService.refreshSession(999)
      ).rejects.toThrow('User not found');
    });
  });
});