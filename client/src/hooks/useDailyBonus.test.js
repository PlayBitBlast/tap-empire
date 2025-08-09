import { renderHook, act, waitFor } from '@testing-library/react';
import { useDailyBonus } from './useDailyBonus';
import { useAuth } from './useAuth';

// Mock the useAuth hook
jest.mock('./useAuth');

// Mock fetch
global.fetch = jest.fn();

describe('useDailyBonus', () => {
  const mockUser = { id: 1, username: 'testuser' };
  const mockToken = 'mock-jwt-token';

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      user: mockUser,
      token: mockToken
    });
    
    // Reset fetch mock
    fetch.mockClear();
  });

  describe('fetchBonusStatus', () => {
    it('should fetch bonus status successfully', async () => {
      const mockBonusStatus = {
        currentStreak: 3,
        longestStreak: 5,
        totalBonusesClaimed: 10,
        totalBonusCoins: 1500,
        eligibility: {
          eligible: true,
          streakDay: 4,
          bonusAmount: 250,
          multiplier: 2.5
        },
        nextBonusAmount: 250
      };

      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: mockBonusStatus
        })
      });

      const { result } = renderHook(() => useDailyBonus());

      await waitFor(() => {
        expect(result.current.bonusStatus).toEqual(mockBonusStatus);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe(null);
      });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/daily-bonus/status',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    });

    it('should handle fetch error', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useDailyBonus());

      await waitFor(() => {
        expect(result.current.error).toBe('Network error occurred');
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle API error response', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: false,
          error: 'User not found'
        })
      });

      const { result } = renderHook(() => useDailyBonus());

      await waitFor(() => {
        expect(result.current.error).toBe('User not found');
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should not fetch if no token', async () => {
      useAuth.mockReturnValue({
        user: mockUser,
        token: null
      });

      renderHook(() => useDailyBonus());

      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('claimDailyBonus', () => {
    it('should claim bonus successfully', async () => {
      const mockClaimResult = {
        success: true,
        bonusAmount: 250,
        streakDay: 4,
        multiplier: 2.5,
        isNewStreak: false,
        nextBonusAmount: 300
      };

      const mockUpdatedStatus = {
        currentStreak: 4,
        eligibility: { eligible: false }
      };

      fetch
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            data: mockClaimResult
          })
        })
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            data: mockUpdatedStatus
          })
        });

      const { result } = renderHook(() => useDailyBonus());

      let claimResult;
      await act(async () => {
        claimResult = await result.current.claimDailyBonus();
      });

      expect(claimResult).toEqual(mockClaimResult);
      expect(result.current.claimResult).toEqual(mockClaimResult);
      
      // Should have called both claim and status endpoints
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenNthCalledWith(1,
        'http://localhost:3001/api/daily-bonus/claim',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    });

    it('should handle claim error', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: false,
          error: 'Daily bonus already claimed today'
        })
      });

      const { result } = renderHook(() => useDailyBonus());

      let claimResult;
      await act(async () => {
        claimResult = await result.current.claimDailyBonus();
      });

      expect(claimResult).toBe(null);
      expect(result.current.error).toBe('Daily bonus already claimed today');
    });

    it('should handle network error during claim', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useDailyBonus());

      let claimResult;
      await act(async () => {
        claimResult = await result.current.claimDailyBonus();
      });

      expect(claimResult).toBe(null);
      expect(result.current.error).toBe('Network error occurred');
    });
  });

  describe('getBonusHistory', () => {
    it('should fetch bonus history successfully', async () => {
      const mockHistory = [
        {
          bonus_date: '2024-01-15',
          streak_day: 3,
          bonus_amount: 200,
          multiplier: 2,
          claimed_at: '2024-01-15T10:00:00Z'
        }
      ];

      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: { history: mockHistory }
        })
      });

      const { result } = renderHook(() => useDailyBonus());

      let history;
      await act(async () => {
        history = await result.current.getBonusHistory(10);
      });

      expect(history).toEqual(mockHistory);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/daily-bonus/history?limit=10',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    });

    it('should return empty array on error', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useDailyBonus());

      let history;
      await act(async () => {
        history = await result.current.getBonusHistory();
      });

      expect(history).toEqual([]);
    });
  });

  describe('computed values', () => {
    it('should compute correct values from bonus status', async () => {
      const mockBonusStatus = {
        currentStreak: 3,
        longestStreak: 5,
        totalBonusesClaimed: 10,
        totalBonusCoins: 1500,
        eligibility: {
          eligible: true,
          hoursUntilEligible: 0
        },
        nextBonusAmount: 250
      };

      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: mockBonusStatus
        })
      });

      const { result } = renderHook(() => useDailyBonus());

      await waitFor(() => {
        expect(result.current.canClaimBonus).toBe(true);
        expect(result.current.currentStreak).toBe(3);
        expect(result.current.nextBonusAmount).toBe(250);
        expect(result.current.hoursUntilEligible).toBe(0);
        expect(result.current.longestStreak).toBe(5);
        expect(result.current.totalBonusesClaimed).toBe(10);
        expect(result.current.totalBonusCoins).toBe(1500);
      });
    });

    it('should return default values when no bonus status', () => {
      useAuth.mockReturnValue({
        user: null,
        token: null
      });

      const { result } = renderHook(() => useDailyBonus());

      expect(result.current.canClaimBonus).toBe(false);
      expect(result.current.currentStreak).toBe(0);
      expect(result.current.nextBonusAmount).toBe(0);
      expect(result.current.hoursUntilEligible).toBe(0);
      expect(result.current.longestStreak).toBe(0);
      expect(result.current.totalBonusesClaimed).toBe(0);
      expect(result.current.totalBonusCoins).toBe(0);
    });
  });

  describe('state management', () => {
    it('should clear claim result', async () => {
      const { result } = renderHook(() => useDailyBonus());

      // Set some claim result
      act(() => {
        result.current.claimResult = { bonusAmount: 100 };
      });

      act(() => {
        result.current.clearClaimResult();
      });

      expect(result.current.claimResult).toBe(null);
    });

    it('should clear error', async () => {
      const { result } = renderHook(() => useDailyBonus());

      // Simulate an error
      fetch.mockRejectedValueOnce(new Error('Test error'));

      await waitFor(() => {
        expect(result.current.error).toBe('Network error occurred');
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });
});