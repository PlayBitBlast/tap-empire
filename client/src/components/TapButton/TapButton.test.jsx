import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TapButton from './TapButton';

describe('TapButton Component', () => {
  const mockOnTap = jest.fn();

  beforeEach(() => {
    mockOnTap.mockClear();
  });

  test('renders tap button with default props', () => {
    render(<TapButton onTap={mockOnTap} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('tap-button');
    expect(screen.getByText('TAP!')).toBeInTheDocument();
    expect(screen.getByText('💎')).toBeInTheDocument();
  });

  test('calls onTap when clicked', () => {
    render(<TapButton onTap={mockOnTap} coinsPerTap={5} />);
    
    const button = screen.getByRole('button');
    fireEvent.mouseDown(button);
    
    expect(mockOnTap).toHaveBeenCalledTimes(1);
    expect(mockOnTap).toHaveBeenCalledWith(
      expect.objectContaining({
        position: expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number)
        }),
        centerOffset: expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number)
        })
      })
    );
  });

  test('calls onTap when touched (mobile)', () => {
    render(<TapButton onTap={mockOnTap} coinsPerTap={3} />);
    
    const button = screen.getByRole('button');
    fireEvent.touchStart(button, {
      touches: [{ clientX: 100, clientY: 150 }]
    });
    
    expect(mockOnTap).toHaveBeenCalledTimes(1);
  });

  test('shows golden tap styling when isGoldenTap is true', () => {
    render(<TapButton onTap={mockOnTap} isGoldenTap={true} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('golden');
    expect(screen.getByText('✨')).toBeInTheDocument();
  });

  test('does not call onTap when disabled', () => {
    render(<TapButton onTap={mockOnTap} disabled={true} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('disabled');
    expect(button).toBeDisabled();
    
    fireEvent.mouseDown(button);
    expect(mockOnTap).not.toHaveBeenCalled();
  });

  test('shows pressed state when active', () => {
    render(<TapButton onTap={mockOnTap} />);
    
    const button = screen.getByRole('button');
    
    fireEvent.mouseDown(button);
    expect(button).toHaveClass('pressed');
    
    fireEvent.mouseUp(button);
    expect(button).not.toHaveClass('pressed');
  });

  test('creates floating coin animation on tap', async () => {
    render(<TapButton onTap={mockOnTap} coinsPerTap={10} />);
    
    const button = screen.getByRole('button');
    fireEvent.mouseDown(button);
    
    // Check that floating coin animation is created
    await waitFor(() => {
      const floatingCoin = screen.getByText('+10');
      expect(floatingCoin).toBeInTheDocument();
    });
  });

  test('creates ripple effect on tap', async () => {
    render(<TapButton onTap={mockOnTap} />);
    
    const button = screen.getByRole('button');
    fireEvent.mouseDown(button);
    
    // Check that ripple effect is created
    await waitFor(() => {
      const ripple = button.querySelector('.tap-ripple');
      expect(ripple).toBeInTheDocument();
    });
  });

  test('prevents context menu on long press', () => {
    render(<TapButton onTap={mockOnTap} />);
    
    const button = screen.getByRole('button');
    
    // Test that the contextmenu event handler is attached
    const contextMenuEvent = new Event('contextmenu', { bubbles: true, cancelable: true });
    button.dispatchEvent(contextMenuEvent);
    
    // The event should be prevented by the component
    expect(contextMenuEvent.defaultPrevented).toBe(true);
  });

  test('has proper accessibility attributes', () => {
    render(<TapButton onTap={mockOnTap} coinsPerTap={7} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Tap to earn 7 coins');
  });

  test('handles rapid tapping without issues', () => {
    render(<TapButton onTap={mockOnTap} />);
    
    const button = screen.getByRole('button');
    
    // Simulate rapid tapping
    for (let i = 0; i < 10; i++) {
      fireEvent.mouseDown(button);
      fireEvent.mouseUp(button);
    }
    
    expect(mockOnTap).toHaveBeenCalledTimes(10);
  });

  test('applies custom className', () => {
    render(<TapButton onTap={mockOnTap} className="custom-class" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });
});