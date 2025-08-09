import React, { useState, useEffect } from 'react';
import './EventNotification.css';

const EventNotification = ({ event, onClose, type = 'started' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    // Animate in
    setIsVisible(true);
    
    // Auto-close after 5 seconds
    const autoCloseTimer = setTimeout(() => {
      handleClose();
    }, 5000);

    // Update countdown if event is active
    let countdownInterval;
    if (type === 'started' && event.endTime) {
      countdownInterval = setInterval(() => {
        const remaining = calculateTimeRemaining(event.endTime);
        setTimeRemaining(remaining);
        
        if (remaining.expired) {
          clearInterval(countdownInterval);
          handleClose();
        }
      }, 1000);
    }

    return () => {
      clearTimeout(autoCloseTimer);
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [event, type]);

  const calculateTimeRemaining = (endTime) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) {
      return { expired: true };
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { days, hours, minutes, seconds, expired: false };
  };

  const formatTimeRemaining = (time) => {
    if (!time || time.expired) return '';
    
    const { days, hours, minutes, seconds } = time;
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300); // Wait for animation to complete
  };

  const getEventIcon = () => {
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

  const getEventMessage = () => {
    if (type === 'ended') {
      return `${event.name} has ended!`;
    }
    
    switch (event.type) {
      case 'weekend_multiplier':
        return `${event.multiplier}x coins for the weekend!`;
      case 'global_multiplier':
        return `${event.multiplier}x coin boost is now active!`;
      case 'exclusive_upgrade':
        return 'Exclusive upgrades now available!';
      default:
        return event.description || 'Special event is now active!';
    }
  };

  return (
    <div className={`event-notification ${isVisible ? 'visible' : ''} ${type}`}>
      <div className="event-notification-content">
        <button className="event-notification-close" onClick={handleClose}>
          ×
        </button>
        
        <div className="event-notification-header">
          <span className="event-icon">{getEventIcon()}</span>
          <h3 className="event-title">{event.name}</h3>
        </div>
        
        <p className="event-message">{getEventMessage()}</p>
        
        {type === 'started' && timeRemaining && !timeRemaining.expired && (
          <div className="event-countdown">
            <span className="countdown-label">Time remaining:</span>
            <span className="countdown-time">{formatTimeRemaining(timeRemaining)}</span>
          </div>
        )}
        
        {type === 'ended' && (
          <p className="event-ended-message">
            Thanks for participating! Check back for more events.
          </p>
        )}
      </div>
      
      <div className="event-notification-progress">
        <div className="progress-bar"></div>
      </div>
    </div>
  );
};

export default EventNotification;