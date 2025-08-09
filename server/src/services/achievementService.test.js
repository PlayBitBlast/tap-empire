const AchievementService = require('./achievementService');
const AchievementRepository = require('../repositories/AchievementRepository');
const UserRepository = require('../repositories/UserRepository');

// Mock the repositories
jest.mock('../repositories/AchievementRepository');
jest.mock('../repositories/UserRepository');

describe('AchievementService', () => {
  let achievementService;
  let mockAchievementRepo;
  let mockUserRepo;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock instances
    mockAchievementRepo = new AchievementRepository();
    mockUserRepo = new UserRepository();
    
    // Create service instance
    achievementService = new AchievementService();
    achievementService.achievementRepo = mockAchievementRepo;
    achievementService.userRepo = mockUserRepo;
  });

  describe('getAchievementsWithProgress', () => {
    it('should return achievements grouped by category with progress', async () => {
      const userId = 1;
      const mockAchievements = [
        {
          id: 1,
          name: 'First Tap',
          description: 'Make your first tap',
          category: 'tapping',
          requirement_type: 'total_taps',
          requirement_value: 1,
          unlocked: true
        },
        {
          id: 2,
          name: 'Tap Novice',
          description: 'Make 100 taps',
          category: 'tapping',
          requirement_type: 'total_taps',
          requirement_value: 100,
          unlocked: false
        }
      ];

      const mockUserStats = {
        totalTaps: 50,
        totalCoinsEarned: 1000
      };

      mockAchievementRepo.getUserAchievementProgress.mockResolvedValue(mockAchievements);
      achievementService.getUserStats = jest.fn().mockResolvedValue(mockUserStats);

      const result = await achievementService.getAchievementsWithProgress(userId);

      expect(result).toHaveProperty('tapping');
      expect(result.tapping.achievements).toHaveLength(2);
      expect(result.tapping.achievements[0].isUnlocked).toBe(true);
      expect(result.tapping.achievements[1].progressPercentage).toBe(50); // 50/100 = 50%
    });
  });

  describe('checkAndUnlockAchievements', () => {
    it('should unlock achievements when requirements are met', async () => {
      const userId = 1;
      const mockUnlockableAchievements = [
        {
          id: 1,
          name: 'First Tap',
          requirement_type: 'total_taps',
          requirement_value: 1,
          reward_coins: 10,
          reward_multiplier: 1.01
        }
      ];

      const mockUserStats = { totalTaps: 1 };

      achievementService.getUserStats = jest.fn().mockResolvedValue(mockUserStats);
      mockAchievementRepo.getUnlockableAchievements.mockResolvedValue(mockUnlockableAchievements);
      mockAchievementRepo.unlockAchievement.mockResolvedValue({ unlocked_at: new Date() });
      achievementService.applyAchievementRewards = jest.fn().mockResolvedValue();

      const result = await achievementService.checkAndUnlockAchievements(userId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('First Tap');
      expect(mockAchievementRepo.unlockAchievement).toHaveBeenCalledWith(userId, 1);
      expect(achievementService.applyAchievementRewards).toHaveBeenCalled();
    });

    it('should return empty array when no achievements are unlockable', async () => {
      const userId = 1;
      const mockUserStats = { totalTaps: 0 };

      achievementService.getUserStats = jest.fn().mockResolvedValue(mockUserStats);
      mockAchievementRepo.getUnlockableAchievements.mockResolvedValue([]);

      const result = await achievementService.checkAndUnlockAchievements(userId);

      expect(result).toHaveLength(0);
    });
  });

  describe('trackMilestone', () => {
    it('should update user milestone and check for achievements', async () => {
      const userId = 1;
      const milestoneType = 'tap';
      const value = 1;

      achievementService.updateUserMilestone = jest.fn().mockResolvedValue();
      achievementService.checkAndUnlockAchievements = jest.fn().mockResolvedValue([]);

      const result = await achievementService.trackMilestone(userId, milestoneType, value);

      expect(achievementService.updateUserMilestone).toHaveBeenCalledWith(userId, milestoneType, value);
      expect(achievementService.checkAndUnlockAchievements).toHaveBeenCalledWith(userId, milestoneType);
      expect(result).toEqual([]);
    });
  });

  describe('calculateAchievementProgress', () => {
    it('should calculate progress correctly for different requirement types', () => {
      const achievement = {
        requirement_type: 'total_taps',
        requirement_value: 100
      };
      const userStats = { totalTaps: 50 };

      const result = achievementService.calculateAchievementProgress(achievement, userStats);

      expect(result.current).toBe(50);
      expect(result.required).toBe(100);
      expect(result.percentage).toBe(50);
    });

    it('should cap progress at 100%', () => {
      const achievement = {
        requirement_type: 'total_taps',
        requirement_value: 100
      };
      const userStats = { totalTaps: 150 };

      const result = achievementService.calculateAchievementProgress(achievement, userStats);

      expect(result.percentage).toBe(100);
    });
  });

  describe('shareAchievement', () => {
    it('should generate share data for valid achievement', async () => {
      const userId = 1;
      const achievementId = 1;
      const mockAchievement = {
        id: 1,
        name: 'First Tap',
        description: 'Make your first tap',
        category: 'tapping'
      };
      const mockUser = { id: 1, username: 'testuser' };

      mockAchievementRepo.findById.mockResolvedValue(mockAchievement);
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockAchievementRepo.hasAchievement.mockResolvedValue(true);

      const result = await achievementService.shareAchievement(userId, achievementId);

      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('url');
      expect(result.text).toContain('First Tap');
      expect(result.url).toContain('achievement_1');
    });

    it('should throw error if user does not have achievement', async () => {
      const userId = 1;
      const achievementId = 1;
      const mockAchievement = { id: 1, name: 'First Tap' };
      const mockUser = { id: 1, username: 'testuser' };

      mockAchievementRepo.findById.mockResolvedValue(mockAchievement);
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockAchievementRepo.hasAchievement.mockResolvedValue(false);

      await expect(achievementService.shareAchievement(userId, achievementId))
        .rejects.toThrow('User does not have this achievement');
    });
  });

  describe('isAchievementTriggeredBy', () => {
    it('should correctly identify trigger types', () => {
      const tapAchievement = { requirement_type: 'total_taps' };
      const coinAchievement = { requirement_type: 'total_coins_earned' };

      expect(achievementService.isAchievementTriggeredBy(tapAchievement, 'tap')).toBe(true);
      expect(achievementService.isAchievementTriggeredBy(tapAchievement, 'earn_coins')).toBe(false);
      expect(achievementService.isAchievementTriggeredBy(coinAchievement, 'earn_coins')).toBe(true);
    });
  });

  describe('updateUserMilestone', () => {
    it('should update tap milestone correctly', async () => {
      const userId = 1;
      const milestoneType = 'tap';
      const value = 5;

      mockUserRepo.db = {
        query: jest.fn().mockResolvedValue()
      };

      await achievementService.updateUserMilestone(userId, milestoneType, value);

      expect(mockUserRepo.db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_stats'),
        [userId]
      );
      expect(mockUserRepo.db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_stats'),
        [userId, value]
      );
    });

    it('should update max_taps_per_second milestone correctly', async () => {
      const userId = 1;
      const milestoneType = 'max_taps_per_second';
      const value = 15;

      mockUserRepo.db = {
        query: jest.fn().mockResolvedValue()
      };

      await achievementService.updateUserMilestone(userId, milestoneType, value);

      expect(mockUserRepo.db.query).toHaveBeenCalledWith(
        expect.stringContaining('GREATEST'),
        [userId, value]
      );
    });
  });

  describe('getUserStats', () => {
    it('should return comprehensive user statistics', async () => {
      const userId = 1;
      const mockUser = {
        id: 1,
        total_coins_earned: 5000,
        prestige_level: 1,
        login_streak: 5
      };

      const mockAdditionalStats = {
        total_taps: 100,
        golden_taps_count: 5,
        max_taps_per_second: 12
      };

      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockUserRepo.db = {
        queryOne: jest.fn()
          .mockResolvedValueOnce(mockAdditionalStats) // user_stats query
          .mockResolvedValueOnce({ count: 10 }) // friends count
          .mockResolvedValueOnce({ count: 25 }) // upgrades count
      };

      const result = await achievementService.getUserStats(userId);

      expect(result.totalTaps).toBe(100);
      expect(result.totalCoinsEarned).toBe(5000);
      expect(result.goldenTapsCount).toBe(5);
      expect(result.friendsCount).toBe(10);
      expect(result.totalUpgrades).toBe(25);
      expect(result.prestigeLevel).toBe(1);
    });
  });
});