const { database } = require('../config/database');
const { repositories } = require('./index');

describe('Database and Repositories', () => {
  beforeAll(async () => {
    // Test database connection
    const isConnected = await database.testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
  });

  afterAll(async () => {
    // Close database connection
    await database.close();
  });

  describe('Database Connection', () => {
    test('should connect to database successfully', async () => {
      const result = await database.query('SELECT 1 as test');
      expect(result.rows[0].test).toBe(1);
    });

    test('should handle transactions', async () => {
      const result = await database.transaction(async (client) => {
        const testResult = await client.query('SELECT 2 as test');
        return testResult.rows[0].test;
      });
      expect(result).toBe(2);
    });
  });

  describe('User Repository', () => {
    let testUser;

    test('should create user from Telegram data', async () => {
      const telegramUser = {
        id: 123456789,
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User'
      };

      testUser = await repositories.users.createFromTelegram(telegramUser);
      
      expect(testUser).toBeDefined();
      expect(testUser.telegram_id).toBe(123456789);
      expect(testUser.username).toBe('testuser');
      expect(testUser.coins).toBe(0);
      expect(testUser.coins_per_tap).toBe(1);
    });

    test('should find user by Telegram ID', async () => {
      const foundUser = await repositories.users.findByTelegramId(123456789);
      
      expect(foundUser).toBeDefined();
      expect(foundUser.id).toBe(testUser.id);
      expect(foundUser.username).toBe('testuser');
    });

    test('should add coins to user', async () => {
      const updatedUser = await repositories.users.addCoins(testUser.id, 100);
      
      expect(updatedUser.coins).toBe(100);
      expect(updatedUser.total_coins_earned).toBe(100);
    });

    test('should deduct coins from user', async () => {
      const updatedUser = await repositories.users.deductCoins(testUser.id, 50);
      
      expect(updatedUser.coins).toBe(50);
      expect(updatedUser.total_coins_earned).toBe(100); // Total earned shouldn't change
    });

    test('should not deduct more coins than available', async () => {
      const result = await repositories.users.deductCoins(testUser.id, 100);
      expect(result).toBeNull(); // Should return null for insufficient funds
    });

    afterAll(async () => {
      // Clean up test user
      if (testUser) {
        await repositories.users.delete(testUser.id);
      }
    });
  });

  describe('Upgrade Repository', () => {
    let testUser;

    beforeAll(async () => {
      // Create test user
      const telegramUser = {
        id: 987654321,
        username: 'upgradetest',
        first_name: 'Upgrade',
        last_name: 'Test'
      };
      testUser = await repositories.users.createFromTelegram(telegramUser);
    });

    test('should create upgrade for user', async () => {
      const upgrade = await repositories.upgrades.setUpgradeLevel(
        testUser.id, 
        'tap_multiplier', 
        1
      );
      
      expect(upgrade).toBeDefined();
      expect(upgrade.user_id).toBe(testUser.id);
      expect(upgrade.upgrade_type).toBe('tap_multiplier');
      expect(upgrade.level).toBe(1);
    });

    test('should increment upgrade level', async () => {
      const upgrade = await repositories.upgrades.incrementUpgrade(
        testUser.id, 
        'tap_multiplier'
      );
      
      expect(upgrade.level).toBe(2);
    });

    test('should get user upgrades', async () => {
      const upgrades = await repositories.upgrades.getUserUpgrades(testUser.id);
      
      expect(upgrades).toHaveLength(1);
      expect(upgrades[0].upgrade_type).toBe('tap_multiplier');
      expect(upgrades[0].level).toBe(2);
    });

    afterAll(async () => {
      // Clean up
      if (testUser) {
        await repositories.upgrades.resetUserUpgrades(testUser.id);
        await repositories.users.delete(testUser.id);
      }
    });
  });

  describe('Achievement Repository', () => {
    test('should get active achievements', async () => {
      const achievements = await repositories.achievements.getActiveAchievements();
      
      expect(Array.isArray(achievements)).toBe(true);
      expect(achievements.length).toBeGreaterThan(0);
      
      // Check that all returned achievements are active
      achievements.forEach(achievement => {
        expect(achievement.is_active).toBe(true);
      });
    });

    test('should get achievements by category', async () => {
      const tappingAchievements = await repositories.achievements.getAchievementsByCategory('tapping');
      
      expect(Array.isArray(tappingAchievements)).toBe(true);
      tappingAchievements.forEach(achievement => {
        expect(achievement.category).toBe('tapping');
        expect(achievement.is_active).toBe(true);
      });
    });
  });

  describe('Social Repository', () => {
    let testUser1, testUser2;

    beforeAll(async () => {
      // Create test users
      testUser1 = await repositories.users.createFromTelegram({
        id: 111111111,
        username: 'social1',
        first_name: 'Social',
        last_name: 'One'
      });

      testUser2 = await repositories.users.createFromTelegram({
        id: 222222222,
        username: 'social2',
        first_name: 'Social',
        last_name: 'Two'
      });
    });

    test('should add friend relationship', async () => {
      const friendship = await repositories.social.addFriend(testUser1.id, testUser2.id);
      
      expect(friendship).toBeDefined();
      expect(friendship.user_id).toBe(testUser1.id);
      expect(friendship.friend_id).toBe(testUser2.id);
      expect(friendship.status).toBe('active');
    });

    test('should check if users are friends', async () => {
      const areFriends = await repositories.social.areFriends(testUser1.id, testUser2.id);
      expect(areFriends).toBe(true);
    });

    test('should get user friends', async () => {
      const friends = await repositories.social.getUserFriends(testUser1.id);
      
      expect(Array.isArray(friends)).toBe(true);
      expect(friends).toHaveLength(1);
      expect(friends[0].id).toBe(testUser2.id);
    });

    test('should get friend count', async () => {
      const count = await repositories.social.getFriendCount(testUser1.id);
      expect(count).toBe(1);
    });

    afterAll(async () => {
      // Clean up
      if (testUser1 && testUser2) {
        await repositories.social.removeFriend(testUser1.id, testUser2.id);
        await repositories.users.delete(testUser1.id);
        await repositories.users.delete(testUser2.id);
      }
    });
  });

  describe('Event Repository', () => {
    let testEvent;

    test('should create event', async () => {
      const eventData = {
        name: 'Test Weekend Event',
        description: 'A test weekend multiplier event',
        event_type: 'weekend_multiplier',
        multiplier: 2.0,
        start_time: new Date(Date.now() + 60000), // 1 minute from now
        end_time: new Date(Date.now() + 3600000) // 1 hour from now
      };

      testEvent = await repositories.events.createEvent(eventData);
      
      expect(testEvent).toBeDefined();
      expect(testEvent.name).toBe('Test Weekend Event');
      expect(testEvent.event_type).toBe('weekend_multiplier');
      expect(parseFloat(testEvent.multiplier)).toBe(2.0);
    });

    test('should get upcoming events', async () => {
      const upcomingEvents = await repositories.events.getUpcomingEvents();
      
      expect(Array.isArray(upcomingEvents)).toBe(true);
      
      // Our test event should be in the upcoming events
      const foundEvent = upcomingEvents.find(event => event.id === testEvent.id);
      expect(foundEvent).toBeDefined();
    });

    test('should get events by type', async () => {
      const weekendEvents = await repositories.events.getEventsByType('weekend_multiplier');
      
      expect(Array.isArray(weekendEvents)).toBe(true);
      
      // Our test event should be in the weekend events
      const foundEvent = weekendEvents.find(event => event.id === testEvent.id);
      expect(foundEvent).toBeDefined();
    });

    afterAll(async () => {
      // Clean up
      if (testEvent) {
        await repositories.events.delete(testEvent.id);
      }
    });
  });

  describe('Game Session Repository', () => {
    let testUser, testSession;

    beforeAll(async () => {
      // Create test user
      testUser = await repositories.users.createFromTelegram({
        id: 333333333,
        username: 'sessiontest',
        first_name: 'Session',
        last_name: 'Test'
      });
    });

    test('should start game session', async () => {
      testSession = await repositories.gameSessions.startSession(
        testUser.id,
        '127.0.0.1',
        'Test User Agent'
      );
      
      expect(testSession).toBeDefined();
      expect(testSession.user_id).toBe(testUser.id);
      expect(testSession.ip_address).toBe('127.0.0.1');
      expect(testSession.total_taps).toBe(0);
      expect(testSession.total_earnings).toBe(0);
    });

    test('should update session stats', async () => {
      const updatedSession = await repositories.gameSessions.updateSessionStats(
        testSession.id,
        10, // taps
        50  // earnings
      );
      
      expect(updatedSession.total_taps).toBe(10);
      expect(updatedSession.total_earnings).toBe(50);
    });

    test('should record tap event', async () => {
      const tapEvent = await repositories.gameSessions.recordTapEvent(
        testUser.id,
        testSession.id,
        5, // earnings
        false, // not golden tap
        Date.now()
      );
      
      expect(tapEvent).toBeDefined();
      expect(tapEvent.user_id).toBe(testUser.id);
      expect(tapEvent.session_id).toBe(testSession.id);
      expect(tapEvent.earnings).toBe(5);
      expect(tapEvent.is_golden_tap).toBe(false);
    });

    test('should end session', async () => {
      const endedSession = await repositories.gameSessions.endSession(testSession.id);
      
      expect(endedSession.end_time).toBeDefined();
    });

    afterAll(async () => {
      // Clean up
      if (testUser) {
        await repositories.users.delete(testUser.id);
      }
    });
  });
});