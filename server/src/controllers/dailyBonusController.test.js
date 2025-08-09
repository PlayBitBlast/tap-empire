const DailyBonusController = require('./dailyBonusController');
const DailyBonusService = require('../services/dailyBonusService');

// Mock the DailyBonusService
jest.mock('../services/dailyBonusService');

describe('DailyBonusController', () => {
  let controller;
  let mockDailyBonusService;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
    controller = new DailyBonusController();
    mockDailyBonusService = new DailyBonusService();
    controller.dailyBonusService = mockDailyBonusService;

    mockReq = {
      user: { id: 1 },
      query: {}
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    // Mock console.error to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('getDailyBonusStatus', () => {
    it('should return bonus status successfully', async () => {
      const mockStatistics = {
        currentStreak: 3,
        longestStreak: 5,
        eligibility: { eligible: true }
      };

      mockDailyBonusService.getStreakStatistics.mockResolvedValue(mockStatistics);

      await controller.getDailyBonusStatus(mockReq, mockRes);

      expect(mockDailyBonusService.getStreakStatistics).toHaveBeenCalledWith(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatistics
      });
    });

    it('should handle service error', async () => {
      mockDailyBonusService.getStreakStatistics.mockRejectedValue(new Error('Service error'));

      await controller.getDailyBonusStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get daily bonus status'
      });
    });
  });

  describe('claimDailyBonus', () => {
    it('should claim bonus successfully', async () => {
      const mockResult = {
        success: true,
        bonusAmount: 250,
        streakDay: 4,
        multiplier: 2.5
      };

      mockDailyBonusService.claimDailyBonus.mockResolvedValue(mockResult);

      await controller.claimDailyBonus(mockReq, mockRes);

      expect(mockDailyBonusService.claimDailyBonus).toHaveBeenCalledWith(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });

    it('should handle bonus not available error', async () => {
      mockDailyBonusService.claimDailyBonus.mockRejectedValue(
        new Error('Daily bonus not available. Try again in 5 hours.')
      );

      await controller.claimDailyBonus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Daily bonus not available. Try again in 5 hours.'
      });
    });

    it('should handle already claimed error', async () => {
      mockDailyBonusService.claimDailyBonus.mockRejectedValue(
        new Error('Daily bonus already claimed today')
      );

      await controller.claimDailyBonus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Daily bonus already claimed today'
      });
    });

    it('should handle general service error', async () => {
      mockDailyBonusService.claimDailyBonus.mockRejectedValue(new Error('Database error'));

      await controller.claimDailyBonus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to claim daily bonus'
      });
    });
  });

  describe('getDailyBonusHistory', () => {
    it('should return bonus history successfully', async () => {
      const mockHistory = [
        {
          bonus_date: '2024-01-15',
          streak_day: 3,
          bonus_amount: 200,
          multiplier: 2
        }
      ];

      mockReq.query.limit = '10';
      mockDailyBonusService.getDailyBonusHistory.mockResolvedValue(mockHistory);

      await controller.getDailyBonusHistory(mockReq, mockRes);

      expect(mockDailyBonusService.getDailyBonusHistory).toHaveBeenCalledWith(1, 10);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          history: mockHistory,
          count: 1
        }
      });
    });

    it('should use default limit if not provided', async () => {
      const mockHistory = [];
      mockDailyBonusService.getDailyBonusHistory.mockResolvedValue(mockHistory);

      await controller.getDailyBonusHistory(mockReq, mockRes);

      expect(mockDailyBonusService.getDailyBonusHistory).toHaveBeenCalledWith(1, 30);
    });

    it('should handle service error', async () => {
      mockDailyBonusService.getDailyBonusHistory.mockRejectedValue(new Error('Service error'));

      await controller.getDailyBonusHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get daily bonus history'
      });
    });
  });

  describe('getDailyBonusStatistics', () => {
    it('should return statistics successfully', async () => {
      const mockStatistics = {
        unique_claimers: 100,
        total_claims: 500,
        total_coins_given: 50000
      };

      mockDailyBonusService.getDailyBonusStatistics.mockResolvedValue(mockStatistics);

      await controller.getDailyBonusStatistics(mockReq, mockRes);

      expect(mockDailyBonusService.getDailyBonusStatistics).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatistics
      });
    });

    it('should handle service error', async () => {
      mockDailyBonusService.getDailyBonusStatistics.mockRejectedValue(new Error('Service error'));

      await controller.getDailyBonusStatistics(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get daily bonus statistics'
      });
    });
  });

  describe('resetAllStreaks', () => {
    it('should reset streaks successfully', async () => {
      mockDailyBonusService.resetAllStreaks.mockResolvedValue(25);

      await controller.resetAllStreaks(mockReq, mockRes);

      expect(mockDailyBonusService.resetAllStreaks).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          message: 'Reset streaks for 25 users',
          affectedUsers: 25
        }
      });
    });

    it('should handle service error', async () => {
      mockDailyBonusService.resetAllStreaks.mockRejectedValue(new Error('Service error'));

      await controller.resetAllStreaks(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to reset streaks'
      });
    });
  });
});