import { useState, useEffect, useCallback } from 'react';
import eventService from '../services/eventService';

export const useEvents = (socket) => {
  const [activeEvents, setActiveEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [eventMultipliers, setEventMultipliers] = useState({
    totalMultiplier: 1.0,
    activeMultipliers: []
  });
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize event service
  useEffect(() => {
    if (socket) {
      eventService.initialize(socket);
    }
    
    return () => {
      eventService.cleanup();
    };
  }, [socket]);

  // Load initial data
  useEffect(() => {
    loadEventData();
  }, []);

  // Set up event listeners
  useEffect(() => {
    const unsubscribe = eventService.addEventListener((eventType, data) => {
      switch (eventType) {
        case 'events:updated':
          setActiveEvents(data);
          break;
        case 'event:started':
          handleEventStarted(data);
          break;
        case 'event:ended':
          handleEventEnded(data);
          break;
        default:
          break;
      }
    });

    return unsubscribe;
  }, []);

  const loadEventData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load active events
      const active = await eventService.getActiveEvents();
      setActiveEvents(active);
      
      // Load upcoming events
      const upcoming = await eventService.getUpcomingEvents();
      setUpcomingEvents(upcoming);
      
      // Load user event multipliers
      const multipliers = await eventService.getUserEventMultipliers();
      setEventMultipliers(multipliers);
      
    } catch (err) {
      console.error('Error loading event data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEventStarted = useCallback((event) => {
    // Add notification
    const notification = {
      id: `event-started-${event.id}`,
      type: 'started',
      event,
      timestamp: Date.now()
    };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      removeNotification(notification.id);
    }, 5000);
    
    // Refresh multipliers
    refreshEventMultipliers();
  }, []);

  const handleEventEnded = useCallback((event) => {
    // Add notification
    const notification = {
      id: `event-ended-${event.id}`,
      type: 'ended',
      event,
      timestamp: Date.now()
    };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      removeNotification(notification.id);
    }, 5000);
    
    // Refresh multipliers
    refreshEventMultipliers();
  }, []);

  const refreshEventMultipliers = async () => {
    try {
      const multipliers = await eventService.getUserEventMultipliers();
      setEventMultipliers(multipliers);
    } catch (err) {
      console.error('Error refreshing event multipliers:', err);
    }
  };

  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const purchaseEventUpgrade = async (eventUpgradeId) => {
    try {
      const result = await eventService.purchaseEventUpgrade(eventUpgradeId);
      
      // Refresh multipliers after purchase
      await refreshEventMultipliers();
      
      return result;
    } catch (error) {
      throw error;
    }
  };

  const getEventById = async (eventId) => {
    try {
      return await eventService.getEventById(eventId);
    } catch (error) {
      console.error('Error getting event details:', error);
      return null;
    }
  };

  const hasActiveWeekendMultiplier = () => {
    return activeEvents.some(event => 
      event.type === 'weekend_multiplier' && 
      eventService.isEventActive(event)
    );
  };

  const getTotalEventMultiplier = () => {
    return eventMultipliers.totalMultiplier;
  };

  const getActiveEventsByType = (type) => {
    return activeEvents.filter(event => event.type === type);
  };

  const isEventActive = (event) => {
    return eventService.isEventActive(event);
  };

  const formatTimeRemaining = (endTime) => {
    return eventService.formatTimeRemaining(
      eventService.calculateTimeRemaining(endTime)
    );
  };

  return {
    // State
    activeEvents,
    upcomingEvents,
    eventMultipliers,
    notifications,
    loading,
    error,
    
    // Actions
    loadEventData,
    refreshEventMultipliers,
    removeNotification,
    purchaseEventUpgrade,
    getEventById,
    
    // Utilities
    hasActiveWeekendMultiplier,
    getTotalEventMultiplier,
    getActiveEventsByType,
    isEventActive,
    formatTimeRemaining
  };
};