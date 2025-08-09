import { renderHook, act, waitFor } from '@testing-library/react';
import useOfflineProgress from './useOfflineProgress';
import OfflineProgressService from '../services/offlineProgressService';

// Mock the service
jest.mock('../services/offlineProgressService');

describe('useOfflineProgress', () => {
  let mockGameEngine;
  let mockOfflineProgressService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock game engine
    mockGameEngine = {
      state: {
        autoClickerRate: 10,
        coins: 1000,
        totalCoinsEarned: 5000,
        lastOfflineCalculation: Date.now() - 2 * 60 * 60 * 1000 // 2 hours ago
      },
      getState: jest.fn().mockReturnValue({
        autoClickerRate: 10,
        coins: 1000,
        totalCoinsEarned: 5000,
        lastOfflineCalculation: Date.now() - 2 * 60 * 60 * 1000 // 2 hours ago
      }),
      updateCoins: jest.fn(),
      saveState: jest.fn(),
      emit: jest.fn()
    };

    // Mock service methods
    mockOfflineProgressService = {
      getOfflineProgressPreview: jest.fn(),
      collectOfflineProgress: jest.fn(),
      calculateOfflineProgressLocally: jest.fn(),
      getOfflineProgressDisplayData: jest.fn(),
      shouldShowOfflineProgress: jest.fn(),
      formatOfflineTime: jest.fn(),
      formatCoins: jest.fn()
    };

    OfflineProgressService.mockImplementation(() => mockOfflineProgressService);
  });

  describe('initialization', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should check for offline progress on mount when game engine is available', async () => {
      const mockPreview = {
        success: true,
        canCollect: true,
        potentialEarnings: 72000,
        offlineHours: 2,
        breakdown: {}
      };

      const mockDisplayData = {
        shouldShow: true,
        title: 'Welcome Back!',
        earnings: 72000
      };

      mockOfflineProgressService.getOfflineProgressPreview.mockResolvedValue(mockPreview);
      mockOfflineProgressService.getOfflineProgressDisplayData.mockReturnValue(mockDisplayData);

      const { result } = renderHook(() => useOfflineProgress(mockGameEngine));

      // Fast-forward the timeout
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.isModalOpen).toBe(true);
        expect(result.current.offlineData).toEqual(mockDisplayData);
      });

      expect(mockOfflineProgressService.getOfflineProgressPreview).toHaveBeenCalled();
      expect(mockOfflineProgressService.getOfflineProgressDisplayData).toHaveBeenCalledWith({
        hasOfflineProgress: true,
        earnings: 72000,
        offlineHours: 2,
        breakdown: {}
      });
    });

    it('should not show modal when no offline progress is available', async () => {
      const mockPreview = {
        success: true,
        canCollect: false,
        potentialEarnings: 0,
        reason: 'No auto-clickers'
      };

      mockOfflineProgressService.getOfflineProgressPreview.mockResolvedValue(mockPreview);

      const { result } = renderHook(() => useOfflineProgress(mockGameEngine));

      // Fast-forward the timeout
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.isModalOpen).toBe(false);
        expect(result.current.offlineData).toBeNull();
      });
    });

    it('should handle errors during initialization', async () => {
      const error = new Error('Network error');
      mockOfflineProgressService.getOfflineProgressPreview.mockRejectedValue(error);

      const { result } = renderHook(() => useOfflineProgress(mockGameEngine));

      // Fast-forward the timeout
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
        expect(result.current.isModalOpen).toBe(false);
      });
    });

    it('should not check offline progress when game engine is not available', () => {
      renderHook(() => useOfflineProgress(null));

      expect(mockOfflineProgressService.getOfflineProgressPreview).not.toHaveBeenCalled();
    });
  });

  describe('collectOfflineProgress', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should collect offline progress successfully', async () => {
      const mockPreview = {
        success: true,
        canCollect: true,
        potentialEarnings: 72000,
        offlineHours: 2,
        breakdown: {}
      };

      const mockDisplayData = {
        shouldShow: true,
        title: 'Welcome Back!',
        earnings: 72000
      };

      const mockCollectResult = {
        success: true,
        hasOfflineProgress: true,
        earnings: 72000,
        newTotalCoins: 73000,
        breakdown: {}
      };

      const mockLocalCalculation = {
        earnings: 72000,
        offlineHours: 2,
        autoClickerRate: 10
      };

      mockOfflineProgressService.getOfflineProgressPreview.mockResolvedValue(mockPreview);
      mockOfflineProgressService.getOfflineProgressDisplayData.mockReturnValue(mockDisplayData);
      mockOfflineProgressService.calculateOfflineProgressLocally.mockReturnValue(mockLocalCalculation);
      mockOfflineProgressService.collectOfflineProgress.mockResolvedValue(mockCollectResult);

      const { result } = renderHook(() => useOfflineProgress(mockGameEngine));

      // Fast-forward the timeout and wait for initialization
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.isModalOpen).toBe(true);
      });

      // Collect offline progress
      await act(async () => {
        const collectResult = await result.current.collectOfflineProgress();
        expect(collectResult).toEqual(mockCollectResult);
      });

      expect(mockGameEngine.updateCoins).toHaveBeenCalledWith(72000);
      expect(mockGameEngine.saveState).toHaveBeenCalled();
      expect(mockGameEngine.emit).toHaveBeenCalledWith('offline_progress:collected', {
        earnings: 72000,
        offlineHours: undefined,
        newTotalCoins: 73000,
        breakdown: {}
      });
      expect(result.current.isModalOpen).toBe(false);
      expect(result.current.offlineData).toBeNull();
    });

    it('should handle collection errors', async () => {
      const mockPreview = {
        success: true,
        canCollect: true,
        potentialEarnings: 72000,
        offlineHours: 2,
        breakdown: {}
      };

      const mockDisplayData = {
        shouldShow: true,
        title: 'Welcome Back!',
        earnings: 72000
      };

      const mockLocalCalculation = {
        earnings: 72000,
        offlineHours: 2,
        autoClickerRate: 10
      };

      const error = new Error('Collection failed');

      mockOfflineProgressService.getOfflineProgressPreview.mockResolvedValue(mockPreview);
      mockOfflineProgressService.getOfflineProgressDisplayData.mockReturnValue(mockDisplayData);
      mockOfflineProgressService.calculateOfflineProgressLocally.mockReturnValue(mockLocalCalculation);
      mockOfflineProgressService.collectOfflineProgress.mockRejectedValue(error);

      const { result } = renderHook(() => useOfflineProgress(mockGameEngine));

      // Fast-forward the timeout and wait for initialization
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.isModalOpen).toBe(true);
      });

      // Try to collect offline progress
      await act(async () => {
        await expect(result.current.collectOfflineProgress()).rejects.toThrow('Collection failed');
      });

      expect(result.current.error).toBe('Collection failed');
      expect(mockGameEngine.updateCoins).not.toHaveBeenCalled();
    });

    it('should not collect when no game engine is available', async () => {
      const { result } = renderHook(() => useOfflineProgress(null));

      await act(async () => {
        const collectResult = await result.current.collectOfflineProgress();
        expect(collectResult).toBeUndefined();
      });

      expect(mockOfflineProgressService.collectOfflineProgress).not.toHaveBeenCalled();
    });
  });

  describe('closeModal', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should close modal and clear data', async () => {
      const mockPreview = {
        success: true,
        canCollect: true,
        potentialEarnings: 72000,
        offlineHours: 2,
        breakdown: {}
      };

      const mockDisplayData = {
        shouldShow: true,
        title: 'Welcome Back!',
        earnings: 72000
      };

      mockOfflineProgressService.getOfflineProgressPreview.mockResolvedValue(mockPreview);
      mockOfflineProgressService.getOfflineProgressDisplayData.mockReturnValue(mockDisplayData);

      const { result } = renderHook(() => useOfflineProgress(mockGameEngine));

      // Fast-forward the timeout and wait for initialization
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.isModalOpen).toBe(true);
      });

      // Close modal
      act(() => {
        result.current.closeModal();
      });

      expect(result.current.isModalOpen).toBe(false);
      expect(result.current.offlineData).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('checkOfflineProgress', () => {
    it('should manually check for offline progress', async () => {
      const mockPreview = {
        success: true,
        canCollect: true,
        potentialEarnings: 72000,
        offlineHours: 2,
        breakdown: {}
      };

      const mockDisplayData = {
        shouldShow: true,
        title: 'Welcome Back!',
        earnings: 72000
      };

      mockOfflineProgressService.getOfflineProgressPreview.mockResolvedValue(mockPreview);
      mockOfflineProgressService.getOfflineProgressDisplayData.mockReturnValue(mockDisplayData);

      const { result } = renderHook(() => useOfflineProgress(mockGameEngine));

      await act(async () => {
        const checkResult = await result.current.checkOfflineProgress();
        expect(checkResult).toEqual(mockDisplayData);
      });

      expect(result.current.isModalOpen).toBe(true);
      expect(result.current.offlineData).toEqual(mockDisplayData);
    });

    it('should return no progress when none available', async () => {
      const mockPreview = {
        success: true,
        canCollect: false,
        reason: 'No auto-clickers'
      };

      mockOfflineProgressService.getOfflineProgressPreview.mockResolvedValue(mockPreview);

      const { result } = renderHook(() => useOfflineProgress(mockGameEngine));

      await act(async () => {
        const checkResult = await result.current.checkOfflineProgress();
        expect(checkResult).toEqual({
          hasOfflineProgress: false,
          reason: 'No auto-clickers'
        });
      });

      expect(result.current.isModalOpen).toBe(false);
    });
  });

  describe('utility functions', () => {
    it('should provide utility functions', () => {
      mockOfflineProgressService.shouldShowOfflineProgress.mockReturnValue(true);
      mockOfflineProgressService.formatOfflineTime.mockReturnValue('2 hours');
      mockOfflineProgressService.formatCoins.mockReturnValue('72.0K');

      const { result } = renderHook(() => useOfflineProgress(mockGameEngine));

      expect(result.current.shouldShowOfflineProgress({}, new Date())).toBe(true);
      expect(result.current.formatOfflineTime(2)).toBe('2 hours');
      expect(result.current.formatCoins(72000)).toBe('72.0K');
    });
  });
});