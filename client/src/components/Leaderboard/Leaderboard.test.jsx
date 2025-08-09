import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Leaderboard from './Leaderboard';
import leaderboardService from '../../services/leaderboardService';

// Mock the leaderboard service
jest.mock('../../services/leaderboardService', () => ({
  getLeaderboard: jest.fn(),
  getUserRank: jest.fn(),
  getLeaderboardStats: jest.fn(),
  subscribeToUpdates: jest.fn(() => jest.fn()), // Return unsubscribe function
  formatRank: jest.fn((rank) => rank ? `${rank}${rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th'}` : 'Unranked'),
  formatCoins: jest.fn((coins) => coins < 1000 ? coins.toString() : `${(coins / 1000).toFixed(1)}K`),
  getRankColor: jest.fn((rank) => rank === 1 ? 'rank-gold' : rank === 2 ? 'rank-silver' : rank === 3 ? 'rank-bronze' : 'rank-default')
}));

describe('Leaderboard Component', () => {
  const mockLeaderboardData = {
    type: 'all_time',
    entries: [
      {
        rank: 1,
        userId: 123,
        username: 'player1',
        firstName: 'John',
        lastName: 'Doe',
        totalCoins: 10000,
        lastActive: new Date().toISOString()
      },
      {
        rank: 2,
        userId: 456,
        username: 'player2',
        firstName: 'Jane',
        lastName: 'Smith',
        totalCoins: 8000,
        lastActive: new Date().toISOString()
      },
      {
        rank: 3,
        userId: 789,
        username: 'player3',
        firstName: 'Bob',
        lastName: 'Johnson',
        totalCoins: 6000,
        lastActive: new Date().toISOString()
      }
    ],
    pagination: {
      limit: 20,
      offset: 0,
      total: 100,
      hasMore: true
    },
    lastUpdated: Date.now()
  };

  const mockUserRankData = {
    userRank: 5,
    userScore: 5000,
    nearbyPlayers: [
      {
        rank: 4,
        userId: 999,
        username: 'player4',
        firstName: 'Alice',
        totalCoins: 5500,
        isCurrentUser: false
      },
      {
        rank: 5,
        userId: 123,
        username: 'currentUser',
        firstName: 'Current',
        totalCoins: 5000,
        isCurrentUser: true
      },
      {
        rank: 6,
        userId: 888,
        username: 'player6',
        firstName: 'Charlie',
        totalCoins: 4500,
        isCurrentUser: false
      }
    ],
    totalPlayers: 100,
    type: 'all_time',
    lastUpdated: Date.now()
  };

  const mockStats = {
    totalPlayers: {
      allTime: 100,
      weekly: 80,
      daily: 50
    },
    lastUpdated: Date.now()
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    leaderboardService.getLeaderboard.mockResolvedValue(mockLeaderboardData);
    leaderboardService.getUserRank.mockResolvedValue(mockUserRankData);
    leaderboardService.getLeaderboardStats.mockResolvedValue(mockStats);
  });

  it('renders leaderboard with data', async () => {
    render(<Leaderboard />);

    // Check if loading state is shown initially
    expect(screen.getByText('Loading leaderboard...')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('🏆 Leaderboard')).toBeInTheDocument();
    });

    // Check if leaderboard entries are rendered
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();

    // Check if service methods were called
    expect(leaderboardService.getLeaderboard).toHaveBeenCalledWith('all_time', 20, 0);
    expect(leaderboardService.getLeaderboardStats).toHaveBeenCalled();
  });

  it('renders user rank section when user is provided', async () => {
    render(<Leaderboard currentUserId={123} showUserRank={true} />);

    await waitFor(() => {
      expect(screen.getByText('Your Ranking')).toBeInTheDocument();
    });

    // Check if user rank data is displayed
    expect(screen.getByText('Your Rank:')).toBeInTheDocument();
    expect(screen.getByText('Your Score:')).toBeInTheDocument();
    expect(screen.getByText('Players Near You')).toBeInTheDocument();

    // Check if service method was called with user ID
    expect(leaderboardService.getUserRank).toHaveBeenCalledWith(123, 'all_time', 5);
  });

  it('handles leaderboard type changes', async () => {
    render(<Leaderboard />);

    await waitFor(() => {
      expect(screen.getByText('🏆 Leaderboard')).toBeInTheDocument();
    });

    // Find and click the weekly tab
    const weeklyButton = screen.getByText('Weekly');
    fireEvent.click(weeklyButton);

    // Check if service was called with new type
    await waitFor(() => {
      expect(leaderboardService.getLeaderboard).toHaveBeenCalledWith('weekly', 20, 0);
    });
  });

  it('displays error state when loading fails', async () => {
    const errorMessage = 'Failed to load leaderboard';
    leaderboardService.getLeaderboard.mockRejectedValue(new Error(errorMessage));

    render(<Leaderboard />);

    await waitFor(() => {
      expect(screen.getByText(`Error loading leaderboard: ${errorMessage}`)).toBeInTheDocument();
    });

    // Check if retry button is present
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('handles retry functionality', async () => {
    const errorMessage = 'Network error';
    leaderboardService.getLeaderboard
      .mockRejectedValueOnce(new Error(errorMessage))
      .mockResolvedValueOnce(mockLeaderboardData);

    render(<Leaderboard />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText(`Error loading leaderboard: ${errorMessage}`)).toBeInTheDocument();
    });

    // Click retry button
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    // Wait for successful load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Verify service was called twice
    expect(leaderboardService.getLeaderboard).toHaveBeenCalledTimes(3); // Initial + stats + retry
  });

  it('renders compact mode correctly', async () => {
    render(<Leaderboard compact={true} />);

    await waitFor(() => {
      expect(screen.getByText('🏆 Leaderboard')).toBeInTheDocument();
    });

    // Check if compact class is applied
    const leaderboardElement = screen.getByText('🏆 Leaderboard').closest('.leaderboard');
    expect(leaderboardElement).toHaveClass('compact');
  });

  it('highlights current user in leaderboard', async () => {
    const currentUserId = 456;
    render(<Leaderboard currentUserId={currentUserId} />);

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Check if current user indicator is shown
    expect(screen.getByText('(You)')).toBeInTheDocument();
  });

  it('displays empty state when no players found', async () => {
    const emptyLeaderboardData = {
      ...mockLeaderboardData,
      entries: []
    };
    leaderboardService.getLeaderboard.mockResolvedValue(emptyLeaderboardData);

    render(<Leaderboard />);

    await waitFor(() => {
      expect(screen.getByText('No players found for this leaderboard.')).toBeInTheDocument();
    });

    expect(screen.getByText('Be the first to start playing!')).toBeInTheDocument();
  });

  it('subscribes to real-time updates', async () => {
    const mockUnsubscribe = jest.fn();
    leaderboardService.subscribeToUpdates.mockReturnValue(mockUnsubscribe);

    const { unmount } = render(<Leaderboard />);

    // Check if subscription was set up
    expect(leaderboardService.subscribeToUpdates).toHaveBeenCalled();

    // Unmount component
    unmount();

    // Check if unsubscribe was called
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('displays leaderboard statistics', async () => {
    render(<Leaderboard />);

    await waitFor(() => {
      expect(screen.getByText('100 players competing')).toBeInTheDocument();
    });
  });

  it('formats ranks correctly', async () => {
    render(<Leaderboard />);

    await waitFor(() => {
      expect(leaderboardService.formatRank).toHaveBeenCalledWith(1);
      expect(leaderboardService.formatRank).toHaveBeenCalledWith(2);
      expect(leaderboardService.formatRank).toHaveBeenCalledWith(3);
    });
  });

  it('formats coins correctly', async () => {
    render(<Leaderboard />);

    await waitFor(() => {
      expect(leaderboardService.formatCoins).toHaveBeenCalledWith(10000);
      expect(leaderboardService.formatCoins).toHaveBeenCalledWith(8000);
      expect(leaderboardService.formatCoins).toHaveBeenCalledWith(6000);
    });
  });

  it('applies correct rank colors', async () => {
    render(<Leaderboard />);

    await waitFor(() => {
      expect(leaderboardService.getRankColor).toHaveBeenCalledWith(1);
      expect(leaderboardService.getRankColor).toHaveBeenCalledWith(2);
      expect(leaderboardService.getRankColor).toHaveBeenCalledWith(3);
    });
  });
});