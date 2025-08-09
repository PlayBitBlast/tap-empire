import { useState, useEffect, useCallback } from 'react';
import telegramAuthService from '../services/telegramAuth';

/**
 * Custom hook for managing authentication state
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Initialize authentication state
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check if user is already authenticated
        const currentUser = telegramAuthService.getCurrentUser();
        const token = telegramAuthService.getToken();

        if (currentUser && token) {
          // Try to refresh session to validate token
          try {
            const refreshedUser = await telegramAuthService.refreshSession();
            setUser(refreshedUser);
            setIsAuthenticated(true);
          } catch (refreshError) {
            console.warn('Session refresh failed, attempting re-authentication:', refreshError);
            // If refresh fails, try to authenticate again
            await authenticate();
          }
        } else {
          // No stored auth, attempt authentication
          await authenticate();
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setError(error.message);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * Authenticate user with Telegram
   */
  const authenticate = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await telegramAuthService.authenticate();
      
      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);
        return result.user;
      } else {
        throw new Error(result.message || 'Authentication failed');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError(error.message);
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await telegramAuthService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh user session
   */
  const refreshSession = useCallback(async () => {
    try {
      const refreshedUser = await telegramAuthService.refreshSession();
      setUser(refreshedUser);
      return refreshedUser;
    } catch (error) {
      console.error('Session refresh error:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (updates) => {
    try {
      const updatedUser = await telegramAuthService.updateProfile(updates);
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Profile update error:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  /**
   * Get user profile from server
   */
  const getProfile = useCallback(async () => {
    try {
      const userProfile = await telegramAuthService.getProfile();
      setUser(userProfile);
      return userProfile;
    } catch (error) {
      console.error('Get profile error:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Make authenticated API request
   */
  const apiRequest = useCallback(async (endpoint, options = {}) => {
    try {
      return await telegramAuthService.apiRequest(endpoint, options);
    } catch (error) {
      if (error.message.includes('Authentication expired')) {
        setIsAuthenticated(false);
        setUser(null);
      }
      throw error;
    }
  }, []);

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    
    // Actions
    authenticate,
    logout,
    refreshSession,
    updateProfile,
    getProfile,
    clearError,
    apiRequest,
    
    // Telegram-specific methods
    showAlert: telegramAuthService.showAlert.bind(telegramAuthService),
    showConfirm: telegramAuthService.showConfirm.bind(telegramAuthService),
    hapticFeedback: telegramAuthService.hapticFeedback.bind(telegramAuthService),
    getThemeParams: telegramAuthService.getThemeParams.bind(telegramAuthService),
    getTelegramUser: telegramAuthService.getTelegramUser.bind(telegramAuthService),
    isTelegramEnvironment: telegramAuthService.isTelegramEnvironment.bind(telegramAuthService)
  };
};

export default useAuth;