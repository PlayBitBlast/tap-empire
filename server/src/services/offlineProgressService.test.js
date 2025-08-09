const OfflineProgressService = require('./offlineProgressService');
const UserRepository = require('../repositories/UserRepository');
const { GAME_CONFIG } = require('../../../shared/constants/gameConfig');

// Mock dependencies
jest.mock('../repositories/UserRepository');

describe('OfflineProgressService', () => {
  let offlineProgressService;
  let mockUserRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRepository = new UserRepository();
    offlineProgressService = new OfflineProgressService();
    offlineProgressService.userRepository = mockUserRepository;
  });

  describe('calculateOfflineProgress', () => {
    const mockUser = {
      id: 1,
      coins: 1000,
      total_coins_earned: 5000,
      auto_clicker_rate: 10,
      last_offline_calculation: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    };

    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.addCoins.mockResolvedValue({
        ...mockUser,
        coins: mockUser.coins + 72000,
        total_coins_earned: mockUser.total_coins_earned + 72000
      });
      mockUserRepository.updateOfflineCalculation.mockResolvedValue(mockUser);
    });

    it('should calculate offline progress correctly', async () => {
      const result = await offlineProgressService.calculateOfflineProgress(1);

      expect(result.hasOfflineProgress).toBe(true);
      expect(result.earnings).toBeCloseTo(72000, -2); // Allow for small timing differences
      expect(result.offlineHours).toBeCloseTo(2, 1);
      expect(result.autoClickerRate).toBe(10);
      expect(mockUserRepository.addCoins).toHaveBeenCalledWith(1, 72000);
      expect(mockUserRepository.updateOfflineCalculation).toHaveBeenCalledWith(1);
    });

    it('should cap offline hours to maximum allowed', async () => {
      const userWithLongOfflineTime = {
        ...mockUser,
        last_offline_calculation: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
      };
      mockUserRepository.findById.mockResolvedValue(userWithLongOfflineTime);

      const result = await offlineProgressService.calculateOfflineProgress(1);

      expect(result.hasOfflineProgress).toBe(true);
      expect(result.offlineHours).toBe(GAME_CONFIG.OFFLINE_EARNINGS_CAP_HOURS); // Should be capped at 4 hours
      expect(result.actualOfflineHours).toBe(6);
      expect(result.earnings).toBe(144000); // 10 coins/sec * 4 hours * 3600 sec/hour
    });

    it('should return no progress if offline time is too short', async () => {
      const userWithShortOfflineTime = {
        ...mockUser,
        last_offline_calculation: new Date(Date.now() - 30 * 1000) // 30 seconds ago
      };
      mockUserRepository.findById.mockResolvedValue(userWithShortOfflineTime);

      const result = await offlineProgressService.calculateOfflineProgress(1);

      expect(result.hasOfflineProgress).toBe(false);
      expect(result.reason).toBe('Not enough offline time');
      expect(mockUserRepository.addCoins).not.toHaveBeenCalled();
    });

    it('should return no progress if user has no auto-clickers', async () => {
      const userWithNoAutoClickers = {
        ...mockUser,
        auto_clicker_rate: 0
      };
      mockUserRepository.findById.mockResolvedValue(userWithNoAutoClickers);

      const result = await offlineProgressService.calculateOfflineProgress(1);

      expect(result.hasOfflineProgress).toBe(false);
      expect(result.reason).toBe('No auto-clickers');
      expect(mockUserRepository.addCoins).not.toHaveBeenCalled();
    });

    it('should handle user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(offlineProgressService.calculateOfflineProgress(1))
        .rejects.toThrow('User not found');
    });
  });

  describe('validateOfflineProgress', () => {
    const mockUser = {
      id: 1,
      coins: 1000,
      total_coins_earned: 5000,
      auto_clicker_rate: 10,
      last_offline_calculation: new Date(Date.now() - 2 * 60 * 60 * 1000)
    };

    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.addCoins.mockResolvedValue({
        ...mockUser,
        coins: mockUser.coins + 72000
      });
      mockUserRepository.updateOfflineCalculation.mockResolvedValue(mockUser);
    });

    it('should validate correct client data', async () => {
      const clientData = {
        earnings: 72000,
        offlineHours: 2
      };

      const result = await offlineProgressService.validateOfflineProgress(1, clientData);

      expect(result.isValid).toBe(true);
      expect(result.discrepancies).toHaveLength(0);
    });

    it('should detect earnings discrepancy', async () => {
      const clientData = {
        earnings: 100000, // Too high
        offlineHours: 2
      };

      const result = await offlineProgressService.validateOfflineProgress(1, clientData);

      expect(result.isValid).toBe(false);
      expect(result.discrepancies).toHaveLength(1);
      expect(result.discrepancies[0].field).toBe('earnings');
    });

    it('should detect offline hours discrepancy', async () => {
      const clientData = {
        earnings: 72000,
        offlineHours: 3 // Too high
      };

      const result = await offlineProgressService.validateOfflineProgress(1, clientData);

      expect(result.isValid).toBe(false);
      expect(result.discrepancies).toHaveLength(1);
      expect(result.discrepancies[0].field).toBe('offlineHours');
    });
  });

  describe('createEarningsBreakdown', () => {
    it('should create correct earnings breakdown', () => {
      const breakdown = offlineProgressService.createEarningsBreakdown(10, 2.5, 90000);

      expect(breakdown.autoClickerRate).toBe(10);
      expect(breakdown.offlineHours).toBe(2.5);
      expect(breakdown.offlineSeconds).toBe(9000);
      expect(breakdown.earningsPerSecond).toBe(10);
      expect(breakdown.earningsPerMinute).toBe(600);
      expect(breakdown.earningsPerHour).toBe(36000);
      expect(breakdown.totalEarnings).toBe(90000);
      expect(breakdown.cappedAt).toBe(false);
    });

    it('should indicate when earnings are capped', () => {
      const breakdown = offlineProgressService.createEarningsBreakdown(
        10, 
        GAME_CONFIG.OFFLINE_EARNINGS_CAP_HOURS, 
        144000
      );

      expect(breakdown.cappedAt).toBe(true);
      expect(breakdown.maxOfflineHours).toBe(GAME_CONFIG.OFFLINE_EARNINGS_CAP_HOURS);
    });
  });

  describe('getOfflineProgressPreview', () => {
    const mockUser = {
      id: 1,
      coins: 1000,
      total_coins_earned: 5000,
      auto_clicker_rate: 10,
      last_offline_calculation: new Date(Date.now() - 2 * 60 * 60 * 1000)
    };

    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
    });

    it('should return preview without applying changes', async () => {
      const result = await offlineProgressService.getOfflineProgressPreview(1);

      expect(result.canCollect).toBe(true);
      expect(result.potentialEarnings).toBeCloseTo(72000, -2); // Allow for small timing differences
      expect(result.offlineHours).toBeCloseTo(2, 1);
      expect(result.autoClickerRate).toBe(10);
      expect(mockUserRepository.addCoins).not.toHaveBeenCalled();
      expect(mockUserRepository.updateOfflineCalculation).not.toHaveBeenCalled();
    });

    it('should return false for collection when no auto-clickers', async () => {
      const userWithNoAutoClickers = {
        ...mockUser,
        auto_clicker_rate: 0
      };
      mockUserRepository.findById.mockResolvedValue(userWithNoAutoClickers);

      const result = await offlineProgressService.getOfflineProgressPreview(1);

      expect(result.canCollect).toBe(false);
      expect(result.potentialEarnings).toBe(0);
    });
  });

  describe('getOfflineProgressStats', () => {
    beforeEach(() => {
      mockUserRepository.db = {
        queryOne: jest.fn().mockResolvedValue({
          total_users: '100',
          users_with_auto_clickers: '75',
          avg_auto_clicker_rate: '15.5',
          max_auto_clicker_rate: '100',
          users_offline_1h: '20',
          users_offline_4h: '10',
          users_offline_24h: '5'
        })
      };
    });

    it('should return offline progress statistics', async () => {
      const stats = await offlineProgressService.getOfflineProgressStats();

      expect(stats.totalUsers).toBe(100);
      expect(stats.usersWithAutoClickers).toBe(75);
      expect(stats.avgAutoClickerRate).toBe(16); // Rounded
      expect(stats.maxAutoClickerRate).toBe(100);
      expect(stats.usersOffline1Hour).toBe(20);
      expect(stats.usersOffline4Hours).toBe(10);
      expect(stats.usersOffline24Hours).toBe(5);
      expect(stats.offlineCapHours).toBe(GAME_CONFIG.OFFLINE_EARNINGS_CAP_HOURS);
    });
  });
});