import React, { useState, useEffect } from 'react';
import './EventCountdown.css';

const EventCountdown = ({ event, onEventEnd }) => {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const remaining = calculateTimeRemaining(event.endTime);
      setTimeRemaining(remaining);
      
      if (remaining.expired && !isExpired) {
        setIsExpired(true);
        if (onEventEnd) {
          onEventEnd(event);
        }
      }
    };

    // Update immediately
    updateCountdown();
    
    // Update every second
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [event.endTime, isExpired, onEventEnd, event]);

  const calculateTimeRemaining = (endTime) => {
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
  };

  const getEventTypeIcon = () => {
    switch (event.type) {
      case 'weekend_multiplier':
        return '🎉';
      case 'global_multiplier':
        return '⚡';
      case 'exclusive_upgrade':
        return '🎁';
      default:
        return '🎊';
    }
  };

  const getEventTypeColor = () => {
    switch (event.type) {
      case 'weekend_multiplier':
        return '#f093fb';
      case 'global_multiplier':
        return '#4facfe';
      case 'exclusive_upgrade':
        return '#43e97b';
      default:
        return '#667eea';
    }
  };

  if (!timeRemaining || isExpired) {
    return null;
  }

  const { days, hours, minutes, seconds } = timeRemaining;
  const isUrgent = timeRemaining.total < 3600000; // Less than 1 hour

  return (
    <div 
      className={`event-countdown ${isUrgent ? 'urgent' : ''}`}
      style={{ '--event-color': getEventTypeColor() }}
    >
      <div className="event-countdown-header">
        <span className="event-countdown-icon">{getEventTypeIcon()}</span>
        <div className="event-countdown-info">
          <h4 className="event-countdown-title">{event.name}</h4>
          {event.type === 'weekend_multiplier' && (
            <span className="event-countdown-multiplier">
              {event.multiplier}x Coins
            </span>
          )}
          {event.type === 'global_multiplier' && (
            <span className="event-countdown-multiplier">
              {event.multiplier}x Boost
            </span>
          )}
          {event.type === 'exclusive_upgrade' && (
            <span className="event-countdown-multiplier">
              Special Upgrades
            </span>
          )}
        </div>
      </div>
      
      <div className="event-countdown-timer">
        <div className="countdown-segment">
          <span className="countdown-number">{days.toString().padStart(2, '0')}</span>
          <span className="countdown-label">Days</span>
        </div>
        <div className="countdown-separator">:</div>
        <div className="countdown-segment">
          <span className="countdown-number">{hours.toString().padStart(2, '0')}</span>
          <span className="countdown-label">Hours</span>
        </div>
        <div className="countdown-separator">:</div>
        <div className="countdown-segment">
          <span className="countdown-number">{minutes.toString().padStart(2, '0')}</span>
          <span className="countdown-label">Min</span>
        </div>
        <div className="countdown-separator">:</div>
        <div className="countdown-segment">
          <span className="countdown-number">{seconds.toString().padStart(2, '0')}</span>
          <span className="countdown-label">Sec</span>
        </div>
      </div>
      
      <div className="event-countdown-progress">
        <div 
          className="progress-fill"
          style={{
            width: `${Math.max(0, Math.min(100, (timeRemaining.total / (24 * 60 * 60 * 1000)) * 100))}%`
          }}
        ></div>
      </div>
    </div>
  );
};

export default EventCountdown;