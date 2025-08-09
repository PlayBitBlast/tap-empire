import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import GoldenTapCelebration from './GoldenTapCelebration';

describe('GoldenTapCelebration Component', () => {
  test('renders celebration when visible', () => {
    render(
      <GoldenTapCelebration
        isVisible={true}
        earnings={1000}
        onComplete={jest.fn()}
      />
    );

    expect(screen.getByText('GOLDEN TAP!')).toBeInTheDocument();
    expect(screen.getByText('+1,000')).toBeInTheDocument();
    expect(screen.getByText('COINS')).toBeInTheDocument();
    expect(screen.getByText('10x MULTIPLIER')).toBeInTheDocument();
  });

  test('does not render when not visible', () => {
    render(
      <GoldenTapCelebration
        isVisible={false}
        earnings={1000}
        onComplete={jest.fn()}
      />
    );

    expect(screen.queryByText('GOLDEN TAP!')).not.toBeInTheDocument();
  });

  test('calls onComplete after duration', async () => {
    const mockOnComplete = jest.fn();
    
    render(
      <GoldenTapCelebration
        isVisible={true}
        earnings={1000}
        onComplete={mockOnComplete}
        duration={100} // Short duration for testing
      />
    );

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    }, { timeout: 200 });
  });

  test('formats large earnings correctly', () => {
    render(
      <GoldenTapCelebration
        isVisible={true}
        earnings={1234567}
        onComplete={jest.fn()}
      />
    );

    expect(screen.getByText('+1,234,567')).toBeInTheDocument();
  });

  test('renders particles and visual effects', () => {
    const { container } = render(
      <GoldenTapCelebration
        isVisible={true}
        earnings={1000}
        onComplete={jest.fn()}
      />
    );

    // Check for particles container
    expect(container.querySelector('.particles-container')).toBeInTheDocument();
    
    // Check for golden rays
    expect(container.querySelector('.golden-rays')).toBeInTheDocument();
    
    // Check for floating coins
    expect(container.querySelector('.floating-coins')).toBeInTheDocument();
    
    // Check for screen flash
    expect(container.querySelector('.screen-flash')).toBeInTheDocument();
  });

  test('has proper CSS classes for styling', () => {
    const { container } = render(
      <GoldenTapCelebration
        isVisible={true}
        earnings={1000}
        onComplete={jest.fn()}
      />
    );

    const celebration = container.querySelector('.golden-tap-celebration');
    expect(celebration).toHaveClass('golden-tap-celebration');
    expect(celebration).toHaveClass('enter');
  });
});