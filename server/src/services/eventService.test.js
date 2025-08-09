const EventService = require('./eventService');
const EventRepository = require('../repositories/EventRepository');

// Mock dependencies
jest.mock('../repositories/EventRepository');
jest.mock('../config/redis', () => ({
  setex: jest.fn(),
  get: jest.fn(),
  del: jest.fn()
}));

describe('EventService', () => {
  let eventService;
  let mockEventRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEventRepository = {
      getActiveEvents: jest.fn(),
      getEventById: jest.fn(),
      createEvent: jest.fn(),
      getEventUpgrades: jest.fn(),
      getUserEventUpgrades: jest.fn(),
      getEventUpgradeById: jest.fn(),
      getUserEventUpgrade: jest.fn(),
      purchaseEventUpgrade: jest.fn(),
      getUserAllEventUpgrades: jest.fn(),
      isEventActive: jest.fn(),
      getExpiredEvents: jest.fn(),
      cleanupEventData: jest.fn()
    };
    
    EventRepository.mockImplementation(() => mockEventRepository);
    eventService = new EventService();
    
    // Stop the monitoring interval for tests
    eventService.stopEventMonitoring();
  });

  afterEach(() => {
    eventService.stopEventMonitoring();
  });

  describe('getActiveEvents', () => {
    it('should return active events from repository', async () => {
      const mockEvents = [
        {
          id: 1,
          name: 'Weekend Boost',
          type: 'weekend_multiplier',
          multiplier: 2.0,
          start_time: new Date(),
          end_time: new Date(Date.now() + 86400000)
        }
      ];

      mockEventRepository.getActiveEvents.mockResolvedValue(mockEvents);

      const result = await eventService.getActiveEvents();

      expect(result).toEqual(mockEvents);
      expect(mockEventRepository.getActiveEvents).toHaveBeenCalledTimes(1);
    });

    it('should handle repository errors gracefully', async () => {
      mockEventRepository.getActiveEvents.mockRejectedValue(new Error('Database error'));

      const result = await eventService.getActiveEvents();

      expect(result).toEqual([]);
    });
  });

  describe('createEvent', () => {
    it('should create a new event', async () => {
      const eventData = {
        name: 'Test Event',
        description: 'Test Description',
        type: 'global_multiplier',
        start_time: new Date(),
        end_time: new Date(Date.now() + 86400000),
        multiplier: 2.0
      };

      const mockCreatedEvent = { id: 1, ...eventData };
      mockEventRepository.createEvent.mockResolvedValue(mockCreatedEvent);

      const result = await eventService.createEvent(eventData);

      expect(result).toEqual(mockCreatedEvent);
      expect(mockEventRepository.createEvent).toHaveBeenCalledWith(eventData);
    });
  });

  describe('purchaseEventUpgrade', () => {
    it('should successfully purchase an event upgrade', async () => {
      const userId = 1;
      const eventUpgradeId = 1;
      
      const mockEventUpgrade = {
        id: 1,
        event_id: 1,
        name: 'Test Upgrade',
        cost: 1000,
        max_level: 3
      };

      const mockUser = { id: 1, coins: 5000 };
      const mockExistingUpgrade = { level: 1 };

      mockEventRepository.getEventUpgradeById.mockResolvedValue(mockEventUpgrade);
      mockEventRepository.isEventActive.mockResolvedValue(true);
      mockEventRepository.getUserEventUpgrade.mockResolvedValue(mockExistingUpgrade);
      eventService.userRepository = {
        getUserById: jest.fn().mockResolvedValue(mockUser)
      };
      mockEventRepository.purchaseEventUpgrade.mockResolvedValue();

      const result = await eventService.purchaseEventUpgrade(userId, eventUpgradeId);

      expect(result.success).toBe(true);
      expect(result.upgrade).toEqual(mockEventUpgrade);
      expect(result.newLevel).toBe(2);
      expect(mockEventRepository.purchaseEventUpgrade).toHaveBeenCalledWith(
        userId, 
        eventUpgradeId, 
        mockEventUpgrade.cost
      );
    });

    it('should throw error if event upgrade not found', async () => {
      mockEventRepository.getEventUpgradeById.mockResolvedValue(null);

      await expect(eventService.purchaseEventUpgrade(1, 1))
        .rejects.toThrow('Event upgrade not found');
    });

    it('should throw error if event is not active', async () => {
      const mockEventUpgrade = { id: 1, event_id: 1 };
      mockEventRepository.getEventUpgradeById.mockResolvedValue(mockEventUpgrade);
      mockEventRepository.isEventActive.mockResolvedValue(false);

      await expect(eventService.purchaseEventUpgrade(1, 1))
        .rejects.toThrow('Event is no longer active');
    });

    it('should throw error if user has insufficient coins', async () => {
      const mockEventUpgrade = {
        id: 1,
        event_id: 1,
        cost: 1000
      };
      const mockUser = { id: 1, coins: 500 };

      mockEventRepository.getEventUpgradeById.mockResolvedValue(mockEventUpgrade);
      mockEventRepository.isEventActive.mockResolvedValue(true);
      mockEventRepository.getUserEventUpgrade.mockResolvedValue(null);
      eventService.userRepository = {
        getUserById: jest.fn().mockResolvedValue(mockUser)
      };

      await expect(eventService.purchaseEventUpgrade(1, 1))
        .rejects.toThrow('Insufficient coins');
    });

    it('should throw error if upgrade is at max level', async () => {
      const mockEventUpgrade = {
        id: 1,
        event_id: 1,
        max_level: 2
      };
      const mockExistingUpgrade = { level: 2 };

      mockEventRepository.getEventUpgradeById.mockResolvedValue(mockEventUpgrade);
      mockEventRepository.isEventActive.mockResolvedValue(true);
      mockEventRepository.getUserEventUpgrade.mockResolvedValue(mockExistingUpgrade);

      await expect(eventService.purchaseEventUpgrade(1, 1))
        .rejects.toThrow('Maximum level reached for this upgrade');
    });
  });

  describe('getEventMultipliers', () => {
    it('should calculate total multipliers correctly', async () => {
      const userId = 1;
      const mockActiveEvents = [
        {
          id: 1,
          name: 'Weekend Boost',
          type: 'weekend_multiplier',
          multiplier: 2.0
        },
        {
          id: 2,
          name: 'Holiday Event',
          type: 'global_multiplier',
          multiplier: 1.5
        }
      ];

      const mockUserUpgrades = [
        {
          event_id: 1,
          name: 'Tap Booster',
          type: 'tap_multiplier',
          benefit: 0.5,
          level: 2
        }
      ];

      eventService.activeEventsCache = new Map();
      mockActiveEvents.forEach(event => {
        eventService.activeEventsCache.set(event.id, event);
      });

      mockEventRepository.getUserAllEventUpgrades.mockResolvedValue(mockUserUpgrades);

      const result = await eventService.getEventMultipliers(userId);

      // Base multiplier: 2.0 * 1.5 = 3.0
      // User upgrade: (1 + 0.5 * 2) = 2.0
      // Total: 3.0 * 2.0 = 6.0
      expect(result.totalMultiplier).toBe(6.0);
      expect(result.activeMultipliers).toHaveLength(3);
    });
  });

  describe('createWeekendEvent', () => {
    it('should create a weekend event with correct timing', async () => {
      const mockCreatedEvent = {
        id: 1,
        name: 'Weekend Boost',
        type: 'weekend_multiplier',
        multiplier: 2.0
      };

      mockEventRepository.createEvent.mockResolvedValue(mockCreatedEvent);

      const result = await eventService.createWeekendEvent();

      expect(result).toEqual(mockCreatedEvent);
      expect(mockEventRepository.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Weekend Boost',
          type: 'weekend_multiplier',
          multiplier: 2.0,
          config: {
            recurring: true,
            recurrence_pattern: 'weekly'
          }
        })
      );
    });
  });

  describe('cleanupExpiredEvents', () => {
    it('should clean up expired events', async () => {
      const mockExpiredEvents = [
        { id: 1, name: 'Expired Event 1' },
        { id: 2, name: 'Expired Event 2' }
      ];

      mockEventRepository.getExpiredEvents.mockResolvedValue(mockExpiredEvents);
      mockEventRepository.cleanupEventData.mockResolvedValue();

      await eventService.cleanupExpiredEvents();

      expect(mockEventRepository.getExpiredEvents).toHaveBeenCalledTimes(1);
      expect(mockEventRepository.cleanupEventData).toHaveBeenCalledTimes(2);
      expect(mockEventRepository.cleanupEventData).toHaveBeenCalledWith(1);
      expect(mockEventRepository.cleanupEventData).toHaveBeenCalledWith(2);
    });
  });
});