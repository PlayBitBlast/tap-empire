const DailyBonusService = require('./dailyBonusService');
const UserRepository = require('../repositories/UserRepository');

// Mock the UserRepository
jest.mock('../repositories/UserRepository');

describe('DailyBonusService', () => {
  let dailyBonusService;
  let mockUserRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    dailyBonusService = new DailyBonusService();
    mockUserRepository = new UserRepository();
    dailyBonusService.userRepository = mockUserRepository;
  });

  describe('checkDailyBonusEligibility', () => {
    it('should return eligible for new user with no previous login', () => {
      const user = {
        id: 1,
        login_streak: 0,
        last_login: null
      };

      const result = dailyBonusService.checkDailyBonusEligibility(user);

      expect(result.eligible).toBe(true);
      expect(result.streakDay).toBe(1);
      expect(result.bonusAmount).toBe(100); // Base amount
      expect(result.multiplier).toBe(1);
      expect(result.isNewStreak).toBe(true);
    });

    it('should return not eligible if less than 20 hours since last login', () => {
      const user = {
        id: 1,
        login_streak: 3,
        last_login: new Date(Date.now() - 10 * 60 * 60 * 1000) // 10 hours ago
      };

      const result = dailyBonusService.checkDailyBonusEligibility(user);

      expect(result.eligible).toBe(false);
      expect(result.hoursUntilEligible).toBe(14); // 24 - 10 = 14
      expect(result.currentStreak).toBe(3);
    });

    it('should continue streak if within 36 hours', () => {
      const user = {
        id: 1,
        login_streak: 3,
        last_login: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
      };

      const result = dailyBonusService.checkDailyBonusEligibility(user);

      expect(result.eligible).toBe(true);
      expect(result.streakDay).toBe(4);
      expect(result.bonusAmount).toBe(250); // Base amount * 2.5 multiplier
      expect(result.multiplier).toBe(2.5);
      expect(result.isNewStreak).toBe(false);
    });

    it('should reset streak if more than 36 hours', () => {
      const user = {
        id: 1,
        login_streak: 5,
        last_login: new Date(Date.now() - 40 * 60 * 60 * 1000) // 40 hours ago
      };

      const result = dailyBonusService.checkDailyBonusEligibility(user);

      expect(result.eligible).toBe(true);
      expect(result.streakDay).toBe(1);
      expect(result.bonusAmount).toBe(100); // Base amount
      expect(result.multiplier).toBe(1);
      expect(result.isNewStreak).toBe(true);
      expect(result.previousStreak).toBe(5);
    });

    it('should cap streak at maximum of 7 days', () => {
      const user = {
        id: 1,
        login_streak: 7,
        last_login: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
      };

      const result = dailyBonusService.checkDailyBonusEligibility(user);

      expect(result.eligible).toBe(true);
      expect(result.streakDay).toBe(7); // Should stay at 7, not go to 8
      expect(result.bonusAmount).toBe(700); // Base amount * 7 multiplier
      expect(result.multiplier).toBe(7);
    });
  });

  describe('calculateBonusAmount', () => {
    it('should calculate correct bonus amounts for different streak days', () => {
      expect(dailyBonusService.calculateBonusAmount(1)).toBe(100); // 100 * 1
      expect(dailyBonusService.calculateBonusAmount(2)).toBe(150); // 100 * 1.5
      expect(dailyBonusService.calculateBonusAmount(3)).toBe(200); // 100 * 2
      expect(dailyBonusService.calculateBonusAmount(4)).toBe(250); // 100 * 2.5
      expect(dailyBonusService.calculateBonusAmount(5)).toBe(300); // 100 * 3
      expect(dailyBonusService.calculateBonusAmount(6)).toBe(400); // 100 * 4
      expect(dailyBonusService.calculateBonusAmount(7)).toBe(700); // 100 * 7
    });

    it('should handle invalid streak days', () => {
      expect(dailyBonusService.calculateBonusAmount(0)).toBe(100); // Should default to day 1
      expect(dailyBonusService.calculateBonusAmount(10)).toBe(700); // Should cap at day 7
    });
  });

  describe('getStreakMultiplier', () => {
    it('should return correct multipliers for each day', () => {
      expect(dailyBonusService.getStreakMultiplier(1)).toBe(1);
      expect(dailyBonusService.getStreakMultiplier(2)).toBe(1.5);
      expect(dailyBonusService.getStreakMultiplier(3)).toBe(2);
      expect(dailyBonusService.getStreakMultiplier(4)).toBe(2.5);
      expect(dailyBonusService.getStreakMultiplier(5)).toBe(3);
      expect(dailyBonusService.getStreakMultiplier(6)).toBe(4);
      expect(dailyBonusService.getStreakMultiplier(7)).toBe(7);
    });
  });

  describe('claimDailyBonus', () => {
    beforeEach(() => {
      mockUserRepository.findById = jest.fn();
      mockUserRepository.updateLoginStreak = jest.fn();
      mockUserRepository.addCoins = jest.fn();
      mockUserRepository.db = {
        queryOne: jest.fn(),
        queryMany: jest.fn()
      };
    });

    it('should successfully claim bonus for eligible user', async () => {
      const user = {
        id: 1,
        login_streak: 2,
        last_login: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
      };

      mockUserRepository.findById.mockResolvedValue(user);
      mockUserRepository.db.queryOne
        .mockResolvedValueOnce(null) // No existing bonus today
        .mockResolvedValueOnce({ id: 1 }); // Bonus record created
      mockUserRepository.updateLoginStreak.mockResolvedValue(user);
      mockUserRepository.addCoins.mockResolvedValue(user);

      const result = await dailyBonusService.claimDailyBonus(1);

      expect(result.success).toBe(true);
      expect(result.bonusAmount).toBe(200); // Day 3 bonus
      expect(result.streakDay).toBe(3);
      expect(result.multiplier).toBe(2);
      expect(mockUserRepository.updateLoginStreak).toHaveBeenCalledWith(1, 3);
      expect(mockUserRepository.addCoins).toHaveBeenCalledWith(1, 200);
    });

    it('should throw error if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(dailyBonusService.claimDailyBonus(1))
        .rejects.toThrow('User not found');
    });

    it('should throw error if user not eligible', async () => {
      const user = {
        id: 1,
        login_streak: 2,
        last_login: new Date(Date.now() - 10 * 60 * 60 * 1000) // 10 hours ago
      };

      mockUserRepository.findById.mockResolvedValue(user);

      await expect(dailyBonusService.claimDailyBonus(1))
        .rejects.toThrow('Daily bonus not available. Try again in 14 hours.');
    });

    it('should throw error if bonus already claimed today', async () => {
      const user = {
        id: 1,
        login_streak: 2,
        last_login: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
      };

      mockUserRepository.findById.mockResolvedValue(user);
      mockUserRepository.db.queryOne.mockResolvedValue({ id: 1 }); // Existing bonus today

      await expect(dailyBonusService.claimDailyBonus(1))
        .rejects.toThrow('Daily bonus already claimed today');
    });
  });

  describe('getStreakStatistics', () => {
    beforeEach(() => {
      mockUserRepository.findById = jest.fn();
      mockUserRepository.db = {
        queryOne: jest.fn()
      };
    });

    it('should return correct streak statistics', async () => {
      const user = {
        id: 1,
        login_streak: 5,
        last_login: new Date(Date.now() - 25 * 60 * 60 * 1000)
      };

      mockUserRepository.findById.mockResolvedValue(user);
      mockUserRepository.db.queryOne
        .mockResolvedValueOnce({ longest_streak: '7' }) // Longest streak query
        .mockResolvedValueOnce({ total_bonuses: '15', total_bonus_coins: '2500' }); // Total bonuses query

      const result = await dailyBonusService.getStreakStatistics(1);

      expect(result.currentStreak).toBe(5);
      expect(result.longestStreak).toBe(7);
      expect(result.totalBonusesClaimed).toBe(15);
      expect(result.totalBonusCoins).toBe(2500);
      expect(result.eligibility.eligible).toBe(true);
      expect(result.eligibility.streakDay).toBe(6);
    });
  });

  describe('getDailyBonusHistory', () => {
    beforeEach(() => {
      mockUserRepository.db = {
        queryMany: jest.fn()
      };
    });

    it('should return bonus history for user', async () => {
      const mockHistory = [
        {
          bonus_date: '2024-01-15',
          streak_day: 3,
          bonus_amount: 200,
          multiplier: 2,
          claimed_at: new Date()
        }
      ];

      mockUserRepository.db.queryMany.mockResolvedValue(mockHistory);

      const result = await dailyBonusService.getDailyBonusHistory(1, 30);

      expect(result).toEqual(mockHistory);
      expect(mockUserRepository.db.queryMany).toHaveBeenCalledWith(
        expect.stringContaining('SELECT bonus_date, streak_day, bonus_amount, multiplier, claimed_at'),
        [1, 30]
      );
    });
  });

  describe('getDailyBonusStatistics', () => {
    beforeEach(() => {
      mockUserRepository.db = {
        queryOne: jest.fn()
      };
    });

    it('should return admin statistics', async () => {
      const mockStats = {
        unique_claimers: '100',
        total_claims: '500',
        total_coins_given: '50000',
        avg_streak_day: '3.5',
        max_streak_day: '7',
        claims_today: '25',
        claims_this_week: '150'
      };

      mockUserRepository.db.queryOne.mockResolvedValue(mockStats);

      const result = await dailyBonusService.getDailyBonusStatistics();

      expect(result).toEqual(mockStats);
    });
  });
});