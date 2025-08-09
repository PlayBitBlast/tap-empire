import React from 'react';
import { useDailyBonus } from '../../hooks/useDailyBonus';
import './StreakDisplay.css';

/**
 * Component for displaying streak information in user profile
 */
const StreakDisplay = ({ compact = false }) => {
  const {
    currentStreak,
    longestStreak,
    totalBonusesClaimed,
    totalBonusCoins,
    nextBonusAmount,
    hoursUntilEligible,
    canClaimBonus
  } = useDailyBonus();

  const getStreakMultiplier = (day) => {
    const multipliers = [1, 1.5, 2, 2.5, 3, 4, 7];
    return multipliers[Math.min(day - 1, 6)] || 1;
  };

  const formatTimeUntilNext = (hours) => {
    if (hours <= 0) return 'Available now!';
    if (hours < 1) return `${Math.ceil(hours * 60)}m`;
    if (hours < 24) return `${Math.ceil(hours)}h`;
    return `${Math.ceil(hours / 24)}d`;
  };

  if (compact) {
    return (
      <div className="streak-display compact">
        <div className="streak-icon">🔥</div>
        <div className="streak-info">
          <div className="current-streak">{currentStreak}</div>
          <div className="streak-label">Day Streak</div>
        </div>
        {currentStreak > 0 && (
          <div className="streak-multiplier">
            {getStreakMultiplier(currentStreak)}x
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="streak-display full">
      <div className="streak-header">
        <h3>🔥 Login Streak</h3>
        {canClaimBonus && (
          <div className="bonus-available-badge">
            Bonus Available!
          </div>
        )}
      </div>

      <div className="streak-main">
        <div className="current-streak-display">
          <div className="streak-number">{currentStreak}</div>
          <div className="streak-text">
            <span className="days-text">Days</span>
            {currentStreak > 0 && (
              <span className="multiplier-text">
                {getStreakMultiplier(currentStreak)}x multiplier
              </span>
            )}
          </div>
        </div>

        <div className="next-bonus-info">
          <div className="next-bonus-label">Next Bonus:</div>
          <div className="next-bonus-amount">
            {nextBonusAmount.toLocaleString()} coins
          </div>
          <div className="next-bonus-time">
            {canClaimBonus ? (
              <span className="available-now">Available now!</span>
            ) : (
              <span className="time-remaining">
                in {formatTimeUntilNext(hoursUntilEligible)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="streak-progress-mini">
        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
          <div
            key={day}
            className={`progress-dot ${currentStreak >= day ? 'completed' : ''}`}
            title={`Day ${day}: ${getStreakMultiplier(day)}x multiplier`}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="streak-stats">
        <div className="stat-row">
          <span className="stat-label">Longest Streak:</span>
          <span className="stat-value">{longestStreak} days</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Total Bonuses:</span>
          <span className="stat-value">{totalBonusesClaimed}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Bonus Coins Earned:</span>
          <span className="stat-value">{totalBonusCoins.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default StreakDisplay;