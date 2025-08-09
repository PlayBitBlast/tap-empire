import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OfflineProgressModal from './OfflineProgressModal';

// Mock the offline progress service
jest.mock('../../services/offlineProgressService', () => ({
  collectOfflineEarnings: jest.fn()
}));

describe('OfflineProgressModal Component', () => {
  const mockOfflineProgressService = require('../../services/offlineProgressService');

  const mockOfflineProgress = {
    earnings: 1500,
    hoursOffline: 2.5,
    breakdown: {
      autoClicker: 1200,
      passiveIncome: 300
    },
    cappedAt: false
  };

  const mockProps = {
    isOpen: true,
    offlineProgress: mockOfflineProgress,
    onClose: jest.fn(),
    onCollect: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOfflineProgressService.collectOfflineEarnings.mockResolvedValue({
      success: true,
      earnings: mockOfflineProgress.earnings
    });
  });

  it('should render offline progress modal when open', () => {
    render(<OfflineProgressModal {...mockProps} />);

    expect(screen.getByText('Welcome Back!')).toBeInTheDocument();
    expect(screen.getByText('You earned coins while away')).toBeInTheDocument();
    expect(screen.getByText('1,500')).toBeInTheDocument(); // Formatted earnings
    expect(screen.getByText('2.5 hours')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<OfflineProgressModal {...mockProps} isOpen={false} />);

    expect(screen.queryByText('Welcome Back!')).not.toBeInTheDocument();
  });

  it('should display earnings breakdown', () => {
    render(<OfflineProgressModal {...mockProps} />);

    expect(screen.getByText('Auto-Clicker:')).toBeInTheDocument();
    expect(screen.getByText('1,200')).toBeInTheDocument();
    expect(screen.getByText('Passive Income:')).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();
  });

  it('should show capped earnings warning', () => {
    const cappedProps = {
      ...mockProps,
      offlineProgress: {
        ...mockOfflineProgress,
        cappedAt: true,
        hoursOffline: 4,
        maxHours: 4
      }
    };

    render(<OfflineProgressModal {...cappedProps} />);

    expect(screen.getByText(/earnings capped at/i)).toBeInTheDocument();
    expect(screen.getByText('4 hours')).toBeInTheDocument();
  });

  it('should handle collect button click', async () => {
    render(<OfflineProgressModal {...mockProps} />);

    const collectButton = screen.getByText('Collect');
    fireEvent.click(collectButton);

    expect(collectButton).toBeDisabled();
    expect(screen.getByText('Collecting...')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockOfflineProgressService.collectOfflineEarnings).toHaveBeenCalledWith(
        mockOfflineProgress.earnings
      );
      expect(mockProps.onCollect).toHaveBeenCalledWith(mockOfflineProgress.earnings);
    });
  });

  it('should handle collect error', async () => {
    mockOfflineProgressService.collectOfflineEarnings.mockRejectedValue(
      new Error('Collection failed')
    );

    render(<OfflineProgressModal {...mockProps} />);

    const collectButton = screen.getByText('Collect');
    fireEvent.click(collectButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to collect earnings')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('should retry collection after error', async () => {
    mockOfflineProgressService.collectOfflineEarnings
      .mockRejectedValueOnce(new Error('Collection failed'))
      .mockResolvedValueOnce({
        success: true,
        earnings: mockOfflineProgress.earnings
      });

    render(<OfflineProgressModal {...mockProps} />);

    const collectButton = screen.getByText('Collect');
    fireEvent.click(collectButton);

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockOfflineProgressService.collectOfflineEarnings).toHaveBeenCalledTimes(2);
      expect(mockProps.onCollect).toHaveBeenCalledWith(mockOfflineProgress.earnings);
    });
  });

  it('should close modal with close button', () => {
    render(<OfflineProgressModal {...mockProps} />);

    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('should close modal with backdrop click', () => {
    render(<OfflineProgressModal {...mockProps} />);

    const backdrop = screen.getByTestId('modal-backdrop');
    fireEvent.click(backdrop);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('should not close modal when clicking content', () => {
    render(<OfflineProgressModal {...mockProps} />);

    const content = screen.getByTestId('modal-content');
    fireEvent.click(content);

    expect(mockProps.onClose).not.toHaveBeenCalled();
  });

  it('should handle keyboard navigation', () => {
    render(<OfflineProgressModal {...mockProps} />);

    const modal = screen.getByRole('dialog');
    fireEvent.keyDown(modal, { key: 'Escape' });

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('should format large numbers correctly', () => {
    const largeEarningsProps = {
      ...mockProps,
      offlineProgress: {
        ...mockOfflineProgress,
        earnings: 1234567,
        breakdown: {
          autoClicker: 1000000,
          passiveIncome: 234567
        }
      }
    };

    render(<OfflineProgressModal {...largeEarningsProps} />);

    expect(screen.getByText('1,234,567')).toBeInTheDocument();
    expect(screen.getByText('1,000,000')).toBeInTheDocument();
    expect(screen.getByText('234,567')).toBeInTheDocument();
  });

  it('should show zero earnings gracefully', () => {
    const zeroEarningsProps = {
      ...mockProps,
      offlineProgress: {
        earnings: 0,
        hoursOffline: 0.1,
        breakdown: {
          autoClicker: 0,
          passiveIncome: 0
        },
        cappedAt: false
      }
    };

    render(<OfflineProgressModal {...zeroEarningsProps} />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('No earnings while away')).toBeInTheDocument();
  });

  it('should display correct time format for different durations', () => {
    const testCases = [
      { hours: 0.5, expected: '30 minutes' },
      { hours: 1, expected: '1 hour' },
      { hours: 1.5, expected: '1.5 hours' },
      { hours: 24, expected: '1 day' },
      { hours: 48, expected: '2 days' }
    ];

    testCases.forEach(({ hours, expected }) => {
      const timeProps = {
        ...mockProps,
        offlineProgress: {
          ...mockOfflineProgress,
          hoursOffline: hours
        }
      };

      const { rerender } = render(<OfflineProgressModal {...timeProps} />);
      expect(screen.getByText(expected)).toBeInTheDocument();
      rerender(<div />); // Clear for next test
    });
  });

  it('should animate earnings counter', async () => {
    render(<OfflineProgressModal {...mockProps} />);

    const earningsDisplay = screen.getByTestId('earnings-counter');
    
    // Should start at 0 and animate to final value
    expect(earningsDisplay).toHaveTextContent('0');

    await waitFor(() => {
      expect(earningsDisplay).toHaveTextContent('1,500');
    }, { timeout: 3000 });
  });

  it('should show progress bar for collection', async () => {
    render(<OfflineProgressModal {...mockProps} />);

    const collectButton = screen.getByText('Collect');
    fireEvent.click(collectButton);

    expect(screen.getByTestId('collection-progress')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId('collection-progress')).not.toBeInTheDocument();
    });
  });

  it('should handle missing breakdown data', () => {
    const noBreakdownProps = {
      ...mockProps,
      offlineProgress: {
        earnings: 1000,
        hoursOffline: 2,
        cappedAt: false
        // No breakdown property
      }
    };

    render(<OfflineProgressModal {...noBreakdownProps} />);

    expect(screen.getByText('1,000')).toBeInTheDocument();
    expect(screen.queryByText('Auto-Clicker:')).not.toBeInTheDocument();
  });

  it('should apply correct accessibility attributes', () => {
    render(<OfflineProgressModal {...mockProps} />);

    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-labelledby');
    expect(modal).toHaveAttribute('aria-describedby');
    expect(modal).toHaveAttribute('aria-modal', 'true');

    const collectButton = screen.getByText('Collect');
    expect(collectButton).toHaveAttribute('aria-describedby');
  });
});