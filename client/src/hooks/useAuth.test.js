import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';
import telegramAuthService from '../services/telegramAuth';

// Mock the telegramAuthService
jest.mock('../services/telegramAuth', () => ({
  getCurrentUser: jest.fn(),
  getToken: jest.fn(),
  authenticate: jest.fn(),
  logout: jest.fn(),
  refreshSession: jest.fn(),
  updateProfile: jest.fn(),
  getProfile: jest.fn(),
  apiRequest: jest.fn(),
  showAlert: jest.fn(),
  showConfirm: jest.fn(),
  hapticFeedback: jest.fn(),
  getThemeParams: jest.fn(),
  getTelegramUser: jest.fn(),
  isTelegramEnvironment: jest.fn()
}));

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    telegramAuthService.getCurrentUser.mockReturnValue(null);
    telegramAuthService.getToken.mockReturnValue(null);

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should authenticate user with existing token', async () => {
    const mockUser = { id: 1, username: 'test' };
    telegramAuthService.getCurrentUser.mockReturnValue(mockUser);
    telegramAuthService.getToken.mockReturnValue('mock-token');
    telegramAuthService.refreshSession.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth());

    // Wait for initialization to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.error).toBeNull();
  });

  it('should handle refresh session failure and re-authenticate', async () => {
    const mockUser = { id: 1, username: 'test' };
    telegramAuthService.getCurrentUser.mockReturnValue(mockUser);
    telegramAuthService.getToken.mockReturnValue('mock-token');
    telegramAuthService.refreshSession.mockRejectedValue(new Error('Session expired'));
    telegramAuthService.authenticate.mockResolvedValue({ success: true, user: mockUser });

    const { result } = renderHook(() => useAuth());

    // Wait for initialization to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(telegramAuthService.authenticate).toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });

  it('should authenticate new user', async () => {
    const mockUser = { id: 1, username: 'test' };
    telegramAuthService.getCurrentUser.mockReturnValue(null);
    telegramAuthService.getToken.mockReturnValue(null);
    telegramAuthService.authenticate.mockResolvedValue({ success: true, user: mockUser });

    const { result } = renderHook(() => useAuth());

    // Wait for initialization to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });

  it('should handle authentication failure', async () => {
    telegramAuthService.getCurrentUser.mockReturnValue(null);
    telegramAuthService.getToken.mockReturnValue(null);
    telegramAuthService.authenticate.mockRejectedValue(new Error('Auth failed'));

    const { result } = renderHook(() => useAuth());

    // Wait for initialization to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.error).toBe('Auth failed');
  });

  it('should logout user', async () => {
    const mockUser = { id: 1, username: 'test' };
    telegramAuthService.getCurrentUser.mockReturnValue(mockUser);
    telegramAuthService.getToken.mockReturnValue('mock-token');
    telegramAuthService.refreshSession.mockResolvedValue(mockUser);
    telegramAuthService.logout.mockResolvedValue();

    const { result } = renderHook(() => useAuth());

    // Wait for initialization
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Logout
    await act(async () => {
      await result.current.logout();
    });

    expect(telegramAuthService.logout).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should refresh session', async () => {
    const mockUser = { id: 1, username: 'test' };
    const updatedUser = { id: 1, username: 'updated' };
    
    telegramAuthService.getCurrentUser.mockReturnValue(mockUser);
    telegramAuthService.getToken.mockReturnValue('mock-token');
    telegramAuthService.refreshSession
      .mockResolvedValueOnce(mockUser) // Initial refresh
      .mockResolvedValueOnce(updatedUser); // Manual refresh

    const { result } = renderHook(() => useAuth());

    // Wait for initialization
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Manual refresh
    await act(async () => {
      const refreshedUser = await result.current.refreshSession();
      expect(refreshedUser).toEqual(updatedUser);
    });

    expect(result.current.user).toEqual(updatedUser);
  });

  it('should update profile', async () => {
    const mockUser = { id: 1, username: 'test' };
    const updatedUser = { id: 1, username: 'updated' };
    const updates = { username: 'updated' };
    
    telegramAuthService.getCurrentUser.mockReturnValue(mockUser);
    telegramAuthService.getToken.mockReturnValue('mock-token');
    telegramAuthService.refreshSession.mockResolvedValue(mockUser);
    telegramAuthService.updateProfile.mockResolvedValue(updatedUser);

    const { result } = renderHook(() => useAuth());

    // Wait for initialization
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Update profile
    await act(async () => {
      const updated = await result.current.updateProfile(updates);
      expect(updated).toEqual(updatedUser);
    });

    expect(telegramAuthService.updateProfile).toHaveBeenCalledWith(updates);
    expect(result.current.user).toEqual(updatedUser);
  });

  it('should get profile', async () => {
    const mockUser = { id: 1, username: 'test' };
    const profileUser = { id: 1, username: 'profile' };
    
    telegramAuthService.getCurrentUser.mockReturnValue(mockUser);
    telegramAuthService.getToken.mockReturnValue('mock-token');
    telegramAuthService.refreshSession.mockResolvedValue(mockUser);
    telegramAuthService.getProfile.mockResolvedValue(profileUser);

    const { result } = renderHook(() => useAuth());

    // Wait for initialization
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Get profile
    await act(async () => {
      const profile = await result.current.getProfile();
      expect(profile).toEqual(profileUser);
    });

    expect(telegramAuthService.getProfile).toHaveBeenCalled();
    expect(result.current.user).toEqual(profileUser);
  });

  it('should clear error', async () => {
    telegramAuthService.getCurrentUser.mockReturnValue(null);
    telegramAuthService.getToken.mockReturnValue(null);
    telegramAuthService.authenticate.mockRejectedValue(new Error('Auth failed'));

    const { result } = renderHook(() => useAuth());

    // Wait for initialization to complete with error
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.error).toBe('Auth failed');

    // Clear error
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('should make API request', async () => {
    const mockUser = { id: 1, username: 'test' };
    const mockResponse = { success: true, data: 'test' };
    
    telegramAuthService.getCurrentUser.mockReturnValue(mockUser);
    telegramAuthService.getToken.mockReturnValue('mock-token');
    telegramAuthService.refreshSession.mockResolvedValue(mockUser);
    telegramAuthService.apiRequest.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAuth());

    // Wait for initialization
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Make API request
    await act(async () => {
      const response = await result.current.apiRequest('/test');
      expect(response).toEqual(mockResponse);
    });

    expect(telegramAuthService.apiRequest).toHaveBeenCalledWith('/test', {});
  });

  it('should handle API request authentication error', async () => {
    const mockUser = { id: 1, username: 'test' };
    
    telegramAuthService.getCurrentUser.mockReturnValue(mockUser);
    telegramAuthService.getToken.mockReturnValue('mock-token');
    telegramAuthService.refreshSession.mockResolvedValue(mockUser);
    telegramAuthService.apiRequest.mockRejectedValue(new Error('Authentication expired. Please log in again.'));

    const { result } = renderHook(() => useAuth());

    // Wait for initialization
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Make API request that fails with auth error
    await act(async () => {
      try {
        await result.current.apiRequest('/test');
      } catch (error) {
        expect(error.message).toBe('Authentication expired. Please log in again.');
      }
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should provide Telegram-specific methods', async () => {
    const mockUser = { id: 1, username: 'test' };
    
    telegramAuthService.getCurrentUser.mockReturnValue(mockUser);
    telegramAuthService.getToken.mockReturnValue('mock-token');
    telegramAuthService.refreshSession.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth());

    // Wait for initialization
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Test Telegram methods are available
    expect(typeof result.current.showAlert).toBe('function');
    expect(typeof result.current.showConfirm).toBe('function');
    expect(typeof result.current.hapticFeedback).toBe('function');
    expect(typeof result.current.getThemeParams).toBe('function');
    expect(typeof result.current.getTelegramUser).toBe('function');
    expect(typeof result.current.isTelegramEnvironment).toBe('function');
  });
});