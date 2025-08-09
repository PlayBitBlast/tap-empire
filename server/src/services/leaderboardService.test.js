const LeaderboardService = require('./leaderboardService');
const { redisManager } = require('../config/redis');
const UserRepository = require('../repositories/UserRepository');

// Mock dependencies
jest.mock('../config/redis');
jest.mock('../repositories/UserRepository', () => ({
  UserRepository: jest.fn()
}));

describe('LeaderboardService', () => {
  let leaderboardService;
  let mockRedis;
  let mockUserRepository;
  let mockIo;

  beforeEach(() => {
    // Mock Redis manager
    mockRedis = {
      updateLeaderboardScore: jest.fn(),
      getPlayerRank: jest.fn(),
      getPlayerScore: jest.fn(),
      getLeaderboardRange: jest.fn(),
      getLeaderboardSize: jest.fn(),
      removeFromLeaderboard: jest.fn(),
      getPlayersAroundRank: jest.fn(),
      executeCommand: jest.fn(),
      setCache: jest.fn(),
      getCache: jest.fn(),
      deleteCache: jest.fn()
    };
    redisManager.updateLeaderboardScore = mockRedis.updateLeaderboardScore;
    redisManager.getPlayerRank = mockRedis.getPlayerRank;
    redisManager.getPlayerScore = mockRedis.getPlayerScore;
    redisManager.getLeaderboardRange = mockRedis.getLeaderboardRange;
    redisManager.getLeaderboardSize = mockRedis.getLeaderboardSize;
    redisManager.removeFromLeaderboard = mockRedis.removeFromLeaderboard;
    redisManager.getPlayersAroundRank = mockRedis.getPlayersAroundRank;
    redisManager.executeCommand = mockRedis.executeCommand;
    redisManager.setCache = mockRedis.setCache;
    redisManager.getCache = mockRedis.getCache;
    redisManager.deleteCache = mockRedis.deleteCache;

    // Mock UserRepository
    mockUserRepository = {
      findById: jest.fn()
    };
    const UserRepository = require('../repositories/UserRepository');
    UserRepository.mockImplementation(() => mockUserRepository);

    // Mock Socket.io
    mockIo = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis()
    };

    leaderboardService = new LeaderboardService(mockIo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updatePlayerRank', () => {
    it('should update player rank in all leaderboards', async () => {
      const userId = 123;
      const totalCoins = 1000;

      // Mock Redis responses
      mockRedis.updateLeaderboardScore.mockResolvedValue(1);
      mockRedis.getPlayerRank.mockResolvedValueOnce(0) // all_time rank (0-based)
        .mockResolvedValueOnce(1) // weekly rank
        .mockResolvedValueOnce(2); // daily rank
      mockRedis.deleteCache.mockResolvedValue(1);

      const result = await leaderboardService.updatePlayerRank(userId, totalCoins);

      // Verify Redis calls
      expect(mockRedis.updateLeaderboardScore).toHaveBeenCalledTimes(3);
      expect(mockRedis.updateLeaderboardScore).toHaveBeenCalledWith(
        'leaderboard:all_time', totalCoins, '123'
      );
      expect(mockRedis.updateLeaderboardScore).toHaveBeenCalledWith(
        'leaderboard:weekly', totalCoins, '123'
      );
      expect(mockRedis.updateLeaderboardScore).toHaveBeenCalledWith(
        'leaderboard:daily', totalCoins, '123'
      );

      // Verify rank queries
      expect(mockRedis.getPlayerRank).toHaveBeenCalledTimes(3);

      // Verify result
      expect(result).toEqual({
        userId,
        totalCoins,
        ranks: {
          allTime: 1, // 0-based converted to 1-based
          weekly: 2,
          daily: 3
        },
        timestamp: expect.any(Number)
      });

      // Verify Socket.io broadcast
      expect(mockIo.emit).toHaveBeenCalled();
    });

    it('should handle null ranks', async () => {
      const userId = 123;
      const totalCoins = 1000;

      // Mock Redis responses with null ranks
      mockRedis.updateLeaderboardScore.mockResolvedValue(1);
      mockRedis.getPlayerRank.mockResolvedValue(null);
      mockRedis.deleteCache.mockResolvedValue(1);

      const result = await leaderboardService.updatePlayerRank(userId, totalCoins);

      expect(result.ranks).toEqual({
        allTime: null,
        weekly: null,
        daily: null
      });
    });
  });

  describe('getLeaderboard', () => {
    it('should return leaderboard data with user information', async () => {
      const type = 'all_time';
      const limit = 10;
      const offset = 0;

      // Mock Redis responses
      const mockEntries = [
        { value: '123', score: 1000 },
        { value: '456', score: 800 }
      ];
      mockRedis.getLeaderboardRange.mockResolvedValue(mockEntries);
      mockRedis.getLeaderboardSize.mockResolvedValue(100);
      mockRedis.getCache.mockResolvedValue(null);
      mockRedis.setCache.mockResolvedValue('OK');

      // Mock user data
      mockUserRepository.findById.mockResolvedValueOnce({
        id: 123,
        username: 'player1',
        first_name: 'John',
        last_name: 'Doe',
        updated_at: new Date()
      }).mockResolvedValueOnce({
        id: 456,
        username: 'player2',
        first_name: 'Jane',
        last_name: 'Smith',
        updated_at: new Date()
      });

      const result = await leaderboardService.getLeaderboard(type, limit, offset);

      // Verify Redis calls
      expect(mockRedis.getLeaderboardRange).toHaveBeenCalledWith(
        'leaderboard:all_time', 0, 9, true
      );
      expect(mockRedis.getLeaderboardSize).toHaveBeenCalledWith('leaderboard:all_time');

      // Verify user repository calls
      expect(mockUserRepository.findById).toHaveBeenCalledTimes(2);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(123);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(456);

      // Verify result structure
      expect(result).toEqual({
        type,
        entries: [
          {
            rank: 1,
            userId: 123,
            username: 'player1',
            firstName: 'John',
            lastName: 'Doe',
            totalCoins: 1000,
            lastActive: expect.any(Date)
          },
          {
            rank: 2,
            userId: 456,
            username: 'player2',
            firstName: 'Jane',
            lastName: 'Smith',
            totalCoins: 800,
            lastActive: expect.any(Date)
          }
        ],
        pagination: {
          limit,
          offset,
          total: 100,
          hasMore: true
        },
        lastUpdated: expect.any(Number)
      });

      // Verify caching
      expect(mockRedis.setCache).toHaveBeenCalled();
    });

    it('should return cached data when available', async () => {
      const type = 'all_time';
      const cachedData = { type, entries: [], pagination: {} };

      mockRedis.getCache.mockResolvedValue(cachedData);

      const result = await leaderboardService.getLeaderboard(type);

      expect(result).toBe(cachedData);
      expect(mockRedis.getLeaderboardRange).not.toHaveBeenCalled();
    });

    it('should validate leaderboard type', async () => {
      await expect(leaderboardService.getLeaderboard('invalid_type'))
        .rejects.toThrow('Invalid leaderboard type');
    });
  });

  describe('getUserRankWithContext', () => {
    it('should return user rank with nearby players', async () => {
      const userId = 123;
      const type = 'all_time';

      // Mock Redis responses
      mockRedis.getCache.mockResolvedValue(null);
      mockRedis.getPlayerRank.mockResolvedValue(4); // 0-based rank
      mockRedis.getPlayerScore.mockResolvedValue(1000);
      mockRedis.getPlayersAroundRank.mockResolvedValue([
        { value: '122', score: 1200 },
        { value: '123', score: 1000 },
        { value: '124', score: 800 }
      ]);
      mockRedis.getLeaderboardSize.mockResolvedValue(100);
      mockRedis.setCache.mockResolvedValue('OK');

      // Mock user data
      mockUserRepository.findById.mockResolvedValue({
        id: 123,
        username: 'player1',
        first_name: 'John'
      });

      const result = await leaderboardService.getUserRankWithContext(userId, type);

      expect(result).toEqual({
        userRank: 5, // 0-based converted to 1-based
        userScore: 1000,
        nearbyPlayers: expect.any(Array),
        totalPlayers: 100,
        type,
        lastUpdated: expect.any(Number)
      });

      expect(mockRedis.setCache).toHaveBeenCalled();
    });

    it('should handle user not found in leaderboard', async () => {
      const userId = 123;

      mockRedis.getCache.mockResolvedValue(null);
      mockRedis.getPlayerRank.mockResolvedValue(null);
      mockRedis.getPlayerScore.mockResolvedValue(null);
      mockRedis.getLeaderboardSize.mockResolvedValue(100);

      const result = await leaderboardService.getUserRankWithContext(userId);

      expect(result).toEqual({
        userRank: null,
        userScore: null,
        nearbyPlayers: [],
        totalPlayers: 100
      });
    });
  });

  describe('resetDailyLeaderboard', () => {
    it('should reset daily leaderboard and broadcast notification', async () => {
      mockRedis.executeCommand.mockResolvedValue(1);
      mockRedis.deleteCache.mockResolvedValue(1);

      await leaderboardService.resetDailyLeaderboard();

      expect(mockRedis.executeCommand).toHaveBeenCalled();
      expect(mockRedis.deleteCache).toHaveBeenCalledWith('cache:leaderboard:daily');
      expect(mockIo.emit).toHaveBeenCalledWith('leaderboard:update', {
        type: 'daily_reset',
        timestamp: expect.any(Number)
      });
    });
  });

  describe('removeUser', () => {
    it('should remove user from all leaderboards', async () => {
      const userId = 123;

      mockRedis.removeFromLeaderboard.mockResolvedValue(1);
      mockRedis.deleteCache.mockResolvedValue(1);

      await leaderboardService.removeUser(userId);

      expect(mockRedis.removeFromLeaderboard).toHaveBeenCalledTimes(3);
      expect(mockRedis.removeFromLeaderboard).toHaveBeenCalledWith(
        'leaderboard:all_time', '123'
      );
      expect(mockRedis.removeFromLeaderboard).toHaveBeenCalledWith(
        'leaderboard:weekly', '123'
      );
      expect(mockRedis.removeFromLeaderboard).toHaveBeenCalledWith(
        'leaderboard:daily', '123'
      );
    });
  });
});