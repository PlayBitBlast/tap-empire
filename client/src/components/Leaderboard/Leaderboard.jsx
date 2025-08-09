import React, { useState, useEffect, useCallback, useMemo } from 'react';
import leaderboardService from '../../services/leaderboardService';
import './Leaderboard.css';

/**
 * Leaderboard Component - Displays real-time leaderboards with smooth animations
 * Shows top 100 players and user's current position with rank changes
 */
const Leaderboard = ({ 
  currentUserId = null, 
  initialType = 'all_time',
  showUserRank = true,
  compact = false 
}) => {
  // State management
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [userRankData, setUserRankData] = useState(null);
  const [activeType, setActiveType] = useState(initialType);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [animatingRanks, setAnimatingRanks] = useState(new Set());
  const [stats, setStats] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage] = useState(compact ? 10 : 20);

  // Leaderboard types configuration
  const leaderboardTypes = useMemo(() => [
    { key: 'all_time', label: 'All Time', icon: '🏆' },
    { key: 'weekly', label: 'Weekly', icon: '📅' },
    { key: 'daily', label: 'Daily', icon: '⭐' }
  ], []);

  /**
   * Load leaderboard data
   */
  const loadLeaderboard = useCallback(async (type = activeType, page = currentPage) => {
    try {
      setLoading(true);
      setError(null);

      const offset = page * itemsPerPage;
      const limit = itemsPerPage;

      // Load leaderboard data
      const data = await leaderboardService.getLeaderboard(type, limit, offset);
      setLeaderboardData(data);

      // Load user rank data if user is provided and showUserRank is true
      if (currentUserId && showUserRank) {
        try {
          const rankData = await leaderboardService.getUserRank(currentUserId, type, 5);
          setUserRankData(rankData);
        } catch (rankError) {
          console.error('Error loading user rank:', rankError);
          setUserRankData(null);
        }
      }

    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [activeType, currentPage, itemsPerPage, currentUserId, showUserRank]);

  /**
   * Load leaderboard statistics
   */
  const loadStats = useCallback(async () => {
    try {
      const statsData = await leaderboardService.getLeaderboardStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error loading leaderboard stats:', err);
    }
  }, []);

  /**
   * Handle leaderboard type change
   */
  const handleTypeChange = useCallback((newType) => {
    if (newType !== activeType) {
      setActiveType(newType);
      setCurrentPage(0);
      setLeaderboardData(null);
      setUserRankData(null);
    }
  }, [activeType]);

  /**
   * Handle pagination
   */
  const handlePageChange = useCallback((newPage) => {
    if (newPage !== currentPage && newPage >= 0) {
      setCurrentPage(newPage);
      setLeaderboardData(null);
    }
  }, [currentPage]);

  /**
   * Handle real-time updates
   */
  const handleLeaderboardUpdate = useCallback((updateData) => {
    if (updateData.type === 'rank_change' && updateData.data) {
      const { userId, ranks } = updateData.data;
      
      // Animate rank change for the affected user
      setAnimatingRanks(prev => new Set([...prev, userId]));
      
      // Remove animation after delay
      setTimeout(() => {
        setAnimatingRanks(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }, 2000);

      // Refresh data if it affects current view
      if (activeType in ranks) {
        loadLeaderboard();
      }
    } else if (updateData.type === 'leaderboard_reset') {
      // Refresh data on leaderboard reset
      if (updateData.leaderboardType === activeType) {
        loadLeaderboard();
      }
    }
  }, [activeType, loadLeaderboard]);

  /**
   * Handle rank changes
   */
  const handleRankChange = useCallback((rankData) => {
    if (rankData.data && rankData.data.userId) {
      const { userId } = rankData.data;
      
      // Animate rank change
      setAnimatingRanks(prev => new Set([...prev, userId]));
      
      setTimeout(() => {
        setAnimatingRanks(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }, 2000);

      // Update user rank data if it's the current user
      if (currentUserId && userId === currentUserId && showUserRank) {
        loadLeaderboard();
      }
    }
  }, [currentUserId, showUserRank, loadLeaderboard]);

  // Setup effects
  useEffect(() => {
    loadLeaderboard();
    loadStats();
  }, [loadLeaderboard, loadStats]);

  useEffect(() => {
    // Subscribe to real-time updates
    const unsubscribe = leaderboardService.subscribeToUpdates((data) => {
      if (data.type === 'leaderboard_update' || data.type === 'global_update') {
        handleLeaderboardUpdate(data);
      } else if (data.type === 'rank_change') {
        handleRankChange(data);
      }
    });

    return unsubscribe;
  }, [handleLeaderboardUpdate, handleRankChange]);

  /**
   * Render leaderboard entry
   */
  const renderLeaderboardEntry = useCallback((entry, index) => {
    const isCurrentUser = currentUserId && entry.userId === currentUserId;
    const isAnimating = animatingRanks.has(entry.userId);
    const rankColorClass = leaderboardService.getRankColor(entry.rank);

    return (
      <div 
        key={entry.userId}
        className={`leaderboard-entry ${isCurrentUser ? 'current-user' : ''} ${isAnimating ? 'rank-animating' : ''}`}
      >
        <div className={`rank ${rankColorClass}`}>
          {entry.rank <= 3 && (
            <span className="rank-medal">
              {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
            </span>
          )}
          <span className="rank-number">
            {leaderboardService.formatRank(entry.rank)}
          </span>
        </div>
        
        <div className="player-info">
          <div className="player-name">
            {entry.firstName || entry.username || `Player ${entry.userId}`}
            {entry.lastName && ` ${entry.lastName}`}
            {isCurrentUser && <span className="you-indicator">(You)</span>}
          </div>
          {!compact && entry.lastActive && (
            <div className="last-active">
              Last active: {new Date(entry.lastActive).toLocaleDateString()}
            </div>
          )}
        </div>
        
        <div className="coins">
          <span className="coins-amount">
            {leaderboardService.formatCoins(entry.totalCoins)}
          </span>
          <span className="coins-label">coins</span>
        </div>
      </div>
    );
  }, [currentUserId, animatingRanks, compact]);

  /**
   * Render user rank section
   */
  const renderUserRank = useCallback(() => {
    if (!userRankData || !showUserRank) return null;

    const { userRank, userScore, nearbyPlayers } = userRankData;

    return (
      <div className="user-rank-section">
        <h3>Your Ranking</h3>
        <div className="user-rank-info">
          <div className="user-rank">
            <span className="rank-label">Your Rank:</span>
            <span className={`rank-value ${leaderboardService.getRankColor(userRank)}`}>
              {leaderboardService.formatRank(userRank)}
            </span>
          </div>
          <div className="user-score">
            <span className="score-label">Your Score:</span>
            <span className="score-value">
              {leaderboardService.formatCoins(userScore)} coins
            </span>
          </div>
        </div>
        
        {nearbyPlayers && nearbyPlayers.length > 0 && (
          <div className="nearby-players">
            <h4>Players Near You</h4>
            <div className="nearby-players-list">
              {nearbyPlayers.map((player, index) => renderLeaderboardEntry(player, index))}
            </div>
          </div>
        )}
      </div>
    );
  }, [userRankData, showUserRank, renderLeaderboardEntry]);

  /**
   * Render pagination controls
   */
  const renderPagination = useCallback(() => {
    if (!leaderboardData || !leaderboardData.pagination) return null;

    const { pagination } = leaderboardData;
    const totalPages = Math.ceil(pagination.total / itemsPerPage);
    const canGoPrev = currentPage > 0;
    const canGoNext = pagination.hasMore;

    return (
      <div className="pagination">
        <button 
          className="pagination-btn"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={!canGoPrev}
        >
          ← Previous
        </button>
        
        <span className="pagination-info">
          Page {currentPage + 1} of {totalPages}
          {pagination.total > 0 && (
            <span className="total-players">
              ({pagination.total} total players)
            </span>
          )}
        </span>
        
        <button 
          className="pagination-btn"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={!canGoNext}
        >
          Next →
        </button>
      </div>
    );
  }, [leaderboardData, currentPage, itemsPerPage, handlePageChange]);

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <div className={`leaderboard ${compact ? 'compact' : ''}`}>
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <div className={`leaderboard ${compact ? 'compact' : ''}`}>
        <div className="error">
          <p>Error loading leaderboard: {error}</p>
          <button onClick={() => loadLeaderboard()} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`leaderboard ${compact ? 'compact' : ''}`}>
      {/* Header */}
      <div className="leaderboard-header">
        <h2>🏆 Leaderboard</h2>
        {stats && (
          <div className="leaderboard-stats">
            <span className="total-players">
              {stats.totalPlayers[activeType]} players competing
            </span>
          </div>
        )}
      </div>

      {/* Type selector */}
      <div className="leaderboard-types">
        {leaderboardTypes.map(type => (
          <button
            key={type.key}
            className={`type-btn ${activeType === type.key ? 'active' : ''}`}
            onClick={() => handleTypeChange(type.key)}
          >
            <span className="type-icon">{type.icon}</span>
            <span className="type-label">{type.label}</span>
          </button>
        ))}
      </div>

      {/* User rank section */}
      {renderUserRank()}

      {/* Leaderboard entries */}
      <div className="leaderboard-content">
        {leaderboardData && leaderboardData.entries && leaderboardData.entries.length > 0 ? (
          <>
            <div className="leaderboard-list">
              {leaderboardData.entries.map((entry, index) => 
                renderLeaderboardEntry(entry, index)
              )}
            </div>
            
            {/* Pagination */}
            {!compact && renderPagination()}
          </>
        ) : (
          <div className="empty-leaderboard">
            <p>No players found for this leaderboard.</p>
            <p>Be the first to start playing!</p>
          </div>
        )}
      </div>

      {/* Last updated info */}
      {leaderboardData && leaderboardData.lastUpdated && (
        <div className="last-updated">
          Last updated: {new Date(leaderboardData.lastUpdated).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;