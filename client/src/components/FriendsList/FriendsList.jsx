import React, { useState } from 'react';
import './FriendsList.css';

/**
 * Friends list component displaying user's friends with sorting and actions
 */
const FriendsList = ({ friends, onSendGift, onRemoveFriend, loading }) => {
  const [sortBy, setSortBy] = useState('coins'); // 'coins', 'name', 'activity'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'

  /**
   * Sort friends based on selected criteria
   */
  const sortedFriends = [...friends].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'coins':
        comparison = a.totalCoins - b.totalCoins;
        break;
      case 'name':
        comparison = a.displayName.localeCompare(b.displayName);
        break;
      case 'activity':
        const activityOrder = { 'online': 3, 'recent': 2, 'inactive': 1 };
        comparison = (activityOrder[a.activityStatus] || 0) - (activityOrder[b.activityStatus] || 0);
        break;
      default:
        comparison = 0;
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });

  /**
   * Handle sort change
   */
  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  /**
   * Get activity status display
   */
  const getActivityStatusDisplay = (status) => {
    switch (status) {
      case 'online':
        return { text: 'Online', color: '#4CAF50', icon: '🟢' };
      case 'recent':
        return { text: 'Recently active', color: '#FF9800', icon: '🟡' };
      case 'inactive':
        return { text: 'Inactive', color: '#757575', icon: '⚫' };
      default:
        return { text: 'Unknown', color: '#757575', icon: '⚫' };
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

  /**
   * Format last login time
   */
  const formatLastLogin = (lastLogin) => {
    if (!lastLogin) return 'Never';
    
    const now = new Date();
    const loginDate = new Date(lastLogin);
    const diffMs = now - loginDate;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return loginDate.toLocaleDateString();
    }
  };

  if (loading && friends.length === 0) {
    return (
      <div className="friends-list loading">
        <div className="loading-message">
          <div className="spinner"></div>
          <p>Loading friends...</p>
        </div>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="friends-list empty">
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3>No friends yet</h3>
          <p>Import friends from Telegram or add friends manually to start competing!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="friends-list">
      {/* Sort controls */}
      <div className="sort-controls">
        <span className="sort-label">Sort by:</span>
        <button
          className={`sort-btn ${sortBy === 'coins' ? 'active' : ''}`}
          onClick={() => handleSortChange('coins')}
        >
          💰 Coins {sortBy === 'coins' && (sortOrder === 'desc' ? '↓' : '↑')}
        </button>
        <button
          className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`}
          onClick={() => handleSortChange('name')}
        >
          📝 Name {sortBy === 'name' && (sortOrder === 'desc' ? '↓' : '↑')}
        </button>
        <button
          className={`sort-btn ${sortBy === 'activity' ? 'active' : ''}`}
          onClick={() => handleSortChange('activity')}
        >
          🔥 Activity {sortBy === 'activity' && (sortOrder === 'desc' ? '↓' : '↑')}
        </button>
      </div>

      {/* Friends list */}
      <div className="friends-grid">
        {sortedFriends.map((friend, index) => {
          const activityStatus = getActivityStatusDisplay(friend.activityStatus);
          
          return (
            <div key={friend.id} className="friend-card">
              <div className="friend-rank">#{index + 1}</div>
              
              <div className="friend-info">
                <div className="friend-name">
                  {friend.displayName}
                  {friend.prestigeLevel > 0 && (
                    <span className="prestige-badge">👑{friend.prestigeLevel}</span>
                  )}
                </div>
                
                <div className="friend-stats">
                  <div className="stat">
                    <span className="stat-label">💰 Coins:</span>
                    <span className="stat-value">{formatCoins(friend.totalCoins)}</span>
                  </div>
                  
                  <div className="stat">
                    <span className="stat-label">Status:</span>
                    <span 
                      className="stat-value activity-status"
                      style={{ color: activityStatus.color }}
                    >
                      {activityStatus.icon} {activityStatus.text}
                    </span>
                  </div>
                  
                  <div className="stat">
                    <span className="stat-label">Last seen:</span>
                    <span className="stat-value">{formatLastLogin(friend.lastLogin)}</span>
                  </div>
                </div>
              </div>

              <div className="friend-actions">
                <button
                  className="gift-btn"
                  onClick={() => onSendGift(friend)}
                  disabled={loading}
                >
                  🎁 Send Gift
                </button>
                
                <button
                  className="remove-btn"
                  onClick={() => onRemoveFriend(friend.id)}
                  disabled={loading}
                  title="Remove friend"
                >
                  ❌
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="friends-summary">
        <p>Total friends: {friends.length}</p>
        <p>
          Online: {friends.filter(f => f.activityStatus === 'online').length} | 
          Recent: {friends.filter(f => f.activityStatus === 'recent').length} | 
          Inactive: {friends.filter(f => f.activityStatus === 'inactive').length}
        </p>
      </div>
    </div>
  );
};

export default FriendsList;