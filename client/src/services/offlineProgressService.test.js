import OfflineProgressService from './offlineProgressService';
import { GAME_CONFIG } from '../shared/constants/gameConfig';

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

describe('OfflineProgressService', () => {
  let offlineProgressService;

  beforeEach(() => {
    jest.clearAllMocks();
    offlineProgressService = new OfflineProgressService();
    mockLocalStorage.getItem.mockReturnValue('mock-token');
  });

  describe('calculateOfflineProgressLocally', () => {
    const mockGameState = {
      autoClickerRate: 10,
      coins: 1000,
      totalCoinsEarned: 5000
    };

    it('should calculate offline progress correctly', () => {
      const lastOfflineCalculation = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

      const result = offlineProgressService.calculateOfflineProgressLocally(
        mockGameState,
        lastOfflineCalculation
      );

      expect(result.hasOfflineProgress).toBe(true);
      expect(result.earnings).toBe(72000); // 10 coins/sec * 2 hours * 3600 sec/hour
      expect(result.offlineHours).toBe(2);
      expect(result.autoClickerRate).toBe(10);
      expect(result.breakdown).toBeDefined();
    });

    it('should cap offline hours to maximum allowed', () => {
      const lastOfflineCalculation = new Date(Date.now() - 6 * 60 * 60 * 1000); // 6 hours ago

      const result = offlineProgressService.calculateOfflineProgressLocally(
        mockGameState,
        lastOfflineCalculation
      );

      expect(result.hasOfflineProgress).toBe(true);
      expect(result.offlineHours).toBe(GAME_CONFIG.OFFLINE_EARNINGS_CAP_HOURS); // Should be capped at 4 hours
      expect(result.actualOfflineHours).toBe(6);
      expect(result.earnings).toBe(144000); // 10 coins/sec * 4 hours * 3600 sec/hour
    });

    it('should return no progress if offline time is too short', () => {
      const lastOfflineCalculation = new Date(Date.now() - 30 * 1000); // 30 seconds ago

      const result = offlineProgressService.calculateOfflineProgressLocally(
        mockGameState,
        lastOfflineCalculation
      );

      expect(result.hasOfflineProgress).toBe(false);
      expect(result.reason).toBe('Not enough offline time');
      expect(result.earnings).toBe(0);
    });

    it('should return no progress if user has no auto-clickers', () => {
      const gameStateWithNoAutoClickers = {
        ...mockGameState,
        autoClickerRate: 0
      };
      const lastOfflineCalculation = new Date(Date.now() - 2 * 60 * 60 * 1000);

      const result = offlineProgressService.calculateOfflineProgressLocally(
        gameStateWithNoAutoClickers,
        lastOfflineCalculation
      );

      expect(result.hasOfflineProgress).toBe(false);
      expect(result.reason).toBe('No auto-clickers');
      expect(result.earnings).toBe(0);
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

  describe('formatOfflineTime', () => {
    it('should format minutes correctly', () => {
      expect(offlineProgressService.formatOfflineTime(0.5)).toBe('30 minutes');
      expect(offlineProgressService.formatOfflineTime(1/60)).toBe('1 minute');
    });

    it('should format hours correctly', () => {
      expect(offlineProgressService.formatOfflineTime(1)).toBe('1 hour');
      expect(offlineProgressService.formatOfflineTime(2.5)).toBe('2h 30m');
      expect(offlineProgressService.formatOfflineTime(3)).toBe('3 hours');
    });

    it('should format days correctly', () => {
      expect(offlineProgressService.formatOfflineTime(24)).toBe('1 day');
      expect(offlineProgressService.formatOfflineTime(25)).toBe('1d 1h');
      expect(offlineProgressService.formatOfflineTime(48)).toBe('2 days');
    });
  });

  describe('formatCoins', () => {
    it('should format small numbers correctly', () => {
      expect(offlineProgressService.formatCoins(123)).toBe('123');
      expect(offlineProgressService.formatCoins(999)).toBe('999');
    });

    it('should format thousands correctly', () => {
      expect(offlineProgressService.formatCoins(1000)).toBe('1.0K');
      expect(offlineProgressService.formatCoins(1500)).toBe('1.5K');
      expect(offlineProgressService.formatCoins(999999)).toBe('1000.0K');
    });

    it('should format millions correctly', () => {
      expect(offlineProgressService.formatCoins(1000000)).toBe('1.0M');
      expect(offlineProgressService.formatCoins(2500000)).toBe('2.5M');
    });

    it('should format billions correctly', () => {
      expect(offlineProgressService.formatCoins(1000000000)).toBe('1.0B');
      expect(offlineProgressService.formatCoins(3500000000)).toBe('3.5B');
    });
  });

  describe('shouldShowOfflineProgress', () => {
    const mockGameState = {
      autoClickerRate: 10,
      coins: 1000,
      totalCoinsEarned: 5000
    };

    it('should return true when offline progress is available', () => {
      const lastOfflineCalculation = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

      const result = offlineProgressService.shouldShowOfflineProgress(
        mockGameState,
        lastOfflineCalculation
      );

      expect(result).toBe(true);
    });

    it('should return false when no offline progress is available', () => {
      const lastOfflineCalculation = new Date(Date.now() - 30 * 1000); // 30 seconds ago

      const result = offlineProgressService.shouldShowOfflineProgress(
        mockGameState,
        lastOfflineCalculation
      );

      expect(result).toBe(false);
    });
  });

  describe('getOfflineProgressDisplayData', () => {
    it('should return display data for valid offline progress', () => {
      const offlineResult = {
        hasOfflineProgress: true,
        earnings: 72000,
        offlineHours: 2,
        breakdown: {
          timeAway: '2 hours',
          autoClickerRate: 10,
          earningsPerSecond: 10,
          earningsPerMinute: 600,
          earningsPerHour: 36000,
          cappedAt: false,
          maxOfflineHours: 4
        }
      };

      const displayData = offlineProgressService.getOfflineProgressDisplayData(offlineResult);

      expect(displayData.shouldShow).toBe(true);
      expect(displayData.title).toBe('Welcome Back!');
      expect(displayData.subtitle).toBe('You were away for 2 hours');
      expect(displayData.earnings).toBe(72000);
      expect(displayData.formattedEarnings).toBe('72.0K');
      expect(displayData.breakdown).toBeDefined();
      expect(displayData.cappedMessage).toBeNull();
    });

    it('should return no display for invalid offline progress', () => {
      const offlineResult = {
        hasOfflineProgress: false,
        reason: 'No auto-clickers'
      };

      const displayData = offlineProgressService.getOfflineProgressDisplayData(offlineResult);

      expect(displayData.shouldShow).toBe(false);
      expect(displayData.reason).toBe('No auto-clickers');
    });

    it('should show capped message when earnings are capped', () => {
      const offlineResult = {
        hasOfflineProgress: true,
        earnings: 144000,
        offlineHours: 4,
        breakdown: {
          timeAway: '4 hours',
          autoClickerRate: 10,
          earningsPerSecond: 10,
          earningsPerMinute: 600,
          earningsPerHour: 36000,
          cappedAt: true,
          maxOfflineHours: 4
        }
      };

      const displayData = offlineProgressService.getOfflineProgressDisplayData(offlineResult);

      expect(displayData.cappedMessage).toBe('Earnings capped at 4 hours');
    });
  });

  describe('API methods', () => {
    beforeEach(() => {
      fetch.mockClear();
    });

    describe('getOfflineProgressPreview', () => {
      it('should fetch offline progress preview successfully', async () => {
        const mockResponse = {
          success: true,
          canCollect: true,
          potentialEarnings: 72000,
          offlineHours: 2,
          breakdown: {}
        };

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse
        });

        const result = await offlineProgressService.getOfflineProgressPreview();

        expect(fetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/offline-progress/preview',
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'Authorization': 'Bearer mock-token'
            })
          })
        );
        expect(result).toEqual(mockResponse);
      });

      it('should handle API errors', async () => {
        fetch.mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Server error' })
        });

        await expect(offlineProgressService.getOfflineProgressPreview())
          .rejects.toThrow('Server error');
      });

      it('should handle missing auth token', async () => {
        mockLocalStorage.getItem.mockReturnValue(null);

        await expect(offlineProgressService.getOfflineProgressPreview())
          .rejects.toThrow('No authentication token found');
      });
    });

    describe('collectOfflineProgress', () => {
      it('should collect offline progress successfully', async () => {
        const mockResponse = {
          success: true,
          hasOfflineProgress: true,
          earnings: 72000,
          newTotalCoins: 73000
        };

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse
        });

        const clientData = { earnings: 72000, offlineHours: 2 };
        const result = await offlineProgressService.collectOfflineProgress(clientData);

        expect(fetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/offline-progress/collect',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Authorization': 'Bearer mock-token',
              'Content-Type': 'application/json'
            }),
            body: JSON.stringify(clientData)
          })
        );
        expect(result).toEqual(mockResponse);
      });
    });
  });
});