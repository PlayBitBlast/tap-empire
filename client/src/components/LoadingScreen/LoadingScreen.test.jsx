import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadingScreen from './LoadingScreen';

describe('LoadingScreen', () => {
  it('should render with default loading message', () => {
    render(<LoadingScreen />);
    
    expect(screen.getByText('Tap Empire')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByText('Connecting to Telegram...')).toBeInTheDocument();
    expect(screen.getByText('Tap Empire')).toBeInTheDocument();
  });

  it('should render with custom loading message', () => {
    render(<LoadingScreen message="Authenticating..." />);
    
    expect(screen.getByText('Authenticating...')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('should render error state with retry button', () => {
    const mockOnRetry = jest.fn();
    render(
      <LoadingScreen 
        error="Authentication failed" 
        onRetry={mockOnRetry} 
      />
    );
    
    expect(screen.getByText('Authentication failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('should render error state without retry button when onRetry is not provided', () => {
    render(<LoadingScreen error="Something went wrong" />);
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try Again' })).not.toBeInTheDocument();
  });

  it('should call onRetry when retry button is clicked', () => {
    const mockOnRetry = jest.fn();
    render(
      <LoadingScreen 
        error="Network error" 
        onRetry={mockOnRetry} 
      />
    );
    
    const retryButton = screen.getByRole('button', { name: 'Try Again' });
    fireEvent.click(retryButton);
    
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('should have correct CSS classes for styling', () => {
    const { container } = render(<LoadingScreen />);
    
    expect(container.firstChild).toHaveClass('loading-screen');
    expect(screen.getByText('Tap Empire')).toHaveClass('loading-title');
    expect(container.querySelector('.loading-content')).toBeInTheDocument();
    expect(container.querySelector('.loading-logo')).toBeInTheDocument();
    expect(container.querySelector('.tap-button-loading')).toBeInTheDocument();
    expect(container.querySelector('.loading-pulse')).toBeInTheDocument();
  });

  it('should show spinner when not in error state', () => {
    const { container } = render(<LoadingScreen message="Loading game..." />);
    
    expect(container.querySelector('.spinner')).toBeInTheDocument();
    expect(container.querySelector('.loading-spinner')).toBeInTheDocument();
  });

  it('should not show spinner when in error state', () => {
    const { container } = render(<LoadingScreen error="Error occurred" />);
    
    expect(container.querySelector('.spinner')).not.toBeInTheDocument();
    expect(container.querySelector('.loading-spinner')).not.toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<LoadingScreen />);
    
    const title = screen.getByText('Tap Empire');
    expect(title.tagName).toBe('H1');
    
    const retryButton = screen.queryByRole('button');
    if (retryButton) {
      expect(retryButton).toHaveAttribute('type', 'button');
    }
  });

  it('should render all sections correctly', () => {
    const { container } = render(<LoadingScreen />);
    
    expect(container.querySelector('.loading-logo')).toBeInTheDocument();
    expect(container.querySelector('.loading-spinner')).toBeInTheDocument();
    expect(container.querySelector('.loading-footer')).toBeInTheDocument();
  });
});