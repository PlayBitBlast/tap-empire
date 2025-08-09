import leaderboardService from './leaderboardService';
import { SOCKET_EVENTS } from '../shared/constants/events';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('LeaderboardService', () => {
  let mockSocket;

  beforeEach(() => {
    // Mock socket
    mockSocket = {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    };

    // Reset service state
    leaderboardService.socket = null;
    leaderboardService.eventListeners.clear();
    leaderboardService.cache.clear();

    // Reset mocks
    fetch.mockClear();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setSocket', () => {
    it('should set socket and setup listeners', () => {
      leaderboardService.setSocket(mockSocket);

      expect(leaderboardService.socket).toBe(mockSocket);
      expect(mockSocket.on).toHaveBeenCalledWith(
        SOCKET_EVENTS.LEADERBOARD_DATA,
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        SOCKET_EVENTS.LEADERBOARD_UPDATE,
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        SOCKET_EVENTS.LEADERBOARD_RANK_CHANGE,
        expect.any(Function)
      );
    });
  });

  describe('getLeaderboard', () => {
    it('should fetch leaderboard data via HTTP API', async () => {
      const mockResponse = {
        success: true,
        data: {
          type: 'all_time',
          entries: [
            { rank: 1, userId: 123, username: 'player1', totalCoins: 1000 }
          ],
          pagination: { limit: 100, offset: 0, total: 1, hasMore: false }
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      mockLocalStorage.getItem.mockReturnValue('mock-token');

      const result = await leaderboardService.getLeaderboard('all_time', 100, 0);

      expect(fetch).toHaveBeenCalledWith(
        '/api/leaderboard/all_time?limit=100&offset=0',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          }
        }
      );

      expect(result).toEqual(mockResponse.data);
    });

    it('should return cached data when available', async () => {
      const cachedData = { type: 'all_time', entries: [] };
      leaderboardService.setCache('leaderboard:all_time:100:0', cachedData);

      const result = await leaderboardService.getLeaderboard('all_time', 100, 0);

      expect(result).toEqual(cachedData);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle HTTP errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(leaderboardService.getLeaderboard())
        .rejects.toThrow('HTTP error! status: 500');
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        success: false,
        error: 'Database error'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await expect(leaderboardService.getLeaderboard())
        .rejects.toThrow('Database error');
    });
  });

  describe('getLeaderboardRealTime', () => {
    it('should fetch leaderboard data via WebSocket', async () => {
      leaderboardService.setSocket(mockSocket);

      const mockData = {
        leaderboard: { type: 'all_time', entries: [] },
        userRank: null
      };

      // Mock the socket response immediately
      const promise = leaderboardService.getLeaderboardRealTime('all_time');
      
      // Get the emitted request to extract requestId
      const emitCall = mockSocket.emit.mock.calls[0];
      const requestData = emitCall[1];
      
      // Simulate socket response with matching requestId
      const responseHandler = mockSocket.on.mock.calls
        .find(call => call[0] === SOCKET_EVENTS.LEADERBOARD_DATA)[1];
      responseHandler({
        requestId: requestData.requestId,
        success: true,
        data: mockData
      });

      const result = await promise;

      expect(mockSocket.emit).toHaveBeenCalledWith(
        SOCKET_EVENTS.LEADERBOARD_REQUEST,
        expect.objectContaining({
          type: 'all_time',
          limit: 100,
          offset: 0,
          includeUserRank: false,
          userId: null
        })
      );

      expect(result).toEqual(mockData);
    });

    it('should reject if socket is not connected', async () => {
      await expect(leaderboardService.getLeaderboardRealTime())
        .rejects.toThrow('Socket not connected');
    });

    it('should handle socket errors', async () => {
      leaderboardService.setSocket(mockSocket);

      // Mock the socket error response immediately
      const promise = leaderboardService.getLeaderboardRealTime();
      
      // Get the emitted request to extract requestId
      const emitCall = mockSocket.emit.mock.calls[0];
      const requestData = emitCall[1];
      
      // Simulate socket error response with matching requestId
      const responseHandler = mockSocket.on.mock.calls
        .find(call => call[0] === SOCKET_EVENTS.LEADERBOARD_DATA)[1];
      responseHandler({
        requestId: requestData.requestId,
        success: false,
        error: 'Server error'
      });

      await expect(promise).rejects.toThrow('Server error');
    });

    it('should timeout after 10 seconds', async () => {
      leaderboardService.setSocket(mockSocket);

      // Don't simulate any response to trigger timeout
      await expect(leaderboardService.getLeaderboardRealTime())
        .rejects.toThrow('Request timeout');
    }, 11000);
  });

  describe('getUserRank', () => {
    it('should fetch user rank data', async () => {
      const mockResponse = {
        success: true,
        data: {
          userRank: 5,
          userScore: 1000,
          nearbyPlayers: [],
          totalPlayers: 100
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      mockLocalStorage.getItem.mockReturnValue('mock-token');

      const result = await leaderboardService.getUserRank(123, 'all_time', 5);

      expect(fetch).toHaveBeenCalledWith(
        '/api/leaderboard/all_time/user/123?range=5',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          })
        })
      );

      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('subscribeToUpdates', () => {
    it('should subscribe to leaderboard updates', () => {
      const callback = jest.fn();
      const unsubscribe = leaderboardService.subscribeToUpdates(callback);

      expect(typeof unsubscribe).toBe('function');
      expect(leaderboardService.eventListeners.get(SOCKET_EVENTS.LEADERBOARD_UPDATE))
        .toContain(callback);
      expect(leaderboardService.eventListeners.get(SOCKET_EVENTS.LEADERBOARD_RANK_CHANGE))
        .toContain(callback);

      // Test unsubscribe
      unsubscribe();
      expect(leaderboardService.eventListeners.get(SOCKET_EVENTS.LEADERBOARD_UPDATE))
        .not.toContain(callback);
      expect(leaderboardService.eventListeners.get(SOCKET_EVENTS.LEADERBOARD_RANK_CHANGE))
        .not.toContain(callback);
    });
  });

  describe('handleLeaderboardUpdate', () => {
    it('should clear cache and notify listeners', () => {
      const callback = jest.fn();
      leaderboardService.subscribeToUpdates(callback);
      leaderboardService.setCache('leaderboard:all_time:100:0', { test: 'data' });

      const updateData = { type: 'global_update', data: {} };
      leaderboardService.handleLeaderboardUpdate(updateData);

      expect(leaderboardService.getFromCache('leaderboard:all_time:100:0')).toBeNull();
      expect(callback).toHaveBeenCalledWith(updateData);
    });
  });

  describe('cache management', () => {
    it('should set and get cache data', () => {
      const testData = { test: 'data' };
      leaderboardService.setCache('test-key', testData);

      const retrieved = leaderboardService.getFromCache('test-key');
      expect(retrieved).toEqual(testData);
    });

    it('should return null for expired cache', () => {
      const testData = { test: 'data' };
      leaderboardService.setCache('test-key', testData);

      // Mock expired timestamp
      const cacheEntry = leaderboardService.cache.get('test-key');
      cacheEntry.timestamp = Date.now() - 60000; // 1 minute ago

      const retrieved = leaderboardService.getFromCache('test-key');
      expect(retrieved).toBeNull();
      expect(leaderboardService.cache.has('test-key')).toBe(false);
    });

    it('should clear cache by pattern', () => {
      leaderboardService.setCache('leaderboard:all_time', { test: 'data1' });
      leaderboardService.setCache('leaderboard:weekly', { test: 'data2' });
      leaderboardService.setCache('other:data', { test: 'data3' });

      leaderboardService.clearCacheByPattern('leaderboard:');

      expect(leaderboardService.getFromCache('leaderboard:all_time')).toBeNull();
      expect(leaderboardService.getFromCache('leaderboard:weekly')).toBeNull();
      expect(leaderboardService.getFromCache('other:data')).toEqual({ test: 'data3' });
    });
  });

  describe('utility methods', () => {
    it('should format rank correctly', () => {
      expect(leaderboardService.formatRank(1)).toBe('1st');
      expect(leaderboardService.formatRank(2)).toBe('2nd');
      expect(leaderboardService.formatRank(3)).toBe('3rd');
      expect(leaderboardService.formatRank(4)).toBe('4th');
      expect(leaderboardService.formatRank(11)).toBe('11th');
      expect(leaderboardService.formatRank(21)).toBe('21st');
      expect(leaderboardService.formatRank(null)).toBe('Unranked');
    });

    it('should format coins correctly', () => {
      expect(leaderboardService.formatCoins(500)).toBe('500');
      expect(leaderboardService.formatCoins(1500)).toBe('1.5K');
      expect(leaderboardService.formatCoins(1500000)).toBe('1.5M');
      expect(leaderboardService.formatCoins(1500000000)).toBe('1.5B');
    });

    it('should return correct rank colors', () => {
      expect(leaderboardService.getRankColor(1)).toBe('rank-gold');
      expect(leaderboardService.getRankColor(2)).toBe('rank-silver');
      expect(leaderboardService.getRankColor(3)).toBe('rank-bronze');
      expect(leaderboardService.getRankColor(5)).toBe('rank-top-10');
      expect(leaderboardService.getRankColor(50)).toBe('rank-top-100');
      expect(leaderboardService.getRankColor(200)).toBe('rank-default');
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources', () => {
      leaderboardService.setSocket(mockSocket);
      leaderboardService.subscribeToUpdates(jest.fn());
      leaderboardService.setCache('test', { data: 'test' });

      leaderboardService.cleanup();

      expect(leaderboardService.eventListeners.size).toBe(0);
      expect(leaderboardService.cache.size).toBe(0);
      expect(mockSocket.off).toHaveBeenCalledWith(SOCKET_EVENTS.LEADERBOARD_DATA);
      expect(mockSocket.off).toHaveBeenCalledWith(SOCKET_EVENTS.LEADERBOARD_UPDATE);
      expect(mockSocket.off).toHaveBeenCalledWith(SOCKET_EVENTS.LEADERBOARD_RANK_CHANGE);
    });
  });
});