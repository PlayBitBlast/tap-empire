import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DailyBonusModal from './DailyBonusModal';
import { useDailyBonus } from '../../hooks/useDailyBonus';

// Mock the useDailyBonus hook
jest.mock('../../hooks/useDailyBonus');

describe('DailyBonusModal', () => {
  const mockOnClose = jest.fn();
  
  const defaultMockHook = {
    bonusStatus: {
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
    },
    isLoading: false,
    error: null,
    claimResult: null,
    claimDailyBonus: jest.fn(),
    clearClaimResult: jest.fn(),
    clearError: jest.fn(),
    canClaimBonus: true,
    currentStreak: 3,
    nextBonusAmount: 250,
    hoursUntilEligible: 0,
    longestStreak: 5,
    totalBonusesClaimed: 10
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useDailyBonus.mockReturnValue(defaultMockHook);
  });

  it('should not render when isOpen is false', () => {
    render(<DailyBonusModal isOpen={false} onClose={mockOnClose} />);
    
    expect(screen.queryByText('Daily Bonus')).not.toBeInTheDocument();
  });

  it('should render modal when isOpen is true', () => {
    render(<DailyBonusModal isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('Daily Bonus')).toBeInTheDocument();
    expect(screen.getByText('Current Streak')).toBeInTheDocument();
    expect(screen.getByText('3 days')).toBeInTheDocument();
  });

  it('should display loading state', () => {
    useDailyBonus.mockReturnValue({
      ...defaultMockHook,
      isLoading: true,
      bonusStatus: null
    });

    render(<DailyBonusModal isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('Loading bonus information...')).toBeInTheDocument();
  });

  it('should display error state', () => {
    useDailyBonus.mockReturnValue({
      ...defaultMockHook,
      error: 'Network error occurred',
      bonusStatus: null
    });

    render(<DailyBonusModal isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('Network error occurred')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('should display streak progress correctly', () => {
    render(<DailyBonusModal isOpen={true} onClose={mockOnClose} />);
    
    // Check that days 1-3 are completed (current streak is 3)
    const progressDays = screen.getAllByText(/^[1-7]$/);
    expect(progressDays).toHaveLength(7);
    
    // Check streak multiplier display
    expect(screen.getByText('2x multiplier')).toBeInTheDocument();
  });

  it('should show claim button when bonus is available', () => {
    render(<DailyBonusModal isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('Claim Bonus')).toBeInTheDocument();
    expect(screen.getByText('250 coins')).toBeInTheDocument();
  });

  it('should show unavailable state when bonus cannot be claimed', () => {
    useDailyBonus.mockReturnValue({
      ...defaultMockHook,
      canClaimBonus: false,
      hoursUntilEligible: 5,
      bonusStatus: {
        ...defaultMockHook.bonusStatus,
        eligibility: {
          eligible: false,
          hoursUntilEligible: 5
        }
      }
    });

    render(<DailyBonusModal isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('Available in: 5 hours')).toBeInTheDocument();
    expect(screen.queryByText('Claim Bonus')).not.toBeInTheDocument();
  });

  it('should handle claim bonus click', async () => {
    const mockClaimDailyBonus = jest.fn().mockResolvedValue({
      bonusAmount: 250,
      streakDay: 4,
      multiplier: 2.5,
      isNewStreak: false
    });

    useDailyBonus.mockReturnValue({
      ...defaultMockHook,
      claimDailyBonus: mockClaimDailyBonus
    });

    render(<DailyBonusModal isOpen={true} onClose={mockOnClose} />);
    
    const claimButton = screen.getByText('Claim Bonus');
    fireEvent.click(claimButton);

    expect(mockClaimDailyBonus).toHaveBeenCalled();
  });

  it('should display celebration overlay when bonus is claimed', () => {
    useDailyBonus.mockReturnValue({
      ...defaultMockHook,
      claimResult: {
        bonusAmount: 250,
        streakDay: 4,
        multiplier: 2.5,
        isNewStreak: false
      }
    });

    render(<DailyBonusModal isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('Bonus Claimed!')).toBeInTheDocument();
    expect(screen.getByText('+250 coins')).toBeInTheDocument();
    expect(screen.getByText('Streak continues! Day 4 (2.5x multiplier)')).toBeInTheDocument();
  });

  it('should display new streak message when streak is reset', () => {
    useDailyBonus.mockReturnValue({
      ...defaultMockHook,
      claimResult: {
        bonusAmount: 100,
        streakDay: 1,
        multiplier: 1,
        isNewStreak: true
      }
    });

    render(<DailyBonusModal isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('New streak started! Day 1')).toBeInTheDocument();
  });

  it('should display statistics correctly', () => {
    render(<DailyBonusModal isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('5')).toBeInTheDocument(); // Longest streak
    expect(screen.getByText('10')).toBeInTheDocument(); // Total bonuses
    expect(screen.getByText('1,500')).toBeInTheDocument(); // Total bonus coins
  });

  it('should display streak tips', () => {
    render(<DailyBonusModal isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('💡 Streak Tips')).toBeInTheDocument();
    expect(screen.getByText('Log in every day to maintain your streak')).toBeInTheDocument();
    expect(screen.getByText('Streaks reset if you miss more than 36 hours')).toBeInTheDocument();
  });

  it('should close modal when close button is clicked', () => {
    render(<DailyBonusModal isOpen={true} onClose={mockOnClose} />);
    
    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close modal when overlay is clicked', () => {
    render(<DailyBonusModal isOpen={true} onClose={mockOnClose} />);
    
    const overlay = screen.getByRole('dialog').parentElement;
    fireEvent.click(overlay);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should not close modal when modal content is clicked', () => {
    render(<DailyBonusModal isOpen={true} onClose={mockOnClose} />);
    
    const modalContent = screen.getByText('Daily Bonus').closest('.daily-bonus-modal');
    fireEvent.click(modalContent);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should clear error when dismiss button is clicked', () => {
    const mockClearError = jest.fn();
    
    useDailyBonus.mockReturnValue({
      ...defaultMockHook,
      error: 'Test error',
      clearError: mockClearError,
      bonusStatus: null
    });

    render(<DailyBonusModal isOpen={true} onClose={mockOnClose} />);
    
    const dismissButton = screen.getByText('Dismiss');
    fireEvent.click(dismissButton);

    expect(mockClearError).toHaveBeenCalled();
  });

  it('should format time correctly', () => {
    useDailyBonus.mockReturnValue({
      ...defaultMockHook,
      canClaimBonus: false,
      hoursUntilEligible: 0.5, // 30 minutes
      bonusStatus: {
        ...defaultMockHook.bonusStatus,
        eligibility: {
          eligible: false,
          hoursUntilEligible: 0.5
        }
      }
    });

    render(<DailyBonusModal isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('Available in: 30 minutes')).toBeInTheDocument();
  });

  it('should handle loading state during claim', () => {
    useDailyBonus.mockReturnValue({
      ...defaultMockHook,
      isLoading: true
    });

    render(<DailyBonusModal isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('Claiming...')).toBeInTheDocument();
  });
});