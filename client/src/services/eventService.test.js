import eventService from './eventService';
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

describe('EventService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    eventService.cleanup();
    eventService.activeEvents = [];
    eventService.eventListeners.clear();
  });

  afterEach(() => {
    eventService.cleanup();
  });

  describe('fetchActiveEvents', () => {
    it('should fetch and update active events', async () => {
      const mockEvents = [
        {
          id: 1,
          name: 'Weekend Boost',
          type: 'weekend_multiplier',
          multiplier: 2.0,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 86400000).toISOString()
        }
      ];

      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          events: mockEvents
        })
      });

      const listener = jest.fn();
      eventService.addEventListener(listener);

      await eventService.fetchActiveEvents();

      expect(fetch).toHaveBeenCalledWith(`${GAME_CONFIG.API_BASE_URL}/events/active`);
      expect(eventService.activeEvents).toEqual(mockEvents);
      expect(listener).toHaveBeenCalledWith('events:updated', mockEvents);
    });

    it('should handle fetch errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await eventService.fetchActiveEvents();

      expect(consoleSpy).toHaveBeenCalledWith('Error fetching active events:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('getEventById', () => {
    it('should fetch event details with authentication', async () => {
      const mockEvent = {
        id: 1,
        name: 'Test Event',
        upgrades: []
      };

      mockLocalStorage.getItem.mockReturnValue('test-token');
      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          event: mockEvent
        })
      });

      const result = await eventService.getEventById(1);

      expect(fetch).toHaveBeenCalledWith(`${GAME_CONFIG.API_BASE_URL}/events/1`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      });
      expect(result).toEqual(mockEvent);
    });

    it('should fetch event details without authentication', async () => {
      const mockEvent = {
        id: 1,
        name: 'Test Event',
        upgrades: []
      };

      mockLocalStorage.getItem.mockReturnValue(null);
      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          event: mockEvent
        })
      });

      const result = await eventService.getEventById(1);

      expect(fetch).toHaveBeenCalledWith(`${GAME_CONFIG.API_BASE_URL}/events/1`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      expect(result).toEqual(mockEvent);
    });

    it('should return null on error', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await eventService.getEventById(1);

      expect(result).toBeNull();
    });
  });

  describe('getUserEventMultipliers', () => {
    it('should fetch user event multipliers with authentication', async () => {
      const mockMultipliers = {
        totalMultiplier: 2.5,
        activeMultipliers: [
          { eventId: 1, name: 'Weekend Boost', multiplier: 2.0 }
        ]
      };

      mockLocalStorage.getItem.mockReturnValue('test-token');
      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          ...mockMultipliers
        })
      });

      const result = await eventService.getUserEventMultipliers();

      expect(fetch).toHaveBeenCalledWith(`${GAME_CONFIG.API_BASE_URL}/events/user/multipliers`, {
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        }
      });
      expect(result).toEqual(expect.objectContaining(mockMultipliers));
    });

    it('should return default multipliers without authentication', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = await eventService.getUserEventMultipliers();

      expect(result).toEqual({
        totalMultiplier: 1.0,
        activeMultipliers: []
      });
    });
  });

  describe('purchaseEventUpgrade', () => {
    it('should purchase event upgrade successfully', async () => {
      const mockResponse = {
        success: true,
        upgrade: { id: 1, name: 'Test Upgrade' },
        newLevel: 2
      };

      mockLocalStorage.getItem.mockReturnValue('test-token');
      fetch.mockResolvedValueOnce({
        json: async () => mockResponse
      });

      const result = await eventService.purchaseEventUpgrade(1);

      expect(fetch).toHaveBeenCalledWith(`${GAME_CONFIG.API_BASE_URL}/events/upgrade/purchase`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ eventUpgradeId: 1 })
      });
      expect(result).toEqual(mockResponse);
    });

    it('should throw error without authentication', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      await expect(eventService.purchaseEventUpgrade(1))
        .rejects.toThrow('Authentication required');
    });

    it('should throw error on failed purchase', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-token');
      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: false,
          error: 'Insufficient coins'
        })
      });

      await expect(eventService.purchaseEventUpgrade(1))
        .rejects.toThrow('Insufficient coins');
    });
  });

  describe('utility methods', () => {
    beforeEach(() => {
      eventService.activeEvents = [
        {
          id: 1,
          name: 'Weekend Boost',
          type: 'weekend_multiplier',
          multiplier: 2.0,
          startTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          endTime: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
        },
        {
          id: 2,
          name: 'Holiday Event',
          type: 'global_multiplier',
          multiplier: 1.5,
          startTime: new Date(Date.now() - 3600000).toISOString(),
          endTime: new Date(Date.now() + 3600000).toISOString()
        }
      ];
    });

    describe('hasActiveWeekendMultiplier', () => {
      it('should return true when weekend multiplier is active', () => {
        const result = eventService.hasActiveWeekendMultiplier();
        expect(result).toBe(true);
      });

      it('should return false when no weekend multiplier is active', () => {
        eventService.activeEvents = eventService.activeEvents.filter(
          event => event.type !== 'weekend_multiplier'
        );
        
        const result = eventService.hasActiveWeekendMultiplier();
        expect(result).toBe(false);
      });
    });

    describe('getTotalEventMultiplier', () => {
      it('should calculate total multiplier correctly', () => {
        const result = eventService.getTotalEventMultiplier();
        expect(result).toBe(3.0); // 2.0 * 1.5
      });

      it('should return 1.0 when no multiplier events are active', () => {
        eventService.activeEvents = [];
        
        const result = eventService.getTotalEventMultiplier();
        expect(result).toBe(1.0);
      });
    });

    describe('getActiveEventsByType', () => {
      it('should filter events by type', () => {
        const weekendEvents = eventService.getActiveEventsByType('weekend_multiplier');
        expect(weekendEvents).toHaveLength(1);
        expect(weekendEvents[0].name).toBe('Weekend Boost');

        const globalEvents = eventService.getActiveEventsByType('global_multiplier');
        expect(globalEvents).toHaveLength(1);
        expect(globalEvents[0].name).toBe('Holiday Event');
      });
    });

    describe('isEventActive', () => {
      it('should return true for active events', () => {
        const activeEvent = {
          startTime: new Date(Date.now() - 3600000).toISOString(),
          endTime: new Date(Date.now() + 3600000).toISOString()
        };

        const result = eventService.isEventActive(activeEvent);
        expect(result).toBe(true);
      });

      it('should return false for expired events', () => {
        const expiredEvent = {
          startTime: new Date(Date.now() - 7200000).toISOString(),
          endTime: new Date(Date.now() - 3600000).toISOString()
        };

        const result = eventService.isEventActive(expiredEvent);
        expect(result).toBe(false);
      });

      it('should return false for future events', () => {
        const futureEvent = {
          startTime: new Date(Date.now() + 3600000).toISOString(),
          endTime: new Date(Date.now() + 7200000).toISOString()
        };

        const result = eventService.isEventActive(futureEvent);
        expect(result).toBe(false);
      });
    });

    describe('calculateTimeRemaining', () => {
      it('should calculate time remaining correctly', () => {
        const endTime = new Date(Date.now() + 3661000).toISOString(); // 1 hour, 1 minute, 1 second
        
        const result = eventService.calculateTimeRemaining(endTime);
        
        expect(result.hours).toBe(1);
        expect(result.minutes).toBe(1);
        expect(result.seconds).toBe(1);
        expect(result.expired).toBe(false);
      });

      it('should return expired status for past times', () => {
        const endTime = new Date(Date.now() - 1000).toISOString();
        
        const result = eventService.calculateTimeRemaining(endTime);
        
        expect(result.expired).toBe(true);
        expect(result.total).toBe(0);
      });
    });

    describe('formatTimeRemaining', () => {
      it('should format time remaining correctly', () => {
        const timeRemaining = {
          days: 2,
          hours: 3,
          minutes: 45,
          seconds: 30,
          expired: false
        };

        const result = eventService.formatTimeRemaining(timeRemaining);
        expect(result).toBe('2d 3h 45m');
      });

      it('should format hours and minutes when no days', () => {
        const timeRemaining = {
          days: 0,
          hours: 3,
          minutes: 45,
          seconds: 30,
          expired: false
        };

        const result = eventService.formatTimeRemaining(timeRemaining);
        expect(result).toBe('3h 45m 30s');
      });

      it('should return "Expired" for expired events', () => {
        const timeRemaining = { expired: true };

        const result = eventService.formatTimeRemaining(timeRemaining);
        expect(result).toBe('Expired');
      });
    });
  });

  describe('event listeners', () => {
    it('should add and remove event listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      const unsubscribe1 = eventService.addEventListener(listener1);
      const unsubscribe2 = eventService.addEventListener(listener2);

      expect(eventService.eventListeners.size).toBe(2);

      eventService.notifyListeners('test:event', { data: 'test' });

      expect(listener1).toHaveBeenCalledWith('test:event', { data: 'test' });
      expect(listener2).toHaveBeenCalledWith('test:event', { data: 'test' });

      unsubscribe1();
      expect(eventService.eventListeners.size).toBe(1);

      unsubscribe2();
      expect(eventService.eventListeners.size).toBe(0);
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const normalListener = jest.fn();

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      eventService.addEventListener(errorListener);
      eventService.addEventListener(normalListener);

      eventService.notifyListeners('test:event', { data: 'test' });

      expect(consoleSpy).toHaveBeenCalledWith('Error in event listener:', expect.any(Error));
      expect(normalListener).toHaveBeenCalledWith('test:event', { data: 'test' });

      consoleSpy.mockRestore();
    });
  });
});