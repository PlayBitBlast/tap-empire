import React, { useState, useEffect } from 'react';
import { useDailyBonus } from '../../hooks/useDailyBonus';
import './DailyBonusModal.css';

/**
 * Modal component for daily bonus system
 */
const DailyBonusModal = ({ isOpen, onClose }) => {
  const {
    bonusStatus,
    isLoading,
    error,
    claimResult,
    claimDailyBonus,
    clearClaimResult,
    clearError,
    canClaimBonus,
    currentStreak,
    nextBonusAmount,
    hoursUntilEligible,
    longestStreak,
    totalBonusesClaimed
  } = useDailyBonus();

  const [showCelebration, setShowCelebration] = useState(false);

  // Handle successful claim
  useEffect(() => {
    if (claimResult) {
      setShowCelebration(true);
      const timer = setTimeout(() => {
        setShowCelebration(false);
        clearClaimResult();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [claimResult, clearClaimResult]);

  const handleClaimBonus = async () => {
    const result = await claimDailyBonus();
    if (result) {
      // Success is handled by the useEffect above
    }
  };

  const handleClose = () => {
    clearError();
    clearClaimResult();
    setShowCelebration(false);
    onClose();
  };

  const formatTimeUntilNext = (hours) => {
    if (hours <= 0) return 'Available now!';
    if (hours < 1) return `${Math.ceil(hours * 60)} minutes`;
    return `${Math.ceil(hours)} hours`;
  };

  const getStreakMultiplier = (day) => {
    const multipliers = [1, 1.5, 2, 2.5, 3, 4, 7];
    return multipliers[Math.min(day - 1, 6)] || 1;
  };

  if (!isOpen) return null;

  return (
    <div className="daily-bonus-modal-overlay" onClick={handleClose}>
      <div className="daily-bonus-modal" onClick={(e) => e.stopPropagation()}>
        <div className="daily-bonus-header">
          <h2>Daily Bonus</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        {isLoading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading bonus information...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <p className="error-message">{error}</p>
            <button onClick={clearError} className="retry-button">
              Dismiss
            </button>
          </div>
        )}

        {showCelebration && claimResult && (
          <div className="celebration-overlay">
            <div className="celebration-content">
              <div className="celebration-icon">🎉</div>
              <h3>Bonus Claimed!</h3>
              <div className="bonus-amount">+{claimResult.bonusAmount.toLocaleString()} coins</div>
              <div className="streak-info">
                {claimResult.isNewStreak ? (
                  <p>New streak started! Day {claimResult.streakDay}</p>
                ) : (
                  <p>Streak continues! Day {claimResult.streakDay} ({claimResult.multiplier}x multiplier)</p>
                )}
              </div>
            </div>
          </div>
        )}

        {bonusStatus && !isLoading && (
          <div className="daily-bonus-content">
            {/* Current Streak Display */}
            <div className="streak-display">
              <div className="streak-icon">🔥</div>
              <div className="streak-info">
                <h3>Current Streak</h3>
                <div className="streak-number">{currentStreak} days</div>
                {currentStreak > 0 && (
                  <div className="streak-multiplier">
                    {getStreakMultiplier(currentStreak)}x multiplier
                  </div>
                )}
              </div>
            </div>

            {/* Streak Progress Bar */}
            <div className="streak-progress">
              <div className="progress-label">Streak Progress</div>
              <div className="progress-bar">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <div
                    key={day}
                    className={`progress-day ${currentStreak >= day ? 'completed' : ''}`}
                  >
                    <div className="day-number">{day}</div>
                    <div className="day-multiplier">{getStreakMultiplier(day)}x</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bonus Claim Section */}
            <div className="bonus-claim-section">
              {canClaimBonus ? (
                <div className="claim-available">
                  <div className="bonus-amount-display">
                    <span className="bonus-label">Today's Bonus:</span>
                    <span className="bonus-amount">{nextBonusAmount.toLocaleString()} coins</span>
                  </div>
                  <button
                    className="claim-button"
                    onClick={handleClaimBonus}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Claiming...' : 'Claim Bonus'}
                  </button>
                </div>
              ) : (
                <div className="claim-unavailable">
                  <div className="next-bonus-info">
                    <span className="next-bonus-label">Next Bonus:</span>
                    <span className="next-bonus-amount">{nextBonusAmount.toLocaleString()} coins</span>
                  </div>
                  <div className="time-remaining">
                    Available in: {formatTimeUntilNext(hoursUntilEligible)}
                  </div>
                </div>
              )}
            </div>

            {/* Statistics */}
            <div className="bonus-statistics">
              <h4>Your Statistics</h4>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">{longestStreak}</div>
                  <div className="stat-label">Longest Streak</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{totalBonusesClaimed}</div>
                  <div className="stat-label">Total Bonuses</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{bonusStatus.totalBonusCoins?.toLocaleString() || '0'}</div>
                  <div className="stat-label">Bonus Coins Earned</div>
                </div>
              </div>
            </div>

            {/* Streak Tips */}
            <div className="streak-tips">
              <h4>💡 Streak Tips</h4>
              <ul>
                <li>Log in every day to maintain your streak</li>
                <li>Streaks reset if you miss more than 36 hours</li>
                <li>Maximum streak multiplier is 7x on day 7</li>
                <li>You can claim your bonus once every 20 hours</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyBonusModal;