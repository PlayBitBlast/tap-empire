import React, { useState } from 'react';
import './FriendSuggestions.css';

/**
 * Friend suggestions component for discovering new friends
 */
const FriendSuggestions = ({ suggestions, onAddFriend, loading }) => {
  const [addingFriends, setAddingFriends] = useState(new Set());

  /**
   * Handle adding a friend
   */
  const handleAddFriend = async (friendId) => {
    if (addingFriends.has(friendId)) return;

    try {
      setAddingFriends(prev => new Set([...prev, friendId]));
      await onAddFriend(friendId);
    } catch (error) {
      console.error('Error adding friend:', error);
      alert(`Failed to add friend: ${error.message}`);
    } finally {
      setAddingFriends(prev => {
        const newSet = new Set(prev);
        newSet.delete(friendId);
        return newSet;
      });
    }
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

  if (loading && suggestions.length === 0) {
    return (
      <div className="friend-suggestions loading">
        <div className="loading-message">
          <div className="spinner"></div>
          <p>Finding friend suggestions...</p>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="friend-suggestions empty">
        <div className="empty-state">
          <div className="empty-icon">✨</div>
          <h3>No suggestions available</h3>
          <p>Add more friends to get better suggestions based on mutual connections!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="friend-suggestions">
      <div className="suggestions-header">
        <h3>✨ Friend Suggestions</h3>
        <p>People you might know based on mutual friends</p>
      </div>

      <div className="suggestions-grid">
        {suggestions.map((suggestion) => {
          const isAdding = addingFriends.has(suggestion.id);

          return (
            <div key={suggestion.id} className="suggestion-card">
              <div className="suggestion-info">
                <div className="suggestion-name">
                  {suggestion.displayName}
                </div>
                
                <div className="suggestion-stats">
                  <div className="stat">
                    <span className="stat-icon">💰</span>
                    <span className="stat-value">{formatCoins(suggestion.totalCoins)} coins</span>
                  </div>
                  
                  <div className="stat">
                    <span className="stat-icon">👥</span>
                    <span className="stat-value">
                      {suggestion.mutualFriends} mutual friend{suggestion.mutualFriends !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>

              <div className="suggestion-actions">
                <button
                  className="add-friend-btn"
                  onClick={() => handleAddFriend(suggestion.id)}
                  disabled={isAdding || loading}
                >
                  {isAdding ? (
                    <>
                      <div className="adding-spinner"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      ➕ Add Friend
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="suggestions-footer">
        <p>💡 Suggestions are based on mutual friends and similar activity levels</p>
      </div>
    </div>
  );
};

export default FriendSuggestions;