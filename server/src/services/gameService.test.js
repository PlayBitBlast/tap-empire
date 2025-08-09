const GameService = require('./gameService');
const UserRepository = require('../repositories/UserRepository');
const EventRepository = require('../repositories/EventRepository');
const { GAME_CONFIG } = require('../../../shared/constants/gameConfig');

// Mock dependencies
jest.mock('../repositories/UserRepository');
jest.mock('../repositories/EventRepository');
jest.mock('../../../shared/utils/calculations', () => ({
  calculateCoinsPerTap: jest.fn(() => 5),
  calculateGoldenTapChance: jest.fn(() => 0.02),
  calculateGoldenTapEarnings: jest.fn((base) => base * 10),
  validateTapRate: jest.fn(() => true),
  generateGameStateChecksum: jest.fn(() => 'test-checksum')
}));

describe('GameService', () => {
  let gameService;
  let mockUserRepository;
  let mockEventRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset calculation mocks
    const calculations = require('../../../shared/utils/calculations');
    calculations.calculateCoinsPerTap.mockReturnValue(5);
    calculations.calculateGoldenTapChance.mockReturnValue(0.02);
    calculations.calculateGoldenTapEarnings.mockImplementation((base) => base * 10);
    calculations.validateTapRate.mockReturnValue(true);
    calculations.generateGameStateChecksum.mockReturnValue('test-checksum');
    
    mockUserRepository = {
      findById: jest.fn(),
      addCoins: jest.fn(),
      update: jest.fn(),
      db: {
        queryMany: jest.fn()
      }
    };
    
    mockEventRepository = {
      logGameAction: jest.fn(),
      logSuspiciousActivity: jest.fn()
    };

    UserRepository.mockImplementation(() => mockUserRepository);
    EventRepository.mockImplementation(() => mockEventRepository);

    gameService = new GameService();
  });

  describe('processTap', () => {
    const mockUser = {
      id: 1,
      coins: 1000,
      total_coins_earned: 5000,
      coins_per_tap: 5,
      auto_clicker_rate: 10
    };

    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.addCoins.mockResolvedValue({
        ...mockUser,
        coins: mockUser.coins + 5,
        total_coins_earned: mockUser.total_coins_earned + 5
      });
      mockUserRepository.db.queryMany.mockResolvedValue([]);
    });

    it('should process valid tap successfully', async () => {
      const tapData = {
        timestamp: Date.now(),
        clientChecksum: 'test-checksum'
      };

      const result = await gameService.processTap(1, tapData);

      expect(result.success).toBe(true);
      expect(result.earnings).toBe(5);
      expect(result.newCoins).toBe(1005);
      expect(mockUserRepository.addCoins).toHaveBeenCalledWith(1, 5);
      expect(mockEventRepository.logGameAction).toHaveBeenCalledWith(1, 'tap', expect.any(Object));
    });

    it('should handle Golden Tap correctly', async () => {
      // Mock Math.random to always trigger Golden Tap
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.01); // Less than 2% chance

      const tapData = {
        timestamp: Date.now(),
        clientChecksum: 'test-checksum'
      };

      mockUserRepository.addCoins.mockResolvedValue({
        ...mockUser,
        coins: mockUser.coins + 50,
        total_coins_earned: mockUser.total_coins_earned + 50
      });

      const result = await gameService.processTap(1, tapData);

      expect(result.success).toBe(true);
      expect(result.earnings).toBe(50); // 5 * 10 (Golden Tap multiplier)
      expect(result.isGoldenTap).toBe(true);
      expect(mockUserRepository.addCoins).toHaveBeenCalledWith(1, 50);

      Math.random = originalRandom;
    });

    it('should reject tap with invalid timestamp', async () => {
      const tapData = {
        timestamp: Date.now() - 60000, // 1 minute ago (too old)
        clientChecksum: 'test-checksum'
      };

      const result = await gameService.processTap(1, tapData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid timestamp');
      expect(mockEventRepository.logSuspiciousActivity).toHaveBeenCalledWith(
        1, 
        'invalid_timestamp', 
        expect.any(Object)
      );
    });

    it('should reject tap when rate limit exceeded', async () => {
      const userId = 1;
      const now = Date.now();

      // Mock validateTapRate to return false after some calls
      const calculations = require('../../../shared/utils/calculations');
      let callCount = 0;
      calculations.validateTapRate.mockImplementation(() => {
        callCount++;
        return callCount <= 20; // Allow first 20, reject rest
      });

      // Simulate rapid tapping by calling processTap multiple times
      const tapPromises = [];
      for (let i = 0; i < 25; i++) { // Exceed MAX_TAPS_PER_SECOND (20)
        tapPromises.push(gameService.processTap(userId, {
          timestamp: now + i,
          clientChecksum: 'test-checksum'
        }));
      }

      const results = await Promise.all(tapPromises);
      
      // Some taps should be rejected due to rate limiting
      const rejectedTaps = results.filter(r => !r.success && r.error === 'Tap rate too high');
      expect(rejectedTaps.length).toBeGreaterThan(0);
    });

    it('should handle user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const tapData = {
        timestamp: Date.now(),
        clientChecksum: 'test-checksum'
      };

      const result = await gameService.processTap(1, tapData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('validateTapRate', () => {
    beforeEach(() => {
      // Reset mocks for each test
      const calculations = require('../../../shared/utils/calculations');
      calculations.validateTapRate.mockReset();
    });

    it('should allow normal tap rate', () => {
      const userId = 1;
      const now = Date.now();

      // Mock validateTapRate to return true for normal rate
      const calculations = require('../../../shared/utils/calculations');
      calculations.validateTapRate.mockReturnValue(true);

      // Simulate 10 taps in the last second (within limit)
      for (let i = 0; i < 10; i++) {
        gameService.recordTap(userId, now - (i * 100));
      }

      const isValid = gameService.validateTapRate(userId, now);
      expect(isValid).toBe(true);
    });

    it('should reject excessive tap rate', () => {
      const userId = 2; // Use different user ID to avoid interference
      const now = Date.now();

      // Mock validateTapRate to return false for excessive rate
      const calculations = require('../../../shared/utils/calculations');
      calculations.validateTapRate.mockReturnValue(false);

      // Simulate 25 taps in the last second (exceeds limit of 20)
      for (let i = 0; i < 25; i++) {
        gameService.recordTap(userId, now - (i * 40));
      }

      const isValid = gameService.validateTapRate(userId, now);
      expect(isValid).toBe(false);
    });
  });

  describe('validateTimestamp', () => {
    it('should accept recent timestamp', () => {
      const timestamp = Date.now() - 1000; // 1 second ago
      const isValid = gameService.validateTimestamp(timestamp);
      expect(isValid).toBe(true);
    });

    it('should reject old timestamp', () => {
      const timestamp = Date.now() - 60000; // 1 minute ago
      const isValid = gameService.validateTimestamp(timestamp);
      expect(isValid).toBe(false);
    });

    it('should reject future timestamp', () => {
      const timestamp = Date.now() + 10000; // 10 seconds in future
      const isValid = gameService.validateTimestamp(timestamp);
      expect(isValid).toBe(false);
    });
  });

  describe('validateEarnings', () => {
    const userState = {
      coins: 1000,
      upgrades: { tap_multiplier: 5 },
      achievements: [],
      prestige_level: 0
    };

    it('should accept valid base earnings', () => {
      const earnings = 5; // Base coins per tap
      const isValid = gameService.validateEarnings(earnings, userState);
      expect(isValid).toBe(true);
    });

    it('should accept valid Golden Tap earnings', () => {
      const earnings = 50; // Base * 10 (Golden Tap multiplier)
      const isValid = gameService.validateEarnings(earnings, userState);
      expect(isValid).toBe(true);
    });

    it('should reject invalid earnings', () => {
      const earnings = 100; // Not base or Golden Tap amount
      const isValid = gameService.validateEarnings(earnings, userState);
      expect(isValid).toBe(false);
    });
  });

  describe('flagSuspiciousActivity', () => {
    it('should flag suspicious activity', async () => {
      await gameService.flagSuspiciousActivity(1, 'excessive_tap_rate', {
        message: 'Test suspicious activity'
      });

      expect(mockEventRepository.logSuspiciousActivity).toHaveBeenCalledWith(
        1,
        'excessive_tap_rate',
        expect.objectContaining({
          message: 'Test suspicious activity'
        })
      );
    });

    it('should auto-flag account after multiple violations', async () => {
      // Flag the same activity 5 times
      for (let i = 0; i < 5; i++) {
        await gameService.flagSuspiciousActivity(1, 'test_violation', {
          message: `Violation ${i + 1}`
        });
      }

      expect(mockUserRepository.update).toHaveBeenCalledWith(1, {
        is_flagged: true,
        flag_reason: 'test_violation',
        flag_timestamp: expect.any(Date)
      });

      expect(mockEventRepository.logGameAction).toHaveBeenCalledWith(
        1,
        'account_flagged',
        expect.objectContaining({
          reason: 'test_violation',
          automated: true
        })
      );
    });
  });

  describe('validateAndCorrectState', () => {
    const mockUser = {
      id: 1,
      coins: 1000,
      total_coins_earned: 5000,
      coins_per_tap: 5,
      auto_clicker_rate: 10
    };

    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.db.queryMany.mockResolvedValue([]);
    });

    it('should return no correction for matching state', async () => {
      const clientState = {
        coins: 1000,
        total_coins_earned: 5000,
        coins_per_tap: 5,
        auto_clicker_rate: 10
      };

      const result = await gameService.validateAndCorrectState(1, clientState);

      expect(result.corrected).toBe(false);
      expect(result.serverState.coins).toBe(1000);
    });

    it('should correct state with significant discrepancies', async () => {
      const clientState = {
        coins: 10000, // Much higher than server state
        total_coins_earned: 3000, // Lower than server state
        coins_per_tap: 5,
        auto_clicker_rate: 10
      };

      const result = await gameService.validateAndCorrectState(1, clientState);

      expect(result.corrected).toBe(true);
      expect(result.discrepancies).toHaveLength(2);
      expect(result.serverState.coins).toBe(1000); // Corrected to server value
      expect(mockEventRepository.logSuspiciousActivity).toHaveBeenCalledWith(
        1,
        'state_mismatch',
        expect.any(Object)
      );
    });
  });

  describe('buildUserState', () => {
    const mockUser = {
      id: 1,
      coins: 1000,
      total_coins_earned: 5000
    };

    it('should build complete user state', async () => {
      const mockUpgrades = [
        { upgrade_type: 'tap_multiplier', level: 5 },
        { upgrade_type: 'auto_clicker', level: 3 }
      ];
      const mockAchievements = [
        { achievement_id: 1 },
        { achievement_id: 2 }
      ];

      mockUserRepository.db.queryMany
        .mockResolvedValueOnce(mockUpgrades)
        .mockResolvedValueOnce(mockAchievements);

      const userState = await gameService.buildUserState(mockUser);

      expect(userState.upgrades).toEqual({
        tap_multiplier: 5,
        auto_clicker: 3
      });
      expect(userState.achievements).toEqual([1, 2]);
      expect(userState.activeEventMultiplier).toBe(1);
    });
  });

  describe('cleanupTapHistory', () => {
    it('should remove old tap history', () => {
      const userId = 1;
      const oldTimestamp = Date.now() - (10 * 60 * 1000); // 10 minutes ago
      const recentTimestamp = Date.now() - 1000; // 1 second ago

      // Manually set tap history to avoid recordTap filtering
      gameService.userTapHistory.set(userId, [oldTimestamp, recentTimestamp]);

      expect(gameService.userTapHistory.get(userId)).toHaveLength(2);

      gameService.cleanupTapHistory();

      // Old tap should be removed, recent tap should remain
      expect(gameService.userTapHistory.get(userId)).toHaveLength(1);
      expect(gameService.userTapHistory.get(userId)[0]).toBe(recentTimestamp);
    });
  });

  describe('getAntiCheatStats', () => {
    it('should return anti-cheat statistics', () => {
      // Add some test data
      gameService.recordTap(1, Date.now());
      gameService.recordTap(2, Date.now());
      
      gameService.suspiciousActivity.set('1_test_violation', {
        userId: 1,
        activityType: 'test_violation',
        count: 3
      });

      const stats = gameService.getAntiCheatStats();

      expect(stats.activeTapSessions).toBe(2);
      expect(stats.suspiciousActivities).toBe(1);
      expect(stats.activityBreakdown.test_violation).toBe(1);
    });
  });
});