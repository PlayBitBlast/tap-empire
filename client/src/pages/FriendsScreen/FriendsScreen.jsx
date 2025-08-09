import React, { useState } from 'react';
import { useSocial } from '../../hooks/useSocial';
import FriendsList from '../../components/FriendsList/FriendsList';
import GiftNotifications from '../../components/GiftNotifications/GiftNotifications';
import FriendSuggestions from '../../components/FriendSuggestions/FriendSuggestions';
import SocialStats from '../../components/SocialStats/SocialStats';
import './FriendsScreen.css';

/**
 * Friends screen component for social features
 */
const FriendsScreen = () => {
  const {
    friends,
    receivedGifts,
    socialStats,
    friendSuggestions,
    loading,
    error,
    sendGift,
    claimGift,
    addFriend,
    removeFriend,
    importTelegramFriends,
    refreshSocialData
  } = useSocial();

  const [activeTab, setActiveTab] = useState('friends');
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);

  /**
   * Handle tab change
   */
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  /**
   * Handle gift sending
   */
  const handleSendGift = (friend) => {
    setSelectedFriend(friend);
    setShowGiftModal(true);
  };

  /**
   * Handle gift modal close
   */
  const handleGiftModalClose = () => {
    setShowGiftModal(false);
    setSelectedFriend(null);
  };

  /**
   * Handle Telegram friends import
   */
  const handleImportTelegramFriends = async () => {
    try {
      // In a real implementation, this would use Telegram Web App SDK
      // to get the user's friend list
      if (window.Telegram?.WebApp) {
        // Mock Telegram friends for demo
        const mockTelegramFriends = [
          { id: 123456789, first_name: 'John', last_name: 'Doe', username: 'johndoe' },
          { id: 987654321, first_name: 'Jane', last_name: 'Smith', username: 'janesmith' }
        ];
        
        await importTelegramFriends(mockTelegramFriends);
      } else {
        alert('Telegram Web App not available');
      }
    } catch (error) {
      console.error('Error importing Telegram friends:', error);
    }
  };

  if (loading && friends.length === 0) {
    return (
      <div className="friends-screen loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading friends...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="friends-screen">
      <div className="friends-header">
        <h1>Friends</h1>
        <button 
          className="import-friends-btn"
          onClick={handleImportTelegramFriends}
          disabled={loading}
        >
          📱 Import from Telegram
        </button>
      </div>

      {error && (
        <div className="error-message">
          <p>⚠️ {error}</p>
          <button onClick={refreshSocialData}>Retry</button>
        </div>
      )}

      {/* Gift notifications */}
      {receivedGifts.length > 0 && (
        <GiftNotifications 
          gifts={receivedGifts}
          onClaimGift={claimGift}
        />
      )}

      {/* Social stats */}
      {socialStats && (
        <SocialStats stats={socialStats} />
      )}

      {/* Tab navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => handleTabChange('friends')}
        >
          👥 Friends ({friends.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'suggestions' ? 'active' : ''}`}
          onClick={() => handleTabChange('suggestions')}
        >
          ✨ Suggestions ({friendSuggestions.length})
        </button>
      </div>

      {/* Tab content */}
      <div className="tab-content">
        {activeTab === 'friends' && (
          <FriendsList
            friends={friends}
            onSendGift={handleSendGift}
            onRemoveFriend={removeFriend}
            loading={loading}
          />
        )}

        {activeTab === 'suggestions' && (
          <FriendSuggestions
            suggestions={friendSuggestions}
            onAddFriend={addFriend}
            loading={loading}
          />
        )}
      </div>

      {/* Gift sending modal */}
      {showGiftModal && selectedFriend && (
        <GiftModal
          friend={selectedFriend}
          onSendGift={sendGift}
          onClose={handleGiftModalClose}
          remainingGifts={socialStats?.remainingDailyGifts || 0}
        />
      )}
    </div>
  );
};

/**
 * Gift sending modal component
 */
const GiftModal = ({ friend, onSendGift, onClose, remainingGifts }) => {
  const [amount, setAmount] = useState(50);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    try {
      setSending(true);
      await onSendGift(friend.id, amount, message || null);
      onClose();
    } catch (error) {
      alert(`Failed to send gift: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="gift-modal-overlay" onClick={onClose}>
      <div className="gift-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gift-modal-header">
          <h3>Send Gift to {friend.displayName}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="gift-modal-content">
          <div className="gift-amount-section">
            <label>Gift Amount (10-1000 coins)</label>
            <input
              type="number"
              min="10"
              max="1000"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value))}
            />
          </div>

          <div className="gift-message-section">
            <label>Message (optional)</label>
            <textarea
              placeholder="Add a friendly message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength="200"
            />
          </div>

          <div className="gift-info">
            <p>Remaining daily gifts: {remainingGifts}</p>
          </div>
        </div>

        <div className="gift-modal-actions">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="send-btn"
            onClick={handleSend}
            disabled={sending || remainingGifts <= 0 || amount < 10 || amount > 1000}
          >
            {sending ? 'Sending...' : `Send ${amount} coins`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FriendsScreen;