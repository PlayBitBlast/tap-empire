const EventService = require('../services/eventService');

class EventSocketHandler {
  constructor(io) {
    this.io = io;
    this.eventService = new EventService();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Listen for event service notifications
    this.eventService.on = this.eventService.on || (() => {});
    
    // Set up the IO reference for the event service
    this.eventService.io = this.io;
  }

  /**
   * Handle socket connection for event-related functionality
   */
  handleConnection(socket) {
    console.log(`User connected to events: ${socket.userId || 'anonymous'}`);

    // Send current active events to newly connected user
    this.sendActiveEvents(socket);

    // Handle event-related socket events
    socket.on('events:subscribe', () => {
      socket.join('events');
      this.sendActiveEvents(socket);
    });

    socket.on('events:unsubscribe', () => {
      socket.leave('events');
    });

    socket.on('events:get_multipliers', async () => {
      if (socket.userId) {
        try {
          const multipliers = await this.eventService.getEventMultipliers(socket.userId);
          socket.emit('events:multipliers', multipliers);
        } catch (error) {
          console.error('Error getting event multipliers:', error);
          socket.emit('events:error', { message: 'Failed to get event multipliers' });
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected from events: ${socket.userId || 'anonymous'}`);
    });
  }

  /**
   * Send active events to a specific socket
   */
  async sendActiveEvents(socket) {
    try {
      const activeEvents = await this.eventService.getActiveEvents();
      socket.emit('events:active', { events: activeEvents });
    } catch (error) {
      console.error('Error sending active events:', error);
      socket.emit('events:error', { message: 'Failed to get active events' });
    }
  }

  /**
   * Broadcast event started to all connected clients
   */
  broadcastEventStarted(event) {
    this.io.emit('event:started', { event });
    console.log(`Broadcasted event started: ${event.name}`);
  }

  /**
   * Broadcast event ended to all connected clients
   */
  broadcastEventEnded(eventId) {
    this.io.emit('event:ended', { eventId });
    console.log(`Broadcasted event ended: ${eventId}`);
  }

  /**
   * Broadcast event update to all connected clients
   */
  broadcastEventUpdate(event) {
    this.io.emit('event:updated', { event });
    console.log(`Broadcasted event update: ${event.name}`);
  }

  /**
   * Send event multiplier update to a specific user
   */
  async sendMultiplierUpdate(userId) {
    try {
      const multipliers = await this.eventService.getEventMultipliers(userId);
      
      // Find all sockets for this user
      const userSockets = Array.from(this.io.sockets.sockets.values())
        .filter(socket => socket.userId === userId);
      
      userSockets.forEach(socket => {
        socket.emit('events:multipliers_updated', multipliers);
      });
    } catch (error) {
      console.error('Error sending multiplier update:', error);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.eventService) {
      this.eventService.stopEventMonitoring();
    }
  }
}

module.exports = EventSocketHandler;