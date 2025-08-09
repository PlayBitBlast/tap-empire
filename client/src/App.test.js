import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

// Mock Telegram WebApp
global.Telegram = {
  WebApp: {
    ready: jest.fn(),
    expand: jest.fn(),
    themeParams: {
      bg_color: '#17212b',
      text_color: '#ffffff'
    },
    initDataUnsafe: {
      user: {
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser'
      }
    }
  }
};

// Clean up after each test
afterEach(() => {
  cleanup();
});

describe('Tap Empire App', () => {
  test('renders Tap Empire title', () => {
    render(<App />);
    const titleElement = screen.getByText(/Tap Empire/i);
    expect(titleElement).toBeInTheDocument();
  });

  test('renders tap button', () => {
    render(<App />);
    const tapButton = screen.getByText(/TAP!/i);
    expect(tapButton).toBeInTheDocument();
  });

  test('renders coin display', () => {
    render(<App />);
    const coinDisplay = screen.getByText(/0 Coins/i);
    expect(coinDisplay).toBeInTheDocument();
  });

  test('displays user info when Telegram user is available', () => {
    render(<App />);
    const welcomeText = screen.getByText(/Welcome, Test!/i);
    expect(welcomeText).toBeInTheDocument();
    
    const usernameText = screen.getByText(/@testuser/i);
    expect(usernameText).toBeInTheDocument();
  });
});