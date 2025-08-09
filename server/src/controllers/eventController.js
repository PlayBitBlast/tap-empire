const EventService = require('../services/eventService');

class EventController {
  constructor() {
    this.eventService = new EventService();
  }

  /**
   * Get all active events
   */
  async getActiveEvents(req, res) {
    try {
      const events = await this.eventService.getActiveEvents();
      
      res.json({
        success: true,
        events: events.map(event => ({
          id: event.id,
          name: event.name,
          description: event.description,
          type: event.type,
          startTime: event.start_time,
          endTime: event.end_time,
          multiplier: event.multiplier,
          config: event.config,
          timeRemaining: this.calculateTimeRemaining(event.end_time)
        }))
      });
    } catch (error) {
      console.error('Error getting active events:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get active events'
      });
    }
  }

  /**
   * Get event details by ID
   */
  async getEventById(req, res) {
    try {
      const { eventId } = req.params;
      const event = await this.eventService.getEventById(eventId);
      
      if (!event) {
        return res.status(404).json({
          success: false,
          error: 'Event not found'
        });
      }

      // Get event upgrades
      const upgrades = await this.eventService.getEventUpgrades(eventId);
      
      // Get user's purchases if authenticated
      let userUpgrades = [];
      if (req.user) {
        userUpgrades = await this.eventService.getUserEventUpgrades(req.user.id, eventId);
      }

      res.json({
        success: true,
        event: {
          id: event.id,
          name: event.name,
          description: event.description,
          type: event.type,
          startTime: event.start_time,
          endTime: event.end_time,
          multiplier: event.multiplier,
          config: event.config,
          timeRemaining: this.calculateTimeRemaining(event.end_time),
          upgrades: upgrades.map(upgrade => ({
            id: upgrade.id,
            name: upgrade.name,
            description: upgrade.description,
            type: upgrade.type,
            cost: upgrade.cost,
            benefit: upgrade.benefit,
            maxLevel: upgrade.max_level,
            userLevel: userUpgrades.find(u => u.event_upgrade_id === upgrade.id)?.level || 0
          }))
        }
      });
    } catch (error) {
      console.error('Error getting event details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get event details'
      });
    }
  }

  /**
   * Get user's event multipliers
   */
  async getUserEventMultipliers(req, res) {
    try {
      const userId = req.user.id;
      const multipliers = await this.eventService.getEventMultipliers(userId);
      
      res.json({
        success: true,
        ...multipliers
      });
    } catch (error) {
      console.error('Error getting user event multipliers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get event multipliers'
      });
    }
  }

  /**
   * Purchase an event upgrade
   */
  async purchaseEventUpgrade(req, res) {
    try {
      const userId = req.user.id;
      const { eventUpgradeId } = req.body;

      if (!eventUpgradeId) {
        return res.status(400).json({
          success: false,
          error: 'Event upgrade ID is required'
        });
      }

      const result = await this.eventService.purchaseEventUpgrade(userId, eventUpgradeId);
      
      res.json({
        success: true,
        message: 'Event upgrade purchased successfully',
        upgrade: result.upgrade,
        newLevel: result.newLevel
      });
    } catch (error) {
      console.error('Error purchasing event upgrade:', error);
      
      if (error.message === 'Event upgrade not found') {
        return res.status(404).json({
          success: false,
          error: 'Event upgrade not found'
        });
      }
      
      if (error.message === 'Event is no longer active') {
        return res.status(400).json({
          success: false,
          error: 'Event is no longer active'
        });
      }
      
      if (error.message === 'Insufficient coins') {
        return res.status(400).json({
          success: false,
          error: 'Insufficient coins'
        });
      }
      
      if (error.message === 'Maximum level reached for this upgrade') {
        return res.status(400).json({
          success: false,
          error: 'Maximum level reached for this upgrade'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to purchase event upgrade'
      });
    }
  }

  /**
   * Create a new event (admin only)
   */
  async createEvent(req, res) {
    try {
      const eventData = req.body;
      
      // Validate required fields
      if (!eventData.name || !eventData.type || !eventData.start_time || !eventData.end_time) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, type, start_time, end_time'
        });
      }

      const event = await this.eventService.createEvent(eventData);
      
      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        event
      });
    } catch (error) {
      console.error('Error creating event:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create event'
      });
    }
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(req, res) {
    try {
      const events = await this.eventService.eventRepository.getUpcomingEvents();
      
      res.json({
        success: true,
        events: events.map(event => ({
          id: event.id,
          name: event.name,
          description: event.description,
          type: event.type,
          startTime: event.start_time,
          endTime: event.end_time,
          multiplier: event.multiplier,
          timeUntilStart: this.calculateTimeRemaining(event.start_time)
        }))
      });
    } catch (error) {
      console.error('Error getting upcoming events:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get upcoming events'
      });
    }
  }

  /**
   * Calculate time remaining until a given date
   */
  calculateTimeRemaining(endTime) {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) {
      return {
        total: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0
      };
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return {
      total: diff,
      days,
      hours,
      minutes,
      seconds
    };
  }
}

module.exports = EventController;