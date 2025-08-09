import React from 'react';
import { useDailyBonus } from '../../hooks/useDailyBonus';
import './DailyBonusNotification.css';

/**
 * Notification component that shows when daily bonus is available
 */
const DailyBonusNotification = ({ onClick }) => {
  const { canClaimBonus, nextBonusAmount, currentStreak } = useDailyBonus();

  if (!canClaimBonus) return null;

  return (
    <div className="daily-bonus-notification" onClick={onClick}>
      <div className="notification-icon">🎁</div>
      <div className="notification-content">
        <div className="notification-title">Daily Bonus Available!</div>
        <div className="notification-details">
          <span className="bonus-amount">+{nextBonusAmount.toLocaleString()} coins</span>
          {currentStreak > 0 && (
            <span className="streak-indicator">🔥 {currentStreak} day streak</span>
          )}
        </div>
      </div>
      <div className="notification-pulse"></div>
    </div>
  );
};

export default DailyBonusNotification;