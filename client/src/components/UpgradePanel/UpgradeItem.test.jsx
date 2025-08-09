import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import UpgradeItem from './UpgradeItem';

describe('UpgradeItem', () => {
  const mockFormatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const defaultUpgrade = {
    type: 'tap_multiplier',
    name: 'Tap Power',
    description: 'Increase coins earned per tap',
    category: 'tapping',
    currency: 'coins',
    currentLevel: 2,
    maxLevel: 100,
    currentEffect: 2,
    nextEffect: 3,
    effectIncrease: 1,
    currentCost: 100,
    nextCost: 115,
    canAfford: true,
    isMaxLevel: false,
    isAvailable: true
  };

  const defaultProps = {
    upgrade: defaultUpgrade,
    onPurchase: jest.fn(),
    loading: false,
    formatNumber: mockFormatNumber
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders upgrade item with basic information', () => {
    render(<UpgradeItem {...defaultProps} />);
    
    expect(screen.getByText('Tap Power')).toBeInTheDocument();
    expect(screen.getByText('Increase coins earned per tap')).toBeInTheDocument();
    expect(screen.getByText('Level')).toBeInTheDocument();
    expect(screen.getByText('/ 100')).toBeInTheDocument(); // Max level
  });

  it('displays correct category icon', () => {
    render(<UpgradeItem {...defaultProps} />);
    
    // Should show tapping icon (👆)
    expect(screen.getByText('👆')).toBeInTheDocument();
  });

  it('shows current and next effects', () => {
    render(<UpgradeItem {...defaultProps} />);
    
    expect(screen.getByText('Current Effect:')).toBeInTheDocument();
    expect(screen.getByText('Next Level:')).toBeInTheDocument();
    expect(screen.getByText('+1 coins per tap')).toBeInTheDocument();
  });

  it('displays progress bar correctly', () => {
    render(<UpgradeItem {...defaultProps} />);
    
    const progressFill = document.querySelector('.progress-fill');
    expect(progressFill).toHaveStyle({ width: '2%' }); // 2/100 = 2%
  });

  it('shows purchase button with correct cost', () => {
    render(<UpgradeItem {...defaultProps} />);
    
    expect(screen.getByText('Cost:')).toBeInTheDocument();
    expect(screen.getByText('💰 100')).toBeInTheDocument();
    expect(screen.getByText('Buy for 100')).toBeInTheDocument();
  });

  it('handles purchase button click', () => {
    const onPurchase = jest.fn();
    render(<UpgradeItem {...defaultProps} onPurchase={onPurchase} />);
    
    const purchaseButton = screen.getByText('Buy for 100');
    fireEvent.click(purchaseButton);
    
    expect(onPurchase).toHaveBeenCalledTimes(1);
  });

  it('shows disabled state when cannot afford', () => {
    const unaffordableUpgrade = {
      ...defaultUpgrade,
      canAfford: false
    };
    
    render(<UpgradeItem {...defaultProps} upgrade={unaffordableUpgrade} />);
    
    const purchaseButton = screen.getByText(/Need/);
    expect(purchaseButton).toBeDisabled();
    expect(purchaseButton).toHaveClass('cannot-afford');
  });

  it('shows max level state', () => {
    const maxLevelUpgrade = {
      ...defaultUpgrade,
      currentLevel: 100,
      isMaxLevel: true,
      isAvailable: false
    };
    
    render(<UpgradeItem {...defaultProps} upgrade={maxLevelUpgrade} />);
    
    const purchaseButton = screen.getByText('MAX LEVEL');
    expect(purchaseButton).toBeDisabled();
    expect(purchaseButton).toHaveClass('max-level');
    
    // Should not show next level effect
    expect(screen.queryByText('Next Level:')).not.toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<UpgradeItem {...defaultProps} loading={true} />);
    
    const purchaseButton = screen.getByText('Purchasing...');
    expect(purchaseButton).toBeDisabled();
    expect(purchaseButton).toHaveClass('loading');
  });

  it('displays next cost preview', () => {
    render(<UpgradeItem {...defaultProps} />);
    
    expect(screen.getByText('Next cost:')).toBeInTheDocument();
    expect(screen.getByText('💰 115')).toBeInTheDocument();
  });

  it('handles prestige currency correctly', () => {
    const prestigeUpgrade = {
      ...defaultUpgrade,
      currency: 'prestige_points',
      currentCost: 5
    };
    
    render(<UpgradeItem {...defaultProps} upgrade={prestigeUpgrade} />);
    
    expect(screen.getByText('👑 5')).toBeInTheDocument();
  });

  it('shows correct effect description for auto clicker', () => {
    const autoClickerUpgrade = {
      ...defaultUpgrade,
      type: 'auto_clicker',
      name: 'Auto Clicker',
      effectIncrease: 2
    };
    
    render(<UpgradeItem {...defaultProps} upgrade={autoClickerUpgrade} />);
    
    expect(screen.getByText('+2 coins/sec')).toBeInTheDocument();
  });

  it('shows correct effect description for golden tap chance', () => {
    const goldenTapUpgrade = {
      ...defaultUpgrade,
      type: 'golden_tap_chance',
      name: 'Golden Touch',
      effectIncrease: 0.001 // 0.1%
    };
    
    render(<UpgradeItem {...defaultProps} upgrade={goldenTapUpgrade} />);
    
    expect(screen.getByText('+0.1% golden tap chance')).toBeInTheDocument();
  });

  it('shows correct effect description for offline earnings', () => {
    const offlineUpgrade = {
      ...defaultUpgrade,
      type: 'offline_earnings',
      name: 'Offline Manager',
      effectIncrease: 0.5
    };
    
    render(<UpgradeItem {...defaultProps} upgrade={offlineUpgrade} />);
    
    expect(screen.getByText('+0.5 hours offline earnings')).toBeInTheDocument();
  });

  it('shows correct effect description for prestige multiplier', () => {
    const prestigeMultiplierUpgrade = {
      ...defaultUpgrade,
      type: 'prestige_multiplier',
      name: 'Prestige Boost',
      effectIncrease: 0.1 // 10%
    };
    
    render(<UpgradeItem {...defaultProps} upgrade={prestigeMultiplierUpgrade} />);
    
    expect(screen.getByText('+10% all earnings')).toBeInTheDocument();
  });

  it('shows "None" for current effect when level is 0', () => {
    const zeroLevelUpgrade = {
      ...defaultUpgrade,
      currentLevel: 0,
      currentEffect: 0
    };
    
    render(<UpgradeItem {...defaultProps} upgrade={zeroLevelUpgrade} />);
    
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('applies correct CSS classes based on affordability', () => {
    const { container } = render(<UpgradeItem {...defaultProps} />);
    
    const upgradeItem = container.querySelector('.upgrade-item');
    expect(upgradeItem).toHaveClass('affordable');
    expect(upgradeItem).toHaveClass('tapping');
  });

  it('applies unaffordable class when cannot afford', () => {
    const unaffordableUpgrade = {
      ...defaultUpgrade,
      canAfford: false
    };
    
    const { container } = render(<UpgradeItem {...defaultProps} upgrade={unaffordableUpgrade} />);
    
    const upgradeItem = container.querySelector('.upgrade-item');
    expect(upgradeItem).toHaveClass('unaffordable');
  });
});