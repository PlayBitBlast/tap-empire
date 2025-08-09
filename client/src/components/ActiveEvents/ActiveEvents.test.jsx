import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ActiveEvents from './ActiveEvents';

// Mock the event service
jest.mock('../../services/eventService', () => ({
  getActiveEvents: jest.fn(),
  subscribeToEventUpdates: jest.fn(),
  unsubscribeFromEventUpdates: jest.fn()
}));

// Mock child components
jest.mock('../EventCountdown/EventCountdown', () => {
  return function MockEventCountdown({ event, onEventEnd }) {
    return (
      <div data-testid="event-countdown">
        <span>Time remaining: {event.timeRemaining}ms</span>
        <button onClick={() => onEventEnd(event.id)}>End Event</button>
      </div>
    );
  };
});

jest.mock('../EventNotification/EventNotification', () => {
  return function MockEventNotification({ event, onClose }) {
    return (
      <div data-testid="event-notification">
        <span>{event.name} is active!</span>
        <button onClick={() => onClose(event.id)}>Close</button>
      </div>
    );
  };
});

describe('ActiveEvents Component', () => {
  const mockEventService = require('../../services/eventService');

  const mockEvents = [
    {
      id: 1,
      name: 'Weekend Bonus',
      type: 'multiplier',
      multiplier: 2,
      description: 'Double coins for all actions',
      startTime: Date.now() - 3600000, // 1 hour ago
      endTime: Date.now() + 3600000, // 1 hour from now
      timeRemaining: 3600000,
      isActive: true
    },
    {
      id: 2,
      name: 'Golden Hour',
      type: 'golden_tap_boost',
      multiplier: 1.5,
      description: 'Increased Golden Tap chance',
      startTime: Date.now() - 1800000, // 30 minutes ago
      endTime: Date.now() + 1800000, // 30 minutes from now
      timeRemaining: 1800000,
      isActive: true
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockEventService.getActiveEvents.mockResolvedValue({
      success: true,
      events: mockEvents
    });
    mockEventService.subscribeToEventUpdates.mockImplementation(() => {});
    mockEventService.unsubscribeFromEventUpdates.mockImplementation(() => {});
  });

  it('should render active events correctly', async () => {
    render(<ActiveEvents />);

    await waitFor(() => {
      expect(screen.getByText('Weekend Bonus')).toBeInTheDocument();
      expect(screen.getByText('Golden Hour')).toBeInTheDocument();
    });

    expect(screen.getByText('Double coins for all actions')).toBeInTheDocument();
    expect(screen.getByText('Increased Golden Tap chance')).toBeInTheDocument();
  });

  it('should display event multipliers correctly', async () => {
    render(<ActiveEvents />);

    await waitFor(() => {
      expect(screen.getByText('2x')).toBeInTheDocument();
      expect(screen.getByText('1.5x')).toBeInTheDocument();
    });
  });

  it('should show countdown timers for events', async () => {
    render(<ActiveEvents />);

    await waitFor(() => {
      const countdowns = screen.getAllByTestId('event-countdown');
      expect(countdowns).toHaveLength(2);
    });
  });

  it('should handle event end correctly', async () => {
    render(<ActiveEvents />);

    await waitFor(() => {
      const endButton = screen.getAllByText('End Event')[0];
      fireEvent.click(endButton);
    });

    // Should remove the ended event from display
    await waitFor(() => {
      expect(mockEventService.getActiveEvents).toHaveBeenCalledTimes(2);
    });
  });

  it('should display no events message when no active events', async () => {
    mockEventService.getActiveEvents.mockResolvedValue({
      success: true,
      events: []
    });

    render(<ActiveEvents />);

    await waitFor(() => {
      expect(screen.getByText('No active events')).toBeInTheDocument();
    });
  });

  it('should handle loading state', () => {
    mockEventService.getActiveEvents.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(<ActiveEvents />);

    expect(screen.getByText('Loading events...')).toBeInTheDocument();
  });

  it('should handle error state', async () => {
    mockEventService.getActiveEvents.mockRejectedValue(
      new Error('Failed to load events')
    );

    render(<ActiveEvents />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load events')).toBeInTheDocument();
    });
  });

  it('should subscribe to event updates on mount', () => {
    render(<ActiveEvents />);

    expect(mockEventService.subscribeToEventUpdates).toHaveBeenCalledWith(
      expect.any(Function)
    );
  });

  it('should unsubscribe from event updates on unmount', () => {
    const { unmount } = render(<ActiveEvents />);

    unmount();

    expect(mockEventService.unsubscribeFromEventUpdates).toHaveBeenCalled();
  });

  it('should update events when receiving real-time updates', async () => {
    let updateCallback;
    mockEventService.subscribeToEventUpdates.mockImplementation((callback) => {
      updateCallback = callback;
    });

    render(<ActiveEvents />);

    await waitFor(() => {
      expect(screen.getByText('Weekend Bonus')).toBeInTheDocument();
    });

    // Simulate real-time update
    const newEvent = {
      id: 3,
      name: 'Flash Sale',
      type: 'upgrade_discount',
      multiplier: 0.5,
      description: '50% off all upgrades',
      startTime: Date.now(),
      endTime: Date.now() + 900000,
      timeRemaining: 900000,
      isActive: true
    };

    updateCallback({
      type: 'event_started',
      event: newEvent
    });

    await waitFor(() => {
      expect(screen.getByText('Flash Sale')).toBeInTheDocument();
    });
  });

  it('should show event notifications for new events', async () => {
    let updateCallback;
    mockEventService.subscribeToEventUpdates.mockImplementation((callback) => {
      updateCallback = callback;
    });

    render(<ActiveEvents />);

    // Simulate new event notification
    const newEvent = {
      id: 4,
      name: 'Surprise Bonus',
      type: 'multiplier',
      multiplier: 3,
      description: 'Triple coins for 15 minutes!',
      startTime: Date.now(),
      endTime: Date.now() + 900000,
      timeRemaining: 900000,
      isActive: true
    };

    updateCallback({
      type: 'event_started',
      event: newEvent,
      showNotification: true
    });

    await waitFor(() => {
      expect(screen.getByTestId('event-notification')).toBeInTheDocument();
      expect(screen.getByText('Surprise Bonus is active!')).toBeInTheDocument();
    });
  });

  it('should close event notifications', async () => {
    let updateCallback;
    mockEventService.subscribeToEventUpdates.mockImplementation((callback) => {
      updateCallback = callback;
    });

    render(<ActiveEvents />);

    // Show notification
    const newEvent = {
      id: 5,
      name: 'Test Event',
      type: 'multiplier',
      multiplier: 2,
      description: 'Test event',
      startTime: Date.now(),
      endTime: Date.now() + 900000,
      timeRemaining: 900000,
      isActive: true
    };

    updateCallback({
      type: 'event_started',
      event: newEvent,
      showNotification: true
    });

    await waitFor(() => {
      expect(screen.getByTestId('event-notification')).toBeInTheDocument();
    });

    // Close notification
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('event-notification')).not.toBeInTheDocument();
    });
  });

  it('should apply correct CSS classes for different event types', async () => {
    render(<ActiveEvents />);

    await waitFor(() => {
      const multiplierEvent = screen.getByText('Weekend Bonus').closest('.event-card');
      const boostEvent = screen.getByText('Golden Hour').closest('.event-card');

      expect(multiplierEvent).toHaveClass('event-multiplier');
      expect(boostEvent).toHaveClass('event-golden_tap_boost');
    });
  });

  it('should refresh events periodically', async () => {
    jest.useFakeTimers();

    render(<ActiveEvents />);

    await waitFor(() => {
      expect(mockEventService.getActiveEvents).toHaveBeenCalledTimes(1);
    });

    // Fast forward 30 seconds
    jest.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(mockEventService.getActiveEvents).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });
});