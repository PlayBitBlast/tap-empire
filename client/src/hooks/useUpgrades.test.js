import { renderHook, act } from '@testing-library/react';
import useUpgrades from './useUpgrades';

// Mock the shared modules
jest.mock('../shared/constants/gameConfig', () => ({
  UPGRADE_CONFIGS: {
    tap_multiplier: {
      name: 'Tap Power',
      description: 'Increase coins earned per tap',
      category: 'tapping',
      maxLevel: 100
    },
    auto_clicker: {
      name: 'Auto Clicker',
      description: 'Automatically generate coins per second',
      category: 'automation',
      maxLevel: 50
    }
  }
}));

describe('useUpgrades', () => {
  let mockGameEngine;

  beforeEach(() => {
    mockGameEngine = {
      getState: jest.fn(() => ({
        coins: 1000,
        upgrades: {
          tap_multiplier: 2,
          auto_clicker: 1
        }
      })),
      getUpgradeInfo: jest.fn((type) => ({
        type,
        name: type === 'tap_multiplier' ? 'Tap Power' : 'Auto Clicker',
        description: 'Test description',
        category: type === 'tap_multiplier' ? 'tapping' : 'automation',
        currentLevel: type === 'tap_multiplier' ? 2 : 1,
        maxLevel: type === 'tap_multiplier' ? 100 : 50,
        currentCost: 100,
        currentEffect: type === 'tap_multiplier' ? 2 : 1,
        nextEffect: type === 'tap_multiplier' ? 3 : 2,
        effectIncrease: 1,
        canAfford: true,
        isMaxLevel: false
      })),
      purchaseUpgrade: jest.fn(),
      canAffordUpgrade: jest.fn(() => true),
      getUpgradeCost: jest.fn(() => 100),
      on: jest.fn(),
      off: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with empty upgrades', () => {
    const { result } = renderHook(() => useUpgrades(null));
    
    expect(result.current.upgrades).toEqual({});
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('updates upgrades when game engine is provided', () => {
    const { result } = renderHook(() => useUpgrades(mockGameEngine));
    
    expect(result.current.upgrades).toHaveProperty('tap_multiplier');
    expect(result.current.upgrades).toHaveProperty('auto_clicker');
    expect(mockGameEngine.getUpgradeInfo).toHaveBeenCalledWith('tap_multiplier');
    expect(mockGameEngine.getUpgradeInfo).toHaveBeenCalledWith('auto_clicker');
  });

  it('purchases upgrade successfully', async () => {
    mockGameEngine.purchaseUpgrade.mockResolvedValue({
      success: true,
      upgradeType: 'tap_multiplier',
      newLevel: 3,
      cost: 100
    });

    const { result } = renderHook(() => useUpgrades(mockGameEngine));
    
    await act(async () => {
      const purchaseResult = await result.current.purchaseUpgrade('tap_multiplier');
      expect(purchaseResult.success).toBe(true);
    });

    expect(mockGameEngine.purchaseUpgrade).toHaveBeenCalledWith('tap_multiplier');
    expect(result.current.purchaseHistory).toHaveLength(1);
    expect(result.current.purchaseHistory[0]).toMatchObject({
      upgradeType: 'tap_multiplier',
      cost: 100,
      level: 3
    });
  });

  it('handles purchase error', async () => {
    const error = new Error('Insufficient coins');
    mockGameEngine.purchaseUpgrade.mockRejectedValue(error);

    const { result } = renderHook(() => useUpgrades(mockGameEngine));
    
    await act(async () => {
      try {
        await result.current.purchaseUpgrade('tap_multiplier');
      } catch (e) {
        expect(e).toBe(error);
      }
    });

    expect(result.current.error).toBe('Insufficient coins');
    expect(result.current.loading).toBe(false);
  });

  it('prevents multiple simultaneous purchases', async () => {
    mockGameEngine.purchaseUpgrade.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );

    const { result } = renderHook(() => useUpgrades(mockGameEngine));
    
    // Start first purchase
    act(() => {
      result.current.purchaseUpgrade('tap_multiplier');
    });

    expect(result.current.loading).toBe(true);

    // Try second purchase while first is in progress
    const secondPurchase = await act(async () => {
      return await result.current.purchaseUpgrade('auto_clicker');
    });

    expect(secondPurchase).toBe(null);
  });

  it('checks if user can afford upgrade', () => {
    const { result } = renderHook(() => useUpgrades(mockGameEngine));
    
    const canAfford = result.current.canAffordUpgrade('tap_multiplier');
    
    expect(canAfford).toBe(true);
    expect(mockGameEngine.canAffordUpgrade).toHaveBeenCalledWith('tap_multiplier');
  });

  it('gets upgrade cost', () => {
    const { result } = renderHook(() => useUpgrades(mockGameEngine));
    
    const cost = result.current.getUpgradeCost('tap_multiplier');
    
    expect(cost).toBe(100);
    expect(mockGameEngine.getUpgradeCost).toHaveBeenCalledWith('tap_multiplier');
  });

  it('filters upgrades by category', () => {
    const { result } = renderHook(() => useUpgrades(mockGameEngine));
    
    const tappingUpgrades = result.current.getUpgradesByCategory('tapping');
    const allUpgrades = result.current.getUpgradesByCategory('all');
    
    expect(tappingUpgrades).toHaveLength(1);
    expect(tappingUpgrades[0].category).toBe('tapping');
    expect(allUpgrades).toHaveLength(2);
  });

  it('calculates upgrade statistics', () => {
    const { result } = renderHook(() => useUpgrades(mockGameEngine));
    
    const stats = result.current.getUpgradeStats();
    
    expect(stats.totalUpgrades).toBe(2);
    expect(stats.totalLevels).toBe(3); // 2 + 1
    expect(stats.maxedUpgrades).toBe(0);
    expect(stats.categories).toHaveProperty('tapping');
    expect(stats.categories).toHaveProperty('automation');
  });

  it('clears error state', () => {
    const { result } = renderHook(() => useUpgrades(mockGameEngine));
    
    // Set an error
    act(() => {
      result.current.error = 'Test error';
    });

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
  });

  it('clears purchase history', () => {
    const { result } = renderHook(() => useUpgrades(mockGameEngine));
    
    // Add some purchase history
    act(() => {
      result.current.purchaseHistory = [
        { upgradeType: 'tap_multiplier', timestamp: Date.now() }
      ];
    });

    act(() => {
      result.current.clearPurchaseHistory();
    });

    expect(result.current.purchaseHistory).toEqual([]);
  });

  it('sets up event listeners on mount', () => {
    renderHook(() => useUpgrades(mockGameEngine));
    
    expect(mockGameEngine.on).toHaveBeenCalledWith('upgrade:purchased', expect.any(Function));
    expect(mockGameEngine.on).toHaveBeenCalledWith('upgrade:reverted', expect.any(Function));
    expect(mockGameEngine.on).toHaveBeenCalledWith('coins:updated', expect.any(Function));
    expect(mockGameEngine.on).toHaveBeenCalledWith('state:loaded', expect.any(Function));
    expect(mockGameEngine.on).toHaveBeenCalledWith('state:corrected', expect.any(Function));
  });

  it('cleans up event listeners on unmount', () => {
    const { unmount } = renderHook(() => useUpgrades(mockGameEngine));
    
    unmount();
    
    expect(mockGameEngine.off).toHaveBeenCalledWith('upgrade:purchased', expect.any(Function));
    expect(mockGameEngine.off).toHaveBeenCalledWith('upgrade:reverted', expect.any(Function));
    expect(mockGameEngine.off).toHaveBeenCalledWith('coins:updated', expect.any(Function));
    expect(mockGameEngine.off).toHaveBeenCalledWith('state:loaded', expect.any(Function));
    expect(mockGameEngine.off).toHaveBeenCalledWith('state:corrected', expect.any(Function));
  });

  it('limits purchase history to 10 items', async () => {
    mockGameEngine.purchaseUpgrade.mockResolvedValue({
      success: true,
      upgradeType: 'tap_multiplier',
      newLevel: 3,
      cost: 100
    });

    const { result } = renderHook(() => useUpgrades(mockGameEngine));
    
    // Add 12 purchases
    for (let i = 0; i < 12; i++) {
      await act(async () => {
        await result.current.purchaseUpgrade('tap_multiplier');
      });
    }

    expect(result.current.purchaseHistory).toHaveLength(10);
  });

  it('handles game engine state updates', () => {
    const { result, rerender } = renderHook(() => useUpgrades(mockGameEngine));
    
    // Simulate state change
    mockGameEngine.getState.mockReturnValue({
      coins: 2000,
      upgrades: {
        tap_multiplier: 3,
        auto_clicker: 2
      }
    });

    // Trigger update
    act(() => {
      result.current.updateUpgrades();
    });

    expect(mockGameEngine.getUpgradeInfo).toHaveBeenCalled();
  });
});