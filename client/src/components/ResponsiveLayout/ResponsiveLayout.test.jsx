import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResponsiveLayout from './ResponsiveLayout';

// Mock the touchOptimization utilities
jest.mock('../../utils/touchOptimization', () => ({
  ViewportUtils: {
    onViewportChange: jest.fn(() => jest.fn()), // Return cleanup function
    isMobile: jest.fn(() => false),
    isTablet: jest.fn(() => false),
    isDesktop: jest.fn(() => true),
    isLandscape: jest.fn(() => true),
    isKeyboardVisible: jest.fn(() => false),
    getSafeAreaInsets: jest.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 }))
  }
}));

// Mock window.visualViewport
Object.defineProperty(window, 'visualViewport', {
  writable: true,
  value: {
    height: 800,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }
});

describe('ResponsiveLayout', () => {
  beforeEach(() => {
    // Reset window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders children correctly', () => {
    render(
      <ResponsiveLayout>
        <div data-testid="test-content">Test Content</div>
      </ResponsiveLayout>
    );

    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('renders navigation when provided', () => {
    const mockNavigation = <nav data-testid="test-nav">Navigation</nav>;
    
    render(
      <ResponsiveLayout navigation={mockNavigation}>
        <div>Content</div>
      </ResponsiveLayout>
    );

    expect(screen.getByTestId('test-nav')).toBeInTheDocument();
  });

  it('shows loading overlay when requested', () => {
    render(
      <ResponsiveLayout 
        showLoadingOverlay={true}
        loadingMessage="Loading test..."
      >
        <div>Content</div>
      </ResponsiveLayout>
    );

    expect(screen.getByText('Loading test...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument();
  });

  it('applies correct CSS classes based on screen size', () => {
    const { container } = render(
      <ResponsiveLayout className="custom-class">
        <div>Content</div>
      </ResponsiveLayout>
    );

    const layout = container.firstChild;
    expect(layout).toHaveClass('responsive-layout');
    expect(layout).toHaveClass('screen-desktop');
    expect(layout).toHaveClass('orientation-landscape');
    expect(layout).toHaveClass('custom-class');
  });

  it('updates screen info on window resize', async () => {
    const { ViewportUtils } = require('../../utils/touchOptimization');
    let viewportCallback;
    
    ViewportUtils.onViewportChange.mockImplementation((callback) => {
      viewportCallback = callback;
      return jest.fn(); // cleanup function
    });

    render(
      <ResponsiveLayout>
        <div>Content</div>
      </ResponsiveLayout>
    );

    // Simulate mobile viewport
    ViewportUtils.isMobile.mockReturnValue(true);
    ViewportUtils.isDesktop.mockReturnValue(false);
    ViewportUtils.isLandscape.mockReturnValue(false);

    // Trigger viewport change
    if (viewportCallback) {
      viewportCallback();
    }

    await waitFor(() => {
      expect(ViewportUtils.onViewportChange).toHaveBeenCalled();
    });
  });

  it('handles orientation changes correctly', () => {
    const { container } = render(
      <ResponsiveLayout>
        <div>Content</div>
      </ResponsiveLayout>
    );

    // Simulate orientation change event
    fireEvent(window, new Event('orientationchange'));

    const layout = container.firstChild;
    expect(layout).toHaveClass('responsive-layout');
  });

  it('detects keyboard visibility on mobile', () => {
    const { ViewportUtils } = require('../../utils/touchOptimization');
    ViewportUtils.isMobile.mockReturnValue(true);
    ViewportUtils.isKeyboardVisible.mockReturnValue(true);

    const { container } = render(
      <ResponsiveLayout>
        <div>Content</div>
      </ResponsiveLayout>
    );

    const layout = container.firstChild;
    expect(layout).toHaveClass('keyboard-visible');
  });

  it('applies safe area padding', () => {
    const { ViewportUtils } = require('../../utils/touchOptimization');
    ViewportUtils.getSafeAreaInsets.mockReturnValue({
      top: 44,
      right: 0,
      bottom: 34,
      left: 0
    });

    const { container } = render(
      <ResponsiveLayout>
        <div>Content</div>
      </ResponsiveLayout>
    );

    const layout = container.firstChild;
    expect(layout).toHaveStyle({
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)'
    });
  });

  it('shows debug indicators in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ResponsiveLayout>
        <div>Content</div>
      </ResponsiveLayout>
    );

    expect(screen.getByTestId('safe-area-debug')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('hides debug indicators in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ResponsiveLayout>
        <div>Content</div>
      </ResponsiveLayout>
    );

    expect(screen.queryByTestId('safe-area-debug')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('handles missing visualViewport gracefully', () => {
    const originalVisualViewport = window.visualViewport;
    delete window.visualViewport;

    expect(() => {
      render(
        <ResponsiveLayout>
          <div>Content</div>
        </ResponsiveLayout>
      );
    }).not.toThrow();

    window.visualViewport = originalVisualViewport;
  });

  it('cleans up event listeners on unmount', () => {
    const { ViewportUtils } = require('../../utils/touchOptimization');
    const mockCleanup = jest.fn();
    ViewportUtils.onViewportChange.mockReturnValue(mockCleanup);

    const { unmount } = render(
      <ResponsiveLayout>
        <div>Content</div>
      </ResponsiveLayout>
    );

    unmount();

    expect(mockCleanup).toHaveBeenCalled();
  });
});