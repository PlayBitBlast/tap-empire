import { useState, useEffect, useCallback } from 'react';
import OfflineProgressService from '../services/offlineProgressService';

/**
 * Custom hook for managing offline progress functionality
 */
const useOfflineProgress = (gameEngine) => {
  const [offlineProgressService] = useState(() => new OfflineProgressService());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [offlineData, setOfflineData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Check for offline progress when component mounts or game engine changes
   */
  useEffect(() => {
    if (!gameEngine) return;

    const checkOfflineProgress = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get offline progress preview from server
        const preview = await offlineProgressService.getOfflineProgressPreview();

        if (preview.success && preview.canCollect && preview.potentialEarnings > 0) {
          // Create display data
          const displayData = offlineProgressService.getOfflineProgressDisplayData({
            hasOfflineProgress: true,
            earnings: preview.potentialEarnings,
            offlineHours: preview.offlineHours,
            breakdown: preview.breakdown
          });

          setOfflineData(displayData);
          setIsModalOpen(true);
        }

      } catch (error) {
        console.error('Error checking offline progress:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    // Check offline progress after a short delay to ensure game engine is ready
    const timeoutId = setTimeout(checkOfflineProgress, 1000);

    return () => clearTimeout(timeoutId);
  }, [gameEngine, offlineProgressService]);

  /**
   * Collect offline progress earnings
   */
  const collectOfflineProgress = useCallback(async () => {
    if (!gameEngine || !offlineData) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get current game state for validation
      const gameState = gameEngine.getState();
      
      // Calculate local offline progress for validation
      const localCalculation = offlineProgressService.calculateOfflineProgressLocally(
        gameState,
        gameState.lastOfflineCalculation
      );

      // Collect offline progress from server
      const result = await offlineProgressService.collectOfflineProgress({
        earnings: localCalculation.earnings,
        offlineHours: localCalculation.offlineHours,
        autoClickerRate: localCalculation.autoClickerRate,
        timestamp: Date.now()
      });

      if (result.success && result.hasOfflineProgress) {
        // Update game engine with new coin amounts
        gameEngine.updateCoins(result.earnings);
        
        // Update offline calculation timestamp
        gameEngine.state.lastOfflineCalculation = Date.now();
        
        // Save updated state
        gameEngine.saveState();

        // Emit offline progress collected event
        gameEngine.emit('offline_progress:collected', {
          earnings: result.earnings,
          offlineHours: result.offlineHours,
          newTotalCoins: result.newTotalCoins,
          breakdown: result.breakdown
        });

        // Close modal
        setIsModalOpen(false);
        setOfflineData(null);

        return result;
      } else {
        throw new Error(result.error || 'No offline progress to collect');
      }

    } catch (error) {
      console.error('Error collecting offline progress:', error);
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [gameEngine, offlineData, offlineProgressService]);

  /**
   * Close the offline progress modal
   */
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setOfflineData(null);
    setError(null);
  }, []);

  /**
   * Manually check for offline progress (for testing or refresh)
   */
  const checkOfflineProgress = useCallback(async () => {
    if (!gameEngine) return;

    try {
      setIsLoading(true);
      setError(null);

      const preview = await offlineProgressService.getOfflineProgressPreview();

      if (preview.success && preview.canCollect && preview.potentialEarnings > 0) {
        const displayData = offlineProgressService.getOfflineProgressDisplayData({
          hasOfflineProgress: true,
          earnings: preview.potentialEarnings,
          offlineHours: preview.offlineHours,
          breakdown: preview.breakdown
        });

        setOfflineData(displayData);
        setIsModalOpen(true);
        return displayData;
      } else {
        return {
          hasOfflineProgress: false,
          reason: preview.reason || 'No offline progress available'
        };
      }

    } catch (error) {
      console.error('Error checking offline progress:', error);
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [gameEngine, offlineProgressService]);

  /**
   * Get offline progress preview without showing modal
   */
  const getOfflineProgressPreview = useCallback(async () => {
    try {
      const preview = await offlineProgressService.getOfflineProgressPreview();
      return preview;
    } catch (error) {
      console.error('Error getting offline progress preview:', error);
      setError(error.message);
      throw error;
    }
  }, [offlineProgressService]);

  /**
   * Check if offline progress should be shown based on local calculation
   */
  const shouldShowOfflineProgress = useCallback((gameState, lastOfflineCalculation) => {
    return offlineProgressService.shouldShowOfflineProgress(gameState, lastOfflineCalculation);
  }, [offlineProgressService]);

  /**
   * Format offline time for display
   */
  const formatOfflineTime = useCallback((hours) => {
    return offlineProgressService.formatOfflineTime(hours);
  }, [offlineProgressService]);

  /**
   * Format coins for display
   */
  const formatCoins = useCallback((coins) => {
    return offlineProgressService.formatCoins(coins);
  }, [offlineProgressService]);

  return {
    // State
    isModalOpen,
    offlineData,
    isLoading,
    error,

    // Actions
    collectOfflineProgress,
    closeModal,
    checkOfflineProgress,
    getOfflineProgressPreview,

    // Utilities
    shouldShowOfflineProgress,
    formatOfflineTime,
    formatCoins,

    // Service instance (for advanced usage)
    offlineProgressService
  };
};

export default useOfflineProgress;