const EventRepository = require('../repositories/EventRepository');
const UserRepository = require('../repositories/UserRepository');
const { redisManager } = require('../config/redis');

class EventService {
  constructor() {
    this.eventRepository = new EventRepository();
    this.userRepository = new UserRepository();
    this.activeEventsCache = new Map();
    this.eventCheckInterval = null;
    
    // Start event monitoring
    this.startEventMonitoring();
  }

  /**
   * Start monitoring events for automatic activation/deactivation
   */
  startEventMonitoring() {
    // Check events every minute
    this.eventCheckInterval = setInterval(async () => {
      try {
        await this.updateActiveEvents();
      } catch (error) {
        console.error('Error updating active events:', error);
      }
    }, 60000);

    // Initial check
    this.updateActiveEvents();
  }

  /**
   * Stop event monitoring
   */
  stopEventMonitoring() {
    if (this.eventCheckInterval) {
      clearInterval(this.eventCheckInterval);
      this.eventCheckInterval = null;
    }
  }

  /**
   * Update active events cache and notify clients
   */
  async updateActiveEvents() {
    const activeEvents = await this.eventRepository.getActiveEvents();
    const previousActiveEvents = new Set(this.activeEventsCache.keys());
    const currentActiveEvents = new Set();

    // Update cache and detect changes
    this.activeEventsCache.clear();
    for (const event of activeEvents) {
      this.activeEventsCache.set(event.id, event);
      currentActiveEvents.add(event.id);

      // Check if this is a newly started event
      if (!previousActiveEvents.has(event.id)) {
        await this.notifyEventStart(event);
      }
    }

    // Check for ended events
    for (const eventId of previousActiveEvents) {
      if (!currentActiveEvents.has(eventId)) {
        await this.notifyEventEnd(eventId);
      }
    }

    // Update Redis cache
    await redisManager.setCache('active_events', activeEvents, 300); // 5 minute cache
  }

  /**
   * Get all active events
   */
  async getActiveEvents() {
    try {
      // Try to get from Redis cache first
      const cached = await redisManager.getCache('active_events');
      if (cached) {
        return cached;
      }
    } catch (error) {
      console.warn('Redis cache miss for active events:', error.message);
    }

    // Fallback to database
    const events = await this.eventRepository.getActiveEvents();
    
    // Update cache
    try {
      await redisManager.setCache('active_events', events, 300);
    } catch (error) {
      console.warn('Failed to cache active events:', error.message);
    }

    return events;
  }

  /**
   * Get event by ID
   */
  async getEventById(eventId) {
    return await this.eventRepository.getEventById(eventId);
  }

  /**
   * Create a new event
   */
  async createEvent(eventData) {
    const event = await this.eventRepository.createEvent(eventData);
    
    // Clear cache to force refresh
    await redisManager.deleteCache('active_events');
    
    return event;
  }

  /**
   * Get exclusive upgrades for an event
   */
  async getEventUpgrades(eventId) {
    return await this.eventRepository.getEventUpgrades(eventId);
  }

  /**
   * Get user's event upgrade purchases
   */
  async getUserEventUpgrades(userId, eventId) {
    return await this.eventRepository.getUserEventUpgrades(userId, eventId);
  }

  /**
   * Purchase an event upgrade
   */
  async purchaseEventUpgrade(userId, eventUpgradeId) {
    const eventUpgrade = await this.eventRepository.getEventUpgradeById(eventUpgradeId);
    if (!eventUpgrade) {
      throw new Error('Event upgrade not found');
    }

    // Check if event is still active
    const isActive = await this.eventRepository.isEventActive(eventUpgrade.event_id);
    if (!isActive) {
      throw new Error('Event is no longer active');
    }

    // Check if user already has this upgrade
    const existingUpgrade = await this.eventRepository.getUserEventUpgrade(userId, eventUpgradeId);
    if (existingUpgrade && existingUpgrade.level >= eventUpgrade.max_level) {
      throw new Error('Maximum level reached for this upgrade');
    }

    // Check if user has enough coins
    const user = await this.userRepository.getUserById(userId);
    if (user.coins < eventUpgrade.cost) {
      throw new Error('Insufficient coins');
    }

    // Process purchase
    await this.eventRepository.purchaseEventUpgrade(userId, eventUpgradeId, eventUpgrade.cost);
    
    return {
      success: true,
      upgrade: eventUpgrade,
      newLevel: existingUpgrade ? existingUpgrade.level + 1 : 1
    };
  }

  /**
   * Calculate current event multipliers for a user
   */
  async getEventMultipliers(userId) {
    const activeEvents = await this.getActiveEvents();
    let totalMultiplier = 1.0;
    const activeMultipliers = [];

    for (const event of activeEvents) {
      if (event.type === 'weekend_multiplier' || event.type === 'global_multiplier') {
        totalMultiplier *= parseFloat(event.multiplier);
        activeMultipliers.push({
          eventId: event.id,
          name: event.name,
          multiplier: event.multiplier,
          type: event.type
        });
      }
    }

    // Add user-specific event upgrade multipliers
    const userEventUpgrades = await this.getUserAllEventUpgrades(userId);
    for (const upgrade of userEventUpgrades) {
      if (upgrade.type === 'tap_multiplier' || upgrade.type === 'auto_clicker_multiplier') {
        const multiplierBonus = upgrade.benefit * upgrade.level;
        totalMultiplier *= (1 + multiplierBonus);
        activeMultipliers.push({
          eventId: upgrade.event_id,
          name: `${upgrade.name} (Level ${upgrade.level})`,
          multiplier: 1 + multiplierBonus,
          type: 'event_upgrade'
        });
      }
    }

    return {
      totalMultiplier,
      activeMultipliers
    };
  }

  /**
   * Get all user's event upgrades across all events
   */
  async getUserAllEventUpgrades(userId) {
    return await this.eventRepository.getUserAllEventUpgrades(userId);
  }

  /**
   * Notify all players about event start
   */
  async notifyEventStart(event) {
    const io = require('../app').io;
    if (io) {
      io.emit('event:started', {
        event: {
          id: event.id,
          name: event.name,
          description: event.description,
          type: event.type,
          endTime: event.end_time,
          multiplier: event.multiplier
        }
      });
    }

    console.log(`Event started: ${event.name} (ID: ${event.id})`);
  }

  /**
   * Notify all players about event end
   */
  async notifyEventEnd(eventId) {
    const io = require('../app').io;
    if (io) {
      io.emit('event:ended', { eventId });
    }

    console.log(`Event ended: ${eventId}`);
  }

  /**
   * Create a weekend multiplier event
   */
  async createWeekendEvent() {
    const now = new Date();
    const friday = new Date(now);
    friday.setDate(now.getDate() + (5 - now.getDay() + 7) % 7); // Next Friday
    friday.setHours(18, 0, 0, 0); // 6 PM Friday

    const sunday = new Date(friday);
    sunday.setDate(friday.getDate() + 2);
    sunday.setHours(23, 59, 59, 999); // End of Sunday

    return await this.createEvent({
      name: 'Weekend Boost',
      description: 'Double coins for the entire weekend!',
      type: 'weekend_multiplier',
      start_time: friday,
      end_time: sunday,
      multiplier: 2.0,
      config: {
        recurring: true,
        recurrence_pattern: 'weekly'
      }
    });
  }

  /**
   * Clean up expired events and their data
   */
  async cleanupExpiredEvents() {
    const expiredEvents = await this.eventRepository.getExpiredEvents();
    
    for (const event of expiredEvents) {
      // Remove event upgrades and user purchases
      await this.eventRepository.cleanupEventData(event.id);
      console.log(`Cleaned up expired event: ${event.name} (ID: ${event.id})`);
    }
  }
}

module.exports = EventService;
