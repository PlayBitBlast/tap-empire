import React, { useState, useEffect } from 'react';
import './AchievementCelebration.css';

/**
 * Achievement celebration popup component
 */
const AchievementCelebration = ({ 
  achievement, 
  isVisible, 
  onClose, 
  onShare 
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      setShowConfetti(true);
      
      // Auto-close after 5 seconds if not manually closed
      const timer = setTimeout(() => {
        handleClose();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const handleClose = () => {
    setIsAnimating(false);
    setShowConfetti(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleShare = () => {
    if (onShare) {
      onShare(achievement.id);
    }
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

  const formatReward = (coins, multiplier) => {
    const rewards = [];
    if (coins > 0) {
      rewards.push(`+${coins.toLocaleString()} coins`);
    }
    if (multiplier > 1.0) {
      const percentage = ((multiplier - 1) * 100).toFixed(1);
      rewards.push(`+${percentage}% multiplier`);
    }
    return rewards.join(' • ');
  };

  if (!isVisible || !achievement) return null;

  return (
    <div className={`achievement-celebration-overlay ${isAnimating ? 'visible' : ''}`}>
      {showConfetti && (
        <div className="confetti-container">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="confetti-piece"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                backgroundColor: ['#FFD700', '#FF6347', '#32CD32', '#1E90FF', '#FF69B4'][Math.floor(Math.random() * 5)]
              }}
            />
          ))}
        </div>
      )}
      
      <div className={`achievement-celebration-modal ${isAnimating ? 'animate-in' : 'animate-out'}`}>
        <div className="achievement-celebration-header">
          <div className="achievement-celebration-title">
            🎉 Achievement Unlocked! 🎉
          </div>
          <button 
            className="achievement-celebration-close"
            onClick={handleClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        <div className="achievement-celebration-content">
          <div className="achievement-celebration-icon">
            <div className="achievement-icon-glow">
              {getCategoryIcon(achievement.category)}
            </div>
          </div>
          
          <div className="achievement-celebration-info">
            <h3 className="achievement-name">{achievement.name}</h3>
            <p className="achievement-description">{achievement.description}</p>
            
            {(achievement.reward_coins > 0 || achievement.reward_multiplier > 1.0) && (
              <div className="achievement-rewards">
                <div className="rewards-label">Rewards:</div>
                <div className="rewards-text">
                  {formatReward(achievement.reward_coins, achievement.reward_multiplier)}
                </div>
              </div>
            )}
            
            <div className="achievement-category">
              <span className="category-badge">
                {getCategoryIcon(achievement.category)} {achievement.category.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
        
        <div className="achievement-celebration-actions">
          <button 
            className="btn btn-secondary"
            onClick={handleClose}
          >
            Continue Playing
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleShare}
          >
            📤 Share Achievement
          </button>
        </div>
      </div>
    </div>
  );
};

export default AchievementCelebration;