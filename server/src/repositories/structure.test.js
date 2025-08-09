const { 
  BaseRepository,
  UserRepository,
  UpgradeRepository,
  AchievementRepository,
  SocialRepository,
  GameSessionRepository,
  EventRepository,
  repositories
} = require('./index');

describe('Repository Structure', () => {
  describe('Repository Classes', () => {
    test('should export all repository classes', () => {
      expect(BaseRepository).toBeDefined();
      expect(UserRepository).toBeDefined();
      expect(UpgradeRepository).toBeDefined();
      expect(AchievementRepository).toBeDefined();
      expect(SocialRepository).toBeDefined();
      expect(GameSessionRepository).toBeDefined();
      expect(EventRepository).toBeDefined();
    });

    test('all repositories should extend BaseRepository', () => {
      expect(new UserRepository()).toBeInstanceOf(BaseRepository);
      expect(new UpgradeRepository()).toBeInstanceOf(BaseRepository);
      expect(new AchievementRepository()).toBeInstanceOf(BaseRepository);
      expect(new SocialRepository()).toBeInstanceOf(BaseRepository);
      expect(new GameSessionRepository()).toBeInstanceOf(BaseRepository);
      expect(new EventRepository()).toBeInstanceOf(BaseRepository);
    });

    test('repositories should have correct table names', () => {
      expect(new UserRepository().tableName).toBe('users');
      expect(new UpgradeRepository().tableName).toBe('user_upgrades');
      expect(new AchievementRepository().tableName).toBe('achievements');
      expect(new SocialRepository().tableName).toBe('friendships');
      expect(new GameSessionRepository().tableName).toBe('game_sessions');
      expect(new EventRepository().tableName).toBe('events');
    });
  });

  describe('Repository Instances', () => {
    test('should export repository instances', () => {
      expect(repositories).toBeDefined();
      expect(repositories.users).toBeInstanceOf(UserRepository);
      expect(repositories.upgrades).toBeInstanceOf(UpgradeRepository);
      expect(repositories.achievements).toBeInstanceOf(AchievementRepository);
      expect(repositories.social).toBeInstanceOf(SocialRepository);
      expect(repositories.gameSessions).toBeInstanceOf(GameSessionRepository);
      expect(repositories.events).toBeInstanceOf(EventRepository);
    });
  });

  describe('BaseRepository Methods', () => {
    let baseRepo;

    beforeEach(() => {
      baseRepo = new BaseRepository('test_table');
    });

    test('should have all required CRUD methods', () => {
      expect(typeof baseRepo.findById).toBe('function');
      expect(typeof baseRepo.findAll).toBe('function');
      expect(typeof baseRepo.findOne).toBe('function');
      expect(typeof baseRepo.create).toBe('function');
      expect(typeof baseRepo.update).toBe('function');
      expect(typeof baseRepo.delete).toBe('function');
      expect(typeof baseRepo.count).toBe('function');
      expect(typeof baseRepo.exists).toBe('function');
    });

    test('should have utility methods', () => {
      expect(typeof baseRepo.raw).toBe('function');
      expect(typeof baseRepo.transaction).toBe('function');
      expect(typeof baseRepo.bulkCreate).toBe('function');
      expect(typeof baseRepo.paginate).toBe('function');
    });

    test('should set table name correctly', () => {
      expect(baseRepo.tableName).toBe('test_table');
    });
  });

  describe('UserRepository Methods', () => {
    let userRepo;

    beforeEach(() => {
      userRepo = new UserRepository();
    });

    test('should have user-specific methods', () => {
      expect(typeof userRepo.findByTelegramId).toBe('function');
      expect(typeof userRepo.createFromTelegram).toBe('function');
      expect(typeof userRepo.addCoins).toBe('function');
      expect(typeof userRepo.deductCoins).toBe('function');
      expect(typeof userRepo.updateLoginStreak).toBe('function');
      expect(typeof userRepo.getTopUsers).toBe('function');
      expect(typeof userRepo.getUserRank).toBe('function');
      expect(typeof userRepo.prestige).toBe('function');
    });
  });

  describe('UpgradeRepository Methods', () => {
    let upgradeRepo;

    beforeEach(() => {
      upgradeRepo = new UpgradeRepository();
    });

    test('should have upgrade-specific methods', () => {
      expect(typeof upgradeRepo.getUserUpgrades).toBe('function');
      expect(typeof upgradeRepo.getUserUpgrade).toBe('function');
      expect(typeof upgradeRepo.getUpgradeLevel).toBe('function');
      expect(typeof upgradeRepo.setUpgradeLevel).toBe('function');
      expect(typeof upgradeRepo.incrementUpgrade).toBe('function');
      expect(typeof upgradeRepo.resetUserUpgrades).toBe('function');
    });
  });

  describe('AchievementRepository Methods', () => {
    let achievementRepo;

    beforeEach(() => {
      achievementRepo = new AchievementRepository();
    });

    test('should have achievement-specific methods', () => {
      expect(typeof achievementRepo.getActiveAchievements).toBe('function');
      expect(typeof achievementRepo.getAchievementsByCategory).toBe('function');
      expect(typeof achievementRepo.getUserAchievements).toBe('function');
      expect(typeof achievementRepo.unlockAchievement).toBe('function');
      expect(typeof achievementRepo.hasAchievement).toBe('function');
      expect(typeof achievementRepo.getUnlockableAchievements).toBe('function');
    });
  });

  describe('SocialRepository Methods', () => {
    let socialRepo;

    beforeEach(() => {
      socialRepo = new SocialRepository();
    });

    test('should have social-specific methods', () => {
      expect(typeof socialRepo.getUserFriends).toBe('function');
      expect(typeof socialRepo.addFriend).toBe('function');
      expect(typeof socialRepo.removeFriend).toBe('function');
      expect(typeof socialRepo.areFriends).toBe('function');
      expect(typeof socialRepo.sendGift).toBe('function');
      expect(typeof socialRepo.getReceivedGifts).toBe('function');
      expect(typeof socialRepo.claimGift).toBe('function');
    });
  });

  describe('GameSessionRepository Methods', () => {
    let sessionRepo;

    beforeEach(() => {
      sessionRepo = new GameSessionRepository();
    });

    test('should have session-specific methods', () => {
      expect(typeof sessionRepo.startSession).toBe('function');
      expect(typeof sessionRepo.endSession).toBe('function');
      expect(typeof sessionRepo.updateSessionStats).toBe('function');
      expect(typeof sessionRepo.recordTapEvent).toBe('function');
      expect(typeof sessionRepo.getRecentTaps).toBe('function');
      expect(typeof sessionRepo.detectBotBehavior).toBe('function');
    });
  });

  describe('EventRepository Methods', () => {
    let eventRepo;

    beforeEach(() => {
      eventRepo = new EventRepository();
    });

    test('should have event-specific methods', () => {
      expect(typeof eventRepo.getActiveEvents).toBe('function');
      expect(typeof eventRepo.getUpcomingEvents).toBe('function');
      expect(typeof eventRepo.createEvent).toBe('function');
      expect(typeof eventRepo.getEventsByType).toBe('function');
      expect(typeof eventRepo.createWeekendEvent).toBe('function');
      expect(typeof eventRepo.scheduleWeekendEvents).toBe('function');
    });
  });
});