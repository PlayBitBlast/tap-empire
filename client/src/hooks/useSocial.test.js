import { renderHook, act } from '@testing-library/react';
import { useSocial } from './useSocial';
import socialService from '../services/socialService';

// Mock the social service
jest.mock('../services/socialService');

describe('useSocial', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useSocial());

      expect(result.current.friends).toEqual([]);
      expect(result.current.receivedGifts).toEqual([]);
      expect(result.current.socialStats).toBeNull();
      expect(result.current.friendActivity).toEqual([]);
      expect(result.current.friendSuggestions).toEqual([]);
      expect(result.current.loading).toBe(true); // Loading starts immediately
      expect(result.current.error).toBeNull();
    });

    it('should load initial data on mount', async () => {
      const mockFriends = [{ id: 1, displayName: 'John Doe' }];
      const mockGifts = [{ id: 1, amount: 100 }];
      const mockStats = { friendsCount: 1 };
      const mockActivity = [{ activity_type: 'achievement' }];
      const mockSuggestions = [{ id: 2, displayName: 'Jane Smith' }];

      socialService.getFriends.mockResolvedValue(mockFriends);
      socialService.getReceivedGifts.mockResolvedValue(mockGifts);
      socialService.getSocialStats.mockResolvedValue(mockStats);
      socialService.getFriendActivity.mockResolvedValue(mockActivity);
      socialService.getFriendSuggestions.mockResolvedValue(mockSuggestions);

      const { result } = renderHook(() => useSocial());

      // Wait for initial data loading
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.friends).toEqual(mockFriends);
      expect(result.current.receivedGifts).toEqual(mockGifts);
      expect(result.current.socialStats).toEqual(mockStats);
      expect(result.current.friendActivity).toEqual(mockActivity);
      expect(result.current.friendSuggestions).toEqual(mockSuggestions);
    });
  });

  describe('loadFriends', () => {
    it('should load friends successfully', async () => {
      const mockFriends = [
        { id: 1, displayName: 'John Doe', totalCoins: 5000 }
      ];

      socialService.getFriends.mockResolvedValue(mockFriends);

      const { result } = renderHook(() => useSocial());

      await act(async () => {
        await result.current.loadFriends();
      });

      expect(socialService.getFriends).toHaveBeenCalled();
      expect(result.current.friends).toEqual(mockFriends);
      expect(result.current.error).toBeNull();
    });

    it('should handle loading errors', async () => {
      const error = new Error('Failed to load friends');
      socialService.getFriends.mockRejectedValue(error);

      const { result } = renderHook(() => useSocial());

      await act(async () => {
        await result.current.loadFriends();
      });

      expect(result.current.error).toBe('Failed to load friends');
      expect(result.current.friends).toEqual([]);
    });
  });

  describe('sendGift', () => {
    it('should send gift successfully', async () => {
      const mockResult = {
        gift: { id: 1, amount: 100 },
        remainingGifts: 4
      };

      const mockStats = { friendsCount: 1, remainingDailyGifts: 4 };

      socialService.sendGift.mockResolvedValue(mockResult);
      socialService.getSocialStats.mockResolvedValue(mockStats);

      const { result } = renderHook(() => useSocial());

      let giftResult;
      await act(async () => {
        giftResult = await result.current.sendGift(2, 100, 'Test gift');
      });

      expect(socialService.sendGift).toHaveBeenCalledWith(2, 100, 'Test gift');
      expect(socialService.getSocialStats).toHaveBeenCalled();
      expect(giftResult).toEqual(mockResult);
      expect(result.current.error).toBeNull();
    });

    it('should handle send gift errors', async () => {
      const error = new Error('Insufficient coins');
      socialService.sendGift.mockRejectedValue(error);

      const { result } = renderHook(() => useSocial());

      await act(async () => {
        try {
          await result.current.sendGift(2, 100);
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Insufficient coins');
    });
  });

  describe('claimGift', () => {
    it('should claim gift successfully', async () => {
      const mockResult = {
        gift: { id: 1, amount: 100 },
        coinsReceived: 100
      };

      const mockGifts = [];
      const mockStats = { friendsCount: 1 };

      socialService.claimGift.mockResolvedValue(mockResult);
      socialService.getReceivedGifts.mockResolvedValue(mockGifts);
      socialService.getSocialStats.mockResolvedValue(mockStats);

      const { result } = renderHook(() => useSocial());

      let claimResult;
      await act(async () => {
        claimResult = await result.current.claimGift(1);
      });

      expect(socialService.claimGift).toHaveBeenCalledWith(1);
      expect(socialService.getReceivedGifts).toHaveBeenCalled();
      expect(socialService.getSocialStats).toHaveBeenCalled();
      expect(claimResult).toEqual(mockResult);
      expect(result.current.receivedGifts).toEqual(mockGifts);
    });

    it('should handle claim gift errors', async () => {
      const error = new Error('Gift not found');
      socialService.claimGift.mockRejectedValue(error);

      const { result } = renderHook(() => useSocial());

      await act(async () => {
        try {
          await result.current.claimGift(1);
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Gift not found');
    });
  });

  describe('importTelegramFriends', () => {
    it('should import friends successfully', async () => {
      const telegramFriends = [
        { id: 123456789, first_name: 'John', username: 'john_doe' }
      ];

      const mockResult = {
        imported: 1,
        existing: 0,
        notFound: 0,
        errors: []
      };

      const mockFriends = [
        { id: 2, displayName: 'John Doe' }
      ];

      socialService.importTelegramFriends.mockResolvedValue(mockResult);
      socialService.getFriends.mockResolvedValue(mockFriends);

      const { result } = renderHook(() => useSocial());

      let importResult;
      await act(async () => {
        importResult = await result.current.importTelegramFriends(telegramFriends);
      });

      expect(socialService.importTelegramFriends).toHaveBeenCalledWith(telegramFriends);
      expect(socialService.getFriends).toHaveBeenCalled();
      expect(importResult).toEqual(mockResult);
      expect(result.current.friends).toEqual(mockFriends);
    });
  });

  describe('addFriend', () => {
    it('should add friend successfully', async () => {
      const mockResult = {
        success: true,
        friend: { id: 2, displayName: 'Jane Doe' }
      };

      const mockFriends = [
        { id: 1, displayName: 'John Doe' },
        { id: 2, displayName: 'Jane Doe' }
      ];

      const mockSuggestions = [];

      socialService.addFriend.mockResolvedValue(mockResult);
      socialService.getFriends.mockResolvedValue(mockFriends);
      socialService.getFriendSuggestions.mockResolvedValue(mockSuggestions);

      const { result } = renderHook(() => useSocial());

      let addResult;
      await act(async () => {
        addResult = await result.current.addFriend(2);
      });

      expect(socialService.addFriend).toHaveBeenCalledWith(2);
      expect(socialService.getFriends).toHaveBeenCalled();
      expect(socialService.getFriendSuggestions).toHaveBeenCalled();
      expect(addResult).toEqual(mockResult);
      expect(result.current.friends).toEqual(mockFriends);
    });
  });

  describe('removeFriend', () => {
    it('should remove friend successfully', async () => {
      const mockResult = { success: true };
      const mockFriends = [];

      socialService.removeFriend.mockResolvedValue(mockResult);
      socialService.getFriends.mockResolvedValue(mockFriends);

      const { result } = renderHook(() => useSocial());

      let removeResult;
      await act(async () => {
        removeResult = await result.current.removeFriend(2);
      });

      expect(socialService.removeFriend).toHaveBeenCalledWith(2);
      expect(socialService.getFriends).toHaveBeenCalled();
      expect(removeResult).toEqual(mockResult);
      expect(result.current.friends).toEqual(mockFriends);
    });
  });

  describe('validateGiftSending', () => {
    it('should validate gift sending successfully', async () => {
      const mockValidation = {
        canSend: true,
        remainingGifts: 3
      };

      socialService.validateGiftSending.mockResolvedValue(mockValidation);

      const { result } = renderHook(() => useSocial());

      let validationResult;
      await act(async () => {
        validationResult = await result.current.validateGiftSending(2);
      });

      expect(socialService.validateGiftSending).toHaveBeenCalledWith(2);
      expect(validationResult).toEqual(mockValidation);
    });
  });

  describe('getFriendsLeaderboard', () => {
    it('should get friends leaderboard successfully', async () => {
      const mockLeaderboard = [
        { rank: 1, id: 2, displayName: 'John Doe', totalCoins: 10000 }
      ];

      socialService.getFriendsLeaderboard.mockResolvedValue(mockLeaderboard);

      const { result } = renderHook(() => useSocial());

      let leaderboardResult;
      await act(async () => {
        leaderboardResult = await result.current.getFriendsLeaderboard(10);
      });

      expect(socialService.getFriendsLeaderboard).toHaveBeenCalledWith(10);
      expect(leaderboardResult).toEqual(mockLeaderboard);
    });
  });

  describe('utility functions', () => {
    it('should provide utility functions from service', () => {
      const { result } = renderHook(() => useSocial());

      expect(typeof result.current.formatDisplayName).toBe('function');
      expect(typeof result.current.formatCoins).toBe('function');
      expect(typeof result.current.getActivityStatusColor).toBe('function');
      expect(typeof result.current.getActivityStatusText).toBe('function');
    });
  });

  describe('refreshSocialData', () => {
    it('should refresh all social data', async () => {
      const mockFriends = [{ id: 1, displayName: 'John Doe' }];
      const mockGifts = [{ id: 1, amount: 100 }];
      const mockStats = { friendsCount: 1 };
      const mockActivity = [{ activity_type: 'achievement' }];
      const mockSuggestions = [{ id: 2, displayName: 'Jane Smith' }];

      socialService.getFriends.mockResolvedValue(mockFriends);
      socialService.getReceivedGifts.mockResolvedValue(mockGifts);
      socialService.getSocialStats.mockResolvedValue(mockStats);
      socialService.getFriendActivity.mockResolvedValue(mockActivity);
      socialService.getFriendSuggestions.mockResolvedValue(mockSuggestions);

      const { result } = renderHook(() => useSocial());

      await act(async () => {
        await result.current.refreshSocialData();
      });

      expect(socialService.getFriends).toHaveBeenCalled();
      expect(socialService.getReceivedGifts).toHaveBeenCalled();
      expect(socialService.getSocialStats).toHaveBeenCalled();
      expect(socialService.getFriendActivity).toHaveBeenCalled();
      expect(socialService.getFriendSuggestions).toHaveBeenCalled();
    });
  });
});