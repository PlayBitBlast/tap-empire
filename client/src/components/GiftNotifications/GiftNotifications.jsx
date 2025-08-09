import React, { useState } from 'react';
import './GiftNotifications.css';

/**
 * Gift notifications component for displaying and claiming received gifts
 */
const GiftNotifications = ({ gifts, onClaimGift }) => {
  const [claimingGifts, setClaimingGifts] = useState(new Set());

  /**
   * Handle gift claiming
   */
  const handleClaimGift = async (giftId) => {
    if (claimingGifts.has(giftId)) return;

    try {
      setClaimingGifts(prev => new Set([...prev, giftId]));
      await onClaimGift(giftId);
    } catch (error) {
      console.error('Error claiming gift:', error);
      alert(`Failed to claim gift: ${error.message}`);
    } finally {
      setClaimingGifts(prev => {
        const newSet = new Set(prev);
        newSet.delete(giftId);
        return newSet;
      });
    }
  };

  /**
   * Format time remaining until gift expires
   */
  const formatTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry - now;

    if (diffMs <= 0) return 'Expired';

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours % 24}h`;
    } else if (diffHours > 0) {
      return `${diffHours}h`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m`;
    }
  };

  /**
   * Check if gift is expiring soon (less than 24 hours)
   */
  const isExpiringSoon = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry - now;
    return diffMs > 0 && diffMs < 24 * 60 * 60 * 1000; // Less than 24 hours
  };

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

  if (gifts.length === 0) {
    return null;
  }

  return (
    <div className="gift-notifications">
      <div className="gift-notifications-header">
        <h3>🎁 Received Gifts ({gifts.length})</h3>
        <p>Claim your gifts before they expire!</p>
      </div>

      <div className="gifts-list">
        {gifts.map((gift) => {
          const isClaiming = claimingGifts.has(gift.id);
          const timeRemaining = formatTimeRemaining(gift.expiresAt);
          const expiringSoon = isExpiringSoon(gift.expiresAt);
          const isExpired = timeRemaining === 'Expired';

          return (
            <div 
              key={gift.id} 
              className={`gift-item ${expiringSoon ? 'expiring-soon' : ''} ${isExpired ? 'expired' : ''}`}
            >
              <div className="gift-icon">🎁</div>
              
              <div className="gift-details">
                <div className="gift-sender">
                  From: <strong>{gift.senderName}</strong>
                </div>
                
                <div className="gift-amount">
                  💰 {formatCoins(gift.amount)} coins
                </div>
                
                {gift.message && (
                  <div className="gift-message">
                    💬 "{gift.message}"
                  </div>
                )}
                
                <div className={`gift-expiry ${expiringSoon ? 'warning' : ''} ${isExpired ? 'expired' : ''}`}>
                  ⏰ {isExpired ? 'Expired' : `Expires in ${timeRemaining}`}
                </div>
              </div>

              <div className="gift-actions">
                {!isExpired ? (
                  <button
                    className="claim-btn"
                    onClick={() => handleClaimGift(gift.id)}
                    disabled={isClaiming}
                  >
                    {isClaiming ? (
                      <>
                        <div className="claiming-spinner"></div>
                        Claiming...
                      </>
                    ) : (
                      'Claim'
                    )}
                  </button>
                ) : (
                  <div className="expired-label">Expired</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {gifts.length > 0 && (
        <div className="gifts-summary">
          <p>
            Total value: 💰 {formatCoins(gifts.reduce((sum, gift) => sum + gift.amount, 0))} coins
          </p>
          <p className="expiry-warning">
            ⚠️ Gifts expire after 7 days. Claim them before they disappear!
          </p>
        </div>
      )}
    </div>
  );
};

export default GiftNotifications;