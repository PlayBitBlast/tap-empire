const AchievementController = require('./achievementController');
const AchievementService = require('../services/achievementService');

// Mock the achievement service
jest.mock('../services/achievementService');

describe('AchievementController', () => {
  let achievementController;
  let mockAchievementService;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock service instance
    mockAchievementService = new AchievementService();
    
    // Create controller instance
    achievementController = new AchievementController();
    achievementController.achievementService = mockAchievementService;

    // Mock request and response objects
    mockReq = {
      user: { id: 1 },
      params: {},
      query: {},
      body: {}
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('getUserAchievements', () => {
    it('should return user achievements successfully', async () => {
      const mockAchievements = {
        tapping: {
          name: 'Tapping Master',
          achievements: [
            { id: 1, name: 'First Tap', isUnlocked: true }
          ]
        }
      };

      mockAchievementService.getAchievementsWithProgress.mockResolvedValue(mockAchievements);

      await achievementController.getUserAchievements(mockReq, mockRes);

      expect(mockAchievementService.getAchievementsWithProgress).toHaveBeenCalledWith(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockAchievements
      });
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error');
      mockAchievementService.getAchievementsWithProgress.mockRejectedValue(error);

      await achievementController.getUserAchievements(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get achievements'
      });
    });
  });

  describe('getUserAchievementStats', () => {
    it('should return user achievement statistics', async () => {
      const mockStats = {
        unlocked_achievements: 5,
        total_achievements: 20,
        completion_percentage: 25
      };

      mockAchievementService.getUserAchievementStats.mockResolvedValue(mockStats);

      await achievementController.getUserAchievementStats(mockReq, mockRes);

      expect(mockAchievementService.getUserAchievementStats).toHaveBeenCalledWith(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      });
    });
  });

  describe('getAchievementLeaderboard', () => {
    it('should return achievement leaderboard with default limit', async () => {
      const mockLeaderboard = [
        { userId: 1, achievement_count: 15 },
        { userId: 2, achievement_count: 12 }
      ];

      mockAchievementService.getAchievementLeaderboard.mockResolvedValue(mockLeaderboard);

      await achievementController.getAchievementLeaderboard(mockReq, mockRes);

      expect(mockAchievementService.getAchievementLeaderboard).toHaveBeenCalledWith(100);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockLeaderboard
      });
    });

    it('should use custom limit from query params', async () => {
      mockReq.query.limit = '50';
      const mockLeaderboard = [];

      mockAchievementService.getAchievementLeaderboard.mockResolvedValue(mockLeaderboard);

      await achievementController.getAchievementLeaderboard(mockReq, mockRes);

      expect(mockAchievementService.getAchievementLeaderboard).toHaveBeenCalledWith(50);
    });
  });

  describe('shareAchievement', () => {
    it('should share achievement successfully', async () => {
      mockReq.params.achievementId = '1';
      const mockShareData = {
        text: 'I unlocked an achievement!',
        url: 'https://t.me/game?achievement=1'
      };

      mockAchievementService.shareAchievement.mockResolvedValue(mockShareData);

      await achievementController.shareAchievement(mockReq, mockRes);

      expect(mockAchievementService.shareAchievement).toHaveBeenCalledWith(1, 1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockShareData
      });
    });

    it('should return 400 if achievement ID is missing', async () => {
      mockReq.params = {};

      await achievementController.shareAchievement(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Achievement ID is required'
      });
    });

    it('should return 404 if achievement not found', async () => {
      mockReq.params.achievementId = '999';
      const error = new Error('Achievement or user not found');
      mockAchievementService.shareAchievement.mockRejectedValue(error);

      await achievementController.shareAchievement(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Achievement not found'
      });
    });

    it('should return 403 if user does not have achievement', async () => {
      mockReq.params.achievementId = '1';
      const error = new Error('User does not have this achievement');
      mockAchievementService.shareAchievement.mockRejectedValue(error);

      await achievementController.shareAchievement(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'You do not have this achievement'
      });
    });
  });

  describe('trackMilestone', () => {
    it('should track milestone successfully', async () => {
      mockReq.body = {
        milestoneType: 'tap',
        value: 1
      };
      const mockNewAchievements = [
        { id: 1, name: 'First Tap' }
      ];

      mockAchievementService.trackMilestone.mockResolvedValue(mockNewAchievements);

      await achievementController.trackMilestone(mockReq, mockRes);

      expect(mockAchievementService.trackMilestone).toHaveBeenCalledWith(1, 'tap', 1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          newAchievements: mockNewAchievements,
          count: 1
        }
      });
    });

    it('should use default value of 1 if not provided', async () => {
      mockReq.body = {
        milestoneType: 'tap'
      };

      mockAchievementService.trackMilestone.mockResolvedValue([]);

      await achievementController.trackMilestone(mockReq, mockRes);

      expect(mockAchievementService.trackMilestone).toHaveBeenCalledWith(1, 'tap', 1);
    });

    it('should return 400 if milestone type is missing', async () => {
      mockReq.body = {};

      await achievementController.trackMilestone(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Milestone type is required'
      });
    });
  });

  describe('checkAchievements', () => {
    it('should check achievements with trigger type', async () => {
      mockReq.body = { triggerType: 'tap' };
      const mockNewAchievements = [];

      mockAchievementService.checkAndUnlockAchievements.mockResolvedValue(mockNewAchievements);

      await achievementController.checkAchievements(mockReq, mockRes);

      expect(mockAchievementService.checkAndUnlockAchievements).toHaveBeenCalledWith(1, 'tap');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          newAchievements: mockNewAchievements,
          count: 0
        }
      });
    });

    it('should check achievements without trigger type', async () => {
      mockReq.body = {};
      const mockNewAchievements = [];

      mockAchievementService.checkAndUnlockAchievements.mockResolvedValue(mockNewAchievements);

      await achievementController.checkAchievements(mockReq, mockRes);

      expect(mockAchievementService.checkAndUnlockAchievements).toHaveBeenCalledWith(1, undefined);
    });
  });

  describe('getRecentUnlocks', () => {
    it('should return recent unlocks with default limit', async () => {
      const mockRecentUnlocks = [
        { achievement_name: 'First Tap', username: 'user1' }
      ];

      mockAchievementService.getRecentUnlocks.mockResolvedValue(mockRecentUnlocks);

      await achievementController.getRecentUnlocks(mockReq, mockRes);

      expect(mockAchievementService.getRecentUnlocks).toHaveBeenCalledWith(50);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockRecentUnlocks
      });
    });

    it('should use custom limit from query params', async () => {
      mockReq.query.limit = '25';
      const mockRecentUnlocks = [];

      mockAchievementService.getRecentUnlocks.mockResolvedValue(mockRecentUnlocks);

      await achievementController.getRecentUnlocks(mockReq, mockRes);

      expect(mockAchievementService.getRecentUnlocks).toHaveBeenCalledWith(25);
    });
  });

  describe('getAchievementStatistics', () => {
    it('should return achievement statistics', async () => {
      const mockStatistics = {
        mostPopular: [],
        rarest: [],
        statistics: { total_achievements: 50 }
      };

      mockAchievementService.getAchievementStatistics.mockResolvedValue(mockStatistics);

      await achievementController.getAchievementStatistics(mockReq, mockRes);

      expect(mockAchievementService.getAchievementStatistics).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatistics
      });
    });
  });
});