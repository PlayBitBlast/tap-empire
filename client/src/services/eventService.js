import { GAME_CONFIG } from '../shared/constants/gameConfig';

class EventService {
  constructor() {
    this.activeEvents = [];
    this.eventListeners = new Set();
    this.eventCheckInterval = null;
    this.socket = null;
  }

  /**
   * Initialize event service with socket connection
   */
  initialize(socket) {
    this.socket = socket;
    this.setupSocketListeners();
    this.startEventPolling();
  }

  /**
   * Setup socket listeners for real-time event updates
   */
  setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('event:started', (data) => {
      this.handleEventStarted(data.event);
    });

    this.socket.on('event:ended', (data) => {
      this.handleEventEnded(data.eventId);
    });
  }

  /**
   * Start polling for active events
   */
  startEventPolling() {
    // Poll every 30 seconds
    this.eventCheckInterval = setInterval(() => {
      this.fetchActiveEvents();
    }, 30000);

    // Initial fetch
    this.fetchActiveEvents();
  }

  /**
   * Stop event polling
   */
  stopEventPolling() {
    if (this.eventCheckInterval) {
      clearInterval(this.eventCheckInterval);
      this.eventCheckInterval = null;
    }
  }

  /**
   * Fetch active events from server
   */
  async fetchActiveEvents() {
    try {
      const response = await fetch(`${GAME_CONFIG.API_BASE_URL}/events/active`);
      const data = await response.json();
      
      if (data.success) {
        this.activeEvents = data.events;
        this.notifyListeners('events:updated', this.activeEvents);
      }
    } catch (error) {
      console.error('Error fetching active events:', error);
    }
  }

  /**
   * Get all active events
   */
  getActiveEvents() {
    return this.activeEvents;
  }

  /**
   * Get event by ID
   */
  async getEventById(eventId) {
    try {
      const token = localStorage.getItem('authToken');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${GAME_CONFIG.API_BASE_URL}/events/${eventId}`, {
        headers
      });
      
      const data = await response.json();
      return data.success ? data.event : null;
    } catch (error) {
      console.error('Error fetching event details:', error);
      return null;
    }
  }

  /**
   * Get user's event multipliers
   */
  async getUserEventMultipliers() {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return { totalMultiplier: 1.0, activeMultipliers: [] };

      const response = await fetch(`${GAME_CONFIG.API_BASE_URL}/events/user/multipliers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      return data.success ? data : { totalMultiplier: 1.0, activeMultipliers: [] };
    } catch (error) {
      console.error('Error fetching user event multipliers:', error);
      return { totalMultiplier: 1.0, activeMultipliers: [] };
    }
  }

  /**
   * Purchase an event upgrade
   */
  async purchaseEventUpgrade(eventUpgradeId) {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`${GAME_CONFIG.API_BASE_URL}/events/upgrade/purchase`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ eventUpgradeId })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to purchase event upgrade');
      }
      
      return data;
    } catch (error) {
      console.error('Error purchasing event upgrade:', error);
      throw error;
    }
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents() {
    try {
      const response = await fetch(`${GAME_CONFIG.API_BASE_URL}/events/upcoming`);
      const data = await response.json();
      
      return data.success ? data.events : [];
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
      return [];
    }
  }

  /**
   * Check if any weekend multiplier events are active
   */
  hasActiveWeekendMultiplier() {
    return this.activeEvents.some(event => 
      event.type === 'weekend_multiplier' && this.isEventActive(event)
    );
  }

  /**
   * Get total multiplier from all active events
   */
  getTotalEventMultiplier() {
    let multiplier = 1.0;
    
    for (const event of this.activeEvents) {
      if (event.type === 'weekend_multiplier' || event.type === 'global_multiplier') {
        multiplier *= parseFloat(event.multiplier);
      }
    }
    
    return multiplier;
  }

  /**
   * Get active events by type
   */
  getActiveEventsByType(type) {
    return this.activeEvents.filter(event => event.type === type);
  }

  /**
   * Check if an event is currently active
   */
  isEventActive(event) {
    const now = new Date();
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);
    
    return now >= startTime && now <= endTime;
  }

  /**
   * Calculate time remaining for an event
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
        seconds: 0,
        expired: true
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
      seconds,
      expired: false
    };
  }

  /**
   * Handle event started notification
   */
  handleEventStarted(event) {
    // Add to active events if not already present
    const existingIndex = this.activeEvents.findIndex(e => e.id === event.id);
    if (existingIndex === -1) {
      this.activeEvents.push(event);
    } else {
      this.activeEvents[existingIndex] = event;
    }
    
    this.notifyListeners('event:started', event);
    this.notifyListeners('events:updated', this.activeEvents);
  }

  /**
   * Handle event ended notification
   */
  handleEventEnded(eventId) {
    const eventIndex = this.activeEvents.findIndex(e => e.id === eventId);
    if (eventIndex !== -1) {
      const endedEvent = this.activeEvents[eventIndex];
      this.activeEvents.splice(eventIndex, 1);
      
      this.notifyListeners('event:ended', endedEvent);
      this.notifyListeners('events:updated', this.activeEvents);
    }
  }

  /**
   * Add event listener
   */
  addEventListener(callback) {
    this.eventListeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.eventListeners.delete(callback);
    };
  }

  /**
   * Notify all listeners
   */
  notifyListeners(eventType, data) {
    this.eventListeners.forEach(callback => {
      try {
        callback(eventType, data);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }

  /**
   * Format time remaining as string
   */
  formatTimeRemaining(timeRemaining) {
    if (timeRemaining.expired) {
      return 'Expired';
    }
    
    const { days, hours, minutes, seconds } = timeRemaining;
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopEventPolling();
    this.eventListeners.clear();
    
    if (this.socket) {
      this.socket.off('event:started');
      this.socket.off('event:ended');
    }
  }
}

// Export singleton instance
export default new EventService();