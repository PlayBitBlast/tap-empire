import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import UpgradePanel from './UpgradePanel';
import { UPGRADE_CONFIGS } from '../../shared/constants/gameConfig';

// Mock the game engine
const mockGameEngine = {
  purchaseUpgrade: jest.fn(),
  getUpgradeInfo: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
};

// Mock the shared modules
jest.mock('../../shared/constants/gameConfig', () => ({
  UPGRADE_CONFIGS: {
    tap_multiplier: {
      name: 'Tap Power',
      description: 'Increase coins earned per tap',
      category: 'tapping',
      maxLevel: 100,
      currency: 'coins'
    },
    auto_clicker: {
      name: 'Auto Clicker',
      description: 'Automatically generate coins per second',
      category: 'automation',
      maxLevel: 50,
      currency: 'coins'
    }
  }
}));

jest.mock('../../shared/utils/calculations', () => ({
  calculateUpgradeCost: jest.fn((type, level) => {
    const baseCosts = { tap_multiplier: 10, auto_clicker: 100 };
    return baseCosts[type] * Math.pow(1.15, level);
  }),
  calculateUpgradeEffect: jest.fn((type, level) => {
    const baseEffects = { tap_multiplier: 1, auto_clicker: 1 };
    return baseEffects[type] * level;
  })
}));

describe('UpgradePanel', () => {
  const defaultProps = {
    gameEngine: mockGameEngine,
    userCoins: 1000,
    userUpgrades: {
      tap_multiplier: 2,
      auto_clicker: 1
    },
    onUpgradePurchase: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders upgrade panel with header', () => {
    render(<UpgradePanel {...defaultProps} />);
    
    expect(screen.getByText('Upgrades')).toBeInTheDocument();
    expect(screen.getByText('💰 1K')).toBeInTheDocument();
  });

  it('displays category filter buttons', () => {
    render(<UpgradePanel {...defaultProps} />);
    
    expect(screen.getByText('All Upgrades')).toBeInTheDocument();
    expect(screen.getByText('Tapping')).toBeInTheDocument();
    expect(screen.getByText('Auto-Clickers')).toBeInTheDocument();
    expect(screen.getByText('Special')).toBeInTheDocument();
    expect(screen.getByText('Prestige')).toBeInTheDocument();
  });

  it('displays sort options', () => {
    render(<UpgradePanel {...defaultProps} />);
    
    expect(screen.getByText('Sort by:')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Cost (Low to High)')).toBeInTheDocument();
  });

  it('displays upgrade items', () => {
    render(<UpgradePanel {...defaultProps} />);
    
    expect(screen.getByText('Tap Power')).toBeInTheDocument();
    expect(screen.getByText('Auto Clicker')).toBeInTheDocument();
  });

  it('filters upgrades by category', () => {
    render(<UpgradePanel {...defaultProps} />);
    
    // Click on tapping category
    fireEvent.click(screen.getByText('Tapping'));
    
    expect(screen.getByText('Tap Power')).toBeInTheDocument();
    expect(screen.queryByText('Auto Clicker')).not.toBeInTheDocument();
  });

  it('sorts upgrades correctly', () => {
    render(<UpgradePanel {...defaultProps} />);
    
    // Change sort to name
    const sortSelect = screen.getByDisplayValue('Cost (Low to High)');
    fireEvent.change(sortSelect, { target: { value: 'name' } });
    
    expect(sortSelect.value).toBe('name');
  });

  it('handles upgrade purchase', async () => {
    mockGameEngine.purchaseUpgrade.mockResolvedValue({
      success: true,
      upgradeType: 'tap_multiplier',
      newLevel: 3
    });

    render(<UpgradePanel {...defaultProps} />);
    
    // Find and click a purchase button
    const purchaseButtons = screen.getAllByText(/Buy for/);
    fireEvent.click(purchaseButtons[0]);
    
    await waitFor(() => {
      expect(mockGameEngine.purchaseUpgrade).toHaveBeenCalled();
    });
  });

  it('displays upgrade statistics', () => {
    render(<UpgradePanel {...defaultProps} />);
    
    expect(screen.getByText('Total Upgrades:')).toBeInTheDocument();
    expect(screen.getByText('Upgrade Types:')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // 2 + 1 = 3 total levels
    expect(screen.getByText('2 / 2')).toBeInTheDocument(); // 2 types out of 2
  });

  it('handles loading state during purchase', async () => {
    mockGameEngine.purchaseUpgrade.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<UpgradePanel {...defaultProps} />);
    
    const purchaseButtons = screen.getAllByText(/Buy for/);
    fireEvent.click(purchaseButtons[0]);
    
    // Should show loading state
    expect(screen.getByText('Purchasing...')).toBeInTheDocument();
  });

  it('handles purchase error', async () => {
    mockGameEngine.purchaseUpgrade.mockRejectedValue(new Error('Insufficient coins'));

    render(<UpgradePanel {...defaultProps} />);
    
    const purchaseButtons = screen.getAllByText(/Buy for/);
    fireEvent.click(purchaseButtons[0]);
    
    await waitFor(() => {
      expect(mockGameEngine.purchaseUpgrade).toHaveBeenCalled();
    });
  });

  it('formats large numbers correctly', () => {
    const propsWithLargeCoins = {
      ...defaultProps,
      userCoins: 1500000
    };

    render(<UpgradePanel {...propsWithLargeCoins} />);
    
    expect(screen.getByText('💰 1.5M')).toBeInTheDocument();
  });

  it('shows no upgrades message when filtered category is empty', () => {
    const propsWithNoUpgrades = {
      ...defaultProps,
      userUpgrades: {}
    };

    render(<UpgradePanel {...propsWithNoUpgrades} />);
    
    // Filter to a category with no upgrades
    fireEvent.click(screen.getByText('Special'));
    
    expect(screen.getByText('No upgrades available in this category.')).toBeInTheDocument();
  });

  it('calls onUpgradePurchase callback when provided', async () => {
    mockGameEngine.purchaseUpgrade.mockResolvedValue({
      success: true,
      upgradeType: 'tap_multiplier',
      newLevel: 3
    });

    const onUpgradePurchase = jest.fn();
    render(<UpgradePanel {...defaultProps} onUpgradePurchase={onUpgradePurchase} />);
    
    const purchaseButtons = screen.getAllByText(/Buy for/);
    fireEvent.click(purchaseButtons[0]);
    
    await waitFor(() => {
      expect(onUpgradePurchase).toHaveBeenCalled();
    });
  });
});