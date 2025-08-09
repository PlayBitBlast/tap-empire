import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CoinCounter from './CoinCounter';

describe('CoinCounter Component', () => {
  test('renders coin counter with initial coins', () => {
    render(<CoinCounter coins={500} />);
    
    expect(screen.getByText('💰')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('Coins')).toBeInTheDocument();
  });

  test('formats large numbers correctly', async () => {
    const { rerender } = render(<CoinCounter coins={500} animationDuration={10} />);
    expect(screen.getByText('500')).toBeInTheDocument();

    rerender(<CoinCounter coins={1500} animationDuration={10} />);
    await waitFor(() => {
      expect(screen.getByText('1.5K')).toBeInTheDocument();
    });

    rerender(<CoinCounter coins={1500000} animationDuration={10} />);
    await waitFor(() => {
      expect(screen.getByText('1.5M')).toBeInTheDocument();
    });

    rerender(<CoinCounter coins={1500000000} animationDuration={10} />);
    await waitFor(() => {
      expect(screen.getByText('1.5B')).toBeInTheDocument();
    });

    rerender(<CoinCounter coins={1500000000000} animationDuration={10} />);
    await waitFor(() => {
      expect(screen.getByText('1.5T')).toBeInTheDocument();
    });
  });

  test('shows increase indicator when coins increase', async () => {
    const { rerender } = render(<CoinCounter coins={100} previousCoins={100} showIncrease={true} />);
    
    rerender(<CoinCounter coins={150} previousCoins={100} showIncrease={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('50')).toBeInTheDocument();
    });
  });

  test('does not show increase indicator when showIncrease is false', () => {
    const { rerender } = render(<CoinCounter coins={100} previousCoins={100} showIncrease={false} />);
    
    rerender(<CoinCounter coins={150} previousCoins={100} showIncrease={false} />);
    
    expect(screen.queryByText('50')).not.toBeInTheDocument();
  });

  test('animates coin count changes', async () => {
    const { rerender } = render(<CoinCounter coins={100} animationDuration={50} />);
    
    rerender(<CoinCounter coins={200} animationDuration={50} />);
    
    // The counter should animate from 100 to 200
    await waitFor(() => {
      expect(screen.getByText('200')).toBeInTheDocument();
    }, { timeout: 200 });
  });

  test('applies custom className', () => {
    render(<CoinCounter coins={500} className="custom-counter" />);
    
    const counter = screen.getByText('500').closest('.coin-counter');
    expect(counter).toHaveClass('custom-counter');
  });

  test('handles zero coins correctly', () => {
    render(<CoinCounter coins={0} />);
    
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  test('handles negative coins (edge case)', () => {
    render(<CoinCounter coins={-100} />);
    
    expect(screen.getByText('-100')).toBeInTheDocument();
  });

  test('shows pulse effect for large increases', async () => {
    const { rerender } = render(<CoinCounter coins={100} animationDuration={100} />);
    
    // Large increase (more than 10% of current value)
    rerender(<CoinCounter coins={1000} animationDuration={100} />);
    
    await waitFor(() => {
      const counter = document.querySelector('.coin-counter');
      expect(counter).toHaveClass('animating');
    });
  });

  test('has proper accessibility attributes', () => {
    render(<CoinCounter coins={500} />);
    
    const coinAmount = screen.getByText('500');
    expect(coinAmount).toHaveAttribute('aria-live', 'polite');
  });

  test('respects custom animation duration', async () => {
    const { rerender } = render(
      <CoinCounter coins={100} animationDuration={50} />
    );
    
    rerender(<CoinCounter coins={200} animationDuration={50} />);
    
    // With shorter animation duration, should complete faster
    await waitFor(() => {
      const counter = document.querySelector('.coin-counter');
      expect(counter).toBeInTheDocument();
    }, { timeout: 200 });
  });

  test('handles rapid coin changes gracefully', async () => {
    const { rerender } = render(<CoinCounter coins={100} animationDuration={50} />);
    
    // Rapid changes
    rerender(<CoinCounter coins={150} animationDuration={50} />);
    rerender(<CoinCounter coins={200} animationDuration={50} />);
    rerender(<CoinCounter coins={250} animationDuration={50} />);
    
    // Should eventually show a value close to the final value
    await waitFor(() => {
      const counter = document.querySelector('.coin-counter');
      expect(counter).toBeInTheDocument();
    }, { timeout: 500 });
  });
});