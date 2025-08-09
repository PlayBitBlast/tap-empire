import { renderHook, act } from '@testing-library/react';
import usePrestige from './usePrestige';

// Mock the PrestigeService
const mockPrestigeService = {
  getPrestigeInfo: jest.fn(),
  checkPrestigeEligibility: jest.fn(),
  performPrestige: jest.fn(),
  getPrestigeUpgrades: jest.fn(),
  purchasePrestigeUpgrade: jest.fn(),
  getPrestigeStats: jest.fn(),
  getPrestigeLeaderboard: jest.fn(),
  getPrestigeProgress: jest.fn(),
  canPrestigeLocally: jest.fn(),
  calculatePrestigePoints: jest.fn(),
  formatPrestigePoints: jest.fn(),
  formatCoins: jest.fn(),
  getPrestigeLevelName: jest.fn(),
  calculatePrestigeProgress: jest.fn(),
  getPrestigeBenefits: jest.fn()
};

// Mock the PrestigeService constructor
jest.mock('../services/prestigeService', () => {
  return jest.fn().mockImplementation(() => mockPrestigeService);
});

describe('usePrestige', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => usePrestige());

    expect(result.current.prestigeInfo).toBeNull();
    expect(result.current.prestigeUpgrades).toBeNull();
    expect(result.current.prestigeStats).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isPrestiging).toBe(false);
    expect(result.current.isPurchasing).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should load prestige info on mount', async () => {
    const mockPrestigeInfo = {
      eligibility: { canPrestige: true },
      upgrades: { prestige_multiplier: { level: 1 } },
      stats: { prestigeLevel: 1 },
      progress: { currentLevel: 1 }
    };

    mockPrestigeService.getPrestigeInfo.mockResolvedValue(mockPrestigeInfo);

    const { result } = renderHook(() => usePrestige());

    // Wait for the effect to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockPrestigeService.getPrestigeInfo).toHaveBeenCalled();
    expect(result.current.prestigeInfo).toEqual(mockPrestigeInfo);
  });

  it('should handle prestige info loading error', async () => {
    const errorMessage = 'Failed to load prestige info';
    mockPrestigeService.getPrestigeInfo.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => usePrestige());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.error).toBe(errorMessage);
  });

  it('should check prestige eligibility', async () => {
    const mockEligibility = {
      canPrestige: true,
      requiredCoins: 1000000,
      currentTotalCoins: 1500000
    };

    mockPrestigeService.checkPrestigeEligibility.mockResolvedValue(mockEligibility);

    const { result } = renderHook(() => usePrestige());

    let eligibilityResult;
    await act(async () => {
      eligibilityResult = await result.current.checkPrestigeEligibility();
    });

    expect(mockPrestigeService.checkPrestigeEligibility).toHaveBeenCalled();
    expect(eligibilityResult).toEqual(mockEligibility);
  });

  it('should perform prestige successfully', async () => {
    const mockPrestigeResult = {
      success: true,
      newPrestigeLevel: 2,
      prestigePointsEarned: 1000
    };

    const mockPrestigeInfo = {
      eligibility: { canPrestige: false },
      upgrades: {},
      stats: { prestigeLevel: 2 },
      progress: { currentLevel: 2 }
    };

    mockPrestigeService.performPrestige.mockResolvedValue(mockPrestigeResult);
    mockPrestigeService.getPrestigeInfo.mockResolvedValue(mockPrestigeInfo);

    const { result } = renderHook(() => usePrestige());

    let prestigeResult;
    await act(async () => {
      prestigeResult = await result.current.performPrestige();
    });

    expect(mockPrestigeService.performPrestige).toHaveBeenCalled();
    expect(prestigeResult).toEqual(mockPrestigeResult);
    expect(result.current.isPrestiging).toBe(false);
  });

  it('should handle prestige error', async () => {
    const errorMessage = 'Insufficient coins';
    mockPrestigeService.performPrestige.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => usePrestige());

    await act(async () => {
      try {
        await result.current.performPrestige();
      } catch (error) {
        expect(error.message).toBe(errorMessage);
      }
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.isPrestiging).toBe(false);
  });

  it('should purchase prestige upgrade', async () => {
    const mockPurchaseResult = {
      success: true,
      upgrade: {
        type: 'prestige_multiplier',
        name: 'Prestige Boost',
        newLevel: 3
      }
    };

    const mockUpgrades = {
      upgrades: {
        prestige_multiplier: { level: 3 }
      }
    };

    mockPrestigeService.purchasePrestigeUpgrade.mockResolvedValue(mockPurchaseResult);
    mockPrestigeService.getPrestigeUpgrades.mockResolvedValue(mockUpgrades);

    const { result } = renderHook(() => usePrestige());

    let purchaseResult;
    await act(async () => {
      purchaseResult = await result.current.purchasePrestigeUpgrade('prestige_multiplier');
    });

    expect(mockPrestigeService.purchasePrestigeUpgrade).toHaveBeenCalledWith('prestige_multiplier');
    expect(mockPrestigeService.getPrestigeUpgrades).toHaveBeenCalled();
    expect(purchaseResult).toEqual(mockPurchaseResult);
    expect(result.current.isPurchasing).toBe(false);
  });

  it('should load prestige leaderboard', async () => {
    const mockLeaderboard = {
      leaderboard: [
        { rank: 1, name: 'Player1', prestigeLevel: 5 },
        { rank: 2, name: 'Player2', prestigeLevel: 4 }
      ]
    };

    mockPrestigeService.getPrestigeLeaderboard.mockResolvedValue(mockLeaderboard);

    const { result } = renderHook(() => usePrestige());

    let leaderboardResult;
    await act(async () => {
      leaderboardResult = await result.current.loadPrestigeLeaderboard(50);
    });

    expect(mockPrestigeService.getPrestigeLeaderboard).toHaveBeenCalledWith(50);
    expect(leaderboardResult).toEqual(mockLeaderboard);
    expect(result.current.prestigeLeaderboard).toEqual(mockLeaderboard);
  });

  it('should clear error state', () => {
    const { result } = renderHook(() => usePrestige());

    // Set an error first
    act(() => {
      result.current.error = 'Some error';
    });

    // Clear the error
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('should use helper functions from service', () => {
    mockPrestigeService.canPrestigeLocally.mockReturnValue(true);
    mockPrestigeService.calculatePrestigePoints.mockReturnValue(1000);
    mockPrestigeService.formatPrestigePoints.mockReturnValue('1K');
    mockPrestigeService.formatCoins.mockReturnValue('1M');
    mockPrestigeService.getPrestigeLevelName.mockReturnValue('Master');
    mockPrestigeService.calculatePrestigeProgress.mockReturnValue(75);
    mockPrestigeService.getPrestigeBenefits.mockReturnValue('+50% earnings');

    const { result } = renderHook(() => usePrestige());

    expect(result.current.canPrestigeLocally(1000000)).toBe(true);
    expect(result.current.calculatePrestigePoints(1000000)).toBe(1000);
    expect(result.current.formatPrestigePoints(1000)).toBe('1K');
    expect(result.current.formatCoins(1000000)).toBe('1M');
    expect(result.current.getPrestigeLevelName(5)).toBe('Master');
    expect(result.current.calculatePrestigeProgress(750000, 1000000)).toBe(75);
    expect(result.current.getPrestigeBenefits(3)).toBe('+50% earnings');
  });

  it('should refresh all prestige data', async () => {
    const mockPrestigeInfo = { eligibility: { canPrestige: true } };
    const mockLeaderboard = { leaderboard: [] };

    mockPrestigeService.getPrestigeInfo.mockResolvedValue(mockPrestigeInfo);
    mockPrestigeService.getPrestigeLeaderboard.mockResolvedValue(mockLeaderboard);

    const { result } = renderHook(() => usePrestige());

    await act(async () => {
      await result.current.refreshPrestigeData();
    });

    expect(mockPrestigeService.getPrestigeInfo).toHaveBeenCalled();
    expect(mockPrestigeService.getPrestigeLeaderboard).toHaveBeenCalled();
  });
});