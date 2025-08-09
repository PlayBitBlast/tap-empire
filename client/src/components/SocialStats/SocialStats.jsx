import React from 'react';
import './SocialStats.css';

/**
 * Social statistics component displaying user's social activity
 */
const SocialStats = ({ stats }) => {
  /**
   * Format coin amount for display
   */
  const formatCoins = (amount) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    } else {
      return amount.toString();
    }
  };

  /**
   * Calculate gift claim rate
   */
  const getGiftClaimRate = () => {
    if (stats.giftsReceived === 0) return 0;
    return Math.round((stats.giftsClaimed / stats.giftsReceived) * 100);
  };

  /**
   * Get remaining gifts progress
   */
  const getRemainingGiftsProgress = () => {
    const sent = stats.dailyGiftsSent;
    const total = 5; // Daily limit
    return (sent / total) * 100;
  };

  if (!stats) {
    return null;
  }

  return (
    <div className="social-stats">
      <div className="social-stats-header">
        <h3>📊 Your Social Stats</h3>
      </div>

      <div className="stats-grid">
        {/* Friends count */}
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-value">{stats.friendsCount}</div>
            <div className="stat-label">Friends</div>
          </div>
        </div>

        {/* Daily gifts remaining */}
        <div className="stat-card">
          <div className="stat-icon">🎁</div>
          <div className="stat-content">
            <div className="stat-value">{stats.remainingDailyGifts}</div>
            <div className="stat-label">Gifts Left Today</div>
            <div className="stat-progress">
              <div 
                className="stat-progress-bar"
                style={{ width: `${getRemainingGiftsProgress()}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Total coins gifted */}
        <div className="stat-card">
          <div className="stat-icon">💝</div>
          <div className="stat-content">
            <div className="stat-value">{formatCoins(stats.totalCoinsGifted)}</div>
            <div className="stat-label">Coins Gifted</div>
            <div className="stat-subtext">{stats.giftsSent} gifts sent</div>
          </div>
        </div>

        {/* Total coins received */}
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-value">{formatCoins(stats.totalCoinsReceived)}</div>
            <div className="stat-label">Coins Received</div>
            <div className="stat-subtext">{stats.giftsClaimed} gifts claimed</div>
          </div>
        </div>

        {/* Gift claim rate */}
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <div className="stat-value">{getGiftClaimRate()}%</div>
            <div className="stat-label">Claim Rate</div>
            <div className="stat-subtext">
              {stats.giftsClaimed}/{stats.giftsReceived} claimed
            </div>
          </div>
        </div>

        {/* Generosity score */}
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <div className="stat-value">
              {stats.giftsSent > stats.giftsReceived ? '🌟' : 
               stats.giftsSent === stats.giftsReceived ? '⚖️' : '📥'}
            </div>
            <div className="stat-label">
              {stats.giftsSent > stats.giftsReceived ? 'Generous' : 
               stats.giftsSent === stats.giftsReceived ? 'Balanced' : 'Receiver'}
            </div>
            <div className="stat-subtext">
              {stats.giftsSent > stats.giftsReceived ? 'You give more than you receive!' :
               stats.giftsSent === stats.giftsReceived ? 'Perfect balance!' :
               'You receive more than you give'}
            </div>
          </div>
        </div>
      </div>

      {/* Daily gift reset info */}
      <div className="daily-reset-info">
        <p>🔄 Daily gift limit resets at midnight UTC</p>
        {stats.remainingDailyGifts === 0 && (
          <p className="no-gifts-warning">⚠️ No gifts remaining today. Come back tomorrow!</p>
        )}
      </div>
    </div>
  );
};

export default SocialStats;