import { renderHook, act } from '@testing-library/react';
import useAchievements from './useAchievements';
import AchievementService from '../services/achievementService';

// Mock the achievement service
jest.mock('../services/achievementService');

describe('useAchievements', () => {
  let mockAchievementService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock service instance
    mockAchievementService = {
      getUserAchievements: jest.fn(),
      getUserAchievementStats: jest.fn(),
      trackMilestone: jest.fn(),
      shareAchievement: jest.fn(),
      getProgressDisplay: jest.fn(),
      getCategoryIcon: jest.fn(),
      getRarityColor: jest.fn(),
      addAchievementListener: jest.fn(),
      removeAchievementListener: jest.fn()
    };

    // Mock the constructor to return our mock instance
    AchievementService.mockImplementation(() => mockAchievementService);
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useAchievements());

    expect(result.current.loading).toBe(true);
    expect(result.current.achievements).toEqual({});
    expect(result.current.stats).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.newAchievements).toEqual([]);
  });

  it('should load achievements on mount', async () => {
    const mockAchievements = {
      tapping: {
        name: 'Tapping Master',
        achievements: [
          { id: 1, name: 'First Tap', isUnlocked: true }
        ]
      }
    };
    const mockStats = {
      unlocked_achievements: 1,
      total_achievements: 10
    };

    mockAchievementService.getUserAchievements.mockResolvedValue(mockAchievements);
    mockAchievementService.getUserAchievementStats.mockResolvedValue(mockStats);

    const { result, waitForNextUpdate } = renderHook(() => useAchievements());

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.achievements).toEqual(mockAchievements);
    expect(result.current.stats).toEqual(mockStats);
    expect(result.current.error).toBeNull();
  });

  it('should handle loading errors', async () => {
    const error = new Error('Network error');
    mockAchievementService.getUserAchievements.mockRejectedValue(error);
    mockAchievementService.getUserAchievementStats.mockRejectedValue(error);

    const { result, waitForNextUpdate } = renderHook(() => useAchievements());

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Network error');
  });

  it('should track milestones and update achievements', async () => {
    const mockAchievements = {
      tapping: {
        name: 'Tapping Master',
        achievements: []
      }
    };
    const mockStats = {};
    const mockNewAchievements = [
      { id: 1, name: 'First Tap' }
    ];

    mockAchievementService.getUserAchievements.mockResolvedValue(mockAchievements);
    mockAchievementService.getUserAchievementStats.mockResolvedValue(mockStats);
    mockAchievementService.trackMilestone.mockResolvedValue(mockNewAchievements);

    const { result, waitForNextUpdate } = renderHook(() => useAchievements());

    await waitForNextUpdate();

    await act(async () => {
      const newUnlocks = await result.current.trackMilestone('tap', 1);
      expect(newUnlocks).toEqual(mockNewAchievements);
    });

    expect(mockAchievementService.trackMilestone).toHaveBeenCalledWith('tap', 1);
    expect(result.current.newAchievements).toEqual(mockNewAchievements);
  });

  it('should share achievements', async () => {
    const mockShareData = {
      text: 'I unlocked an achievement!',
      url: 'https://t.me/game'
    };

    mockAchievementService.getUserAchievements.mockResolvedValue({});
    mockAchievementService.getUserAchievementStats.mockResolvedValue({});
    mockAchievementService.shareAchievement.mockResolvedValue(mockShareData);

    const { result, waitForNextUpdate } = renderHook(() => useAchievements());

    await waitForNextUpdate();

    await act(async () => {
      const shareData = await result.current.shareAchievement(1);
      expect(shareData).toEqual(mockShareData);
    });

    expect(mockAchievementService.shareAchievement).toHaveBeenCalledWith(1);
  });

  it('should dismiss achievements', async () => {
    mockAchievementService.getUserAchievements.mockResolvedValue({});
    mockAchievementService.getUserAchievementStats.mockResolvedValue({});

    const { result, waitForNextUpdate } = renderHook(() => useAchievements());

    await waitForNextUpdate();

    // Add a new achievement
    act(() => {
      result.current.newAchievements.push({ id: 1, name: 'Test Achievement' });
    });

    // Dismiss it
    act(() => {
      result.current.dismissAchievement(1);
    });

    expect(result.current.newAchievements).toEqual([]);
  });

  it('should clear all new achievements', async () => {
    mockAchievementService.getUserAchievements.mockResolvedValue({});
    mockAchievementService.getUserAchievementStats.mockResolvedValue({});

    const { result, waitForNextUpdate } = renderHook(() => useAchievements());

    await waitForNextUpdate();

    // Add multiple new achievements
    act(() => {
      result.current.newAchievements.push(
        { id: 1, name: 'Achievement 1' },
        { id: 2, name: 'Achievement 2' }
      );
    });

    // Clear all
    act(() => {
      result.current.clearNewAchievements();
    });

    expect(result.current.newAchievements).toEqual([]);
  });

  it('should get achievements by category', async () => {
    const mockAchievements = {
      tapping: {
        name: 'Tapping Master',
        achievements: [
          { id: 1, name: 'First Tap' },
          { id: 2, name: 'Tap Novice' }
        ]
      },
      earnings: {
        name: 'Coin Collector',
        achievements: [
          { id: 3, name: 'First Coin' }
        ]
      }
    };

    mockAchievementService.getUserAchievements.mockResolvedValue(mockAchievements);
    mockAchievementService.getUserAchievementStats.mockResolvedValue({});

    const { result, waitForNextUpdate } = renderHook(() => useAchievements());

    await waitForNextUpdate();

    const tappingAchievements = result.current.getAchievementsByCategory('tapping');
    expect(tappingAchievements).toHaveLength(2);
    expect(tappingAchievements[0].name).toBe('First Tap');

    const nonExistentCategory = result.current.getAchievementsByCategory('nonexistent');
    expect(nonExistentCategory).toEqual([]);
  });

  it('should calculate completion percentage', async () => {
    const mockAchievements = {
      tapping: {
        achievements: [
          { id: 1, isUnlocked: true },
          { id: 2, isUnlocked: false }
        ]
      },
      earnings: {
        achievements: [
          { id: 3, isUnlocked: true },
          { id: 4, isUnlocked: true }
        ]
      }
    };

    mockAchievementService.getUserAchievements.mockResolvedValue(mockAchievements);
    mockAchievementService.getUserAchievementStats.mockResolvedValue({});

    const { result, waitForNextUpdate } = renderHook(() => useAchievements());

    await waitForNextUpdate();

    const completionPercentage = result.current.getCompletionPercentage();
    expect(completionPercentage).toBe(75); // 3 out of 4 achievements unlocked
  });

  it('should check if user has specific achievement', async () => {
    const mockAchievements = {
      tapping: {
        achievements: [
          { id: 1, isUnlocked: true },
          { id: 2, isUnlocked: false }
        ]
      }
    };

    mockAchievementService.getUserAchievements.mockResolvedValue(mockAchievements);
    mockAchievementService.getUserAchievementStats.mockResolvedValue({});

    const { result, waitForNextUpdate } = renderHook(() => useAchievements());

    await waitForNextUpdate();

    expect(result.current.hasAchievement(1)).toBe(true);
    expect(result.current.hasAchievement(2)).toBe(false);
    expect(result.current.hasAchievement(999)).toBe(false);
  });

  it('should get recent achievements', async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const mockAchievements = {
      tapping: {
        achievements: [
          { id: 1, isUnlocked: true, unlocked_at: now.toISOString() },
          { id: 2, isUnlocked: true, unlocked_at: yesterday.toISOString() },
          { id: 3, isUnlocked: false }
        ]
      }
    };

    mockAchievementService.getUserAchievements.mockResolvedValue(mockAchievements);
    mockAchievementService.getUserAchievementStats.mockResolvedValue({});

    const { result, waitForNextUpdate } = renderHook(() => useAchievements());

    await waitForNextUpdate();

    const recentAchievements = result.current.getRecentAchievements();
    expect(recentAchievements).toHaveLength(2);
    expect(recentAchievements[0].id).toBe(1); // Most recent first
    expect(recentAchievements[1].id).toBe(2);
  });

  it('should get next achievements to unlock', async () => {
    const mockAchievements = {
      tapping: {
        achievements: [
          { id: 1, isUnlocked: true, progressPercentage: 100 },
          { id: 2, isUnlocked: false, progressPercentage: 80 },
          { id: 3, isUnlocked: false, progressPercentage: 60 },
          { id: 4, isUnlocked: false, progressPercentage: 0 }
        ]
      }
    };

    mockAchievementService.getUserAchievements.mockResolvedValue(mockAchievements);
    mockAchievementService.getUserAchievementStats.mockResolvedValue({});

    const { result, waitForNextUpdate } = renderHook(() => useAchievements());

    await waitForNextUpdate();

    const nextAchievements = result.current.getNextAchievements(2);
    expect(nextAchievements).toHaveLength(2);
    expect(nextAchievements[0].id).toBe(2); // Highest progress first
    expect(nextAchievements[1].id).toBe(3);
  });
});