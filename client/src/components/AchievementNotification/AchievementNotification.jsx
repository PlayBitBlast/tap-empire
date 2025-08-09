import React, { useState, useEffect } from 'react';
import './AchievementNotification.css';

/**
 * Small achievement notification component for showing brief notifications
 */
const AchievementNotification = ({ 
  achievement, 
  isVisible, 
  onClose, 
  duration = 4000 
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      
      // Auto-close after duration
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const getCategoryIcon = (category) => {
    const icons = {
      tapping: '👆',
      earnings: '💰',
      upgrades: '⚡',
      golden_taps: '✨',
      social: '👥',
      gifts: '🎁',
      streaks: '🔥',
      prestige: '👑',
      speed: '⚡',
      time: '⏰',
      milestones: '🏆'
    };
    return icons[category] || '🏆';
  };

  if (!isVisible || !achievement) return null;

  return (
    <div className={`achievement-notification ${isAnimating ? 'slide-in' : 'slide-out'}`}>
      <div className="notification-content" onClick={handleClose}>
        <div className="notification-icon">
          {getCategoryIcon(achievement.category)}
        </div>
        <div className="notification-text">
          <div className="notification-title">Achievement Unlocked!</div>
          <div className="notification-name">{achievement.name}</div>
        </div>
        <div className="notification-close" onClick={handleClose}>
          ×
        </div>
      </div>
      <div className="notification-progress">
        <div 
          className="progress-bar" 
          style={{ 
            animation: `progress-fill ${duration}ms linear forwards` 
          }}
        ></div>
      </div>
    </div>
  );
};

export default AchievementNotification;