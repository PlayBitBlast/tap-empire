import { useState, useEffect, useRef, useCallback } from 'react';
import GameEngine from '../services/gameEngine';

/**
 * Custom hook for managing game engine state and interactions
 */
const useGameEngine = () => {
  const [gameState, setGameState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGoldenTap, setIsGoldenTap] = useState(false);
  const [lastTapResult, setLastTapResult] = useState(null);
  const gameEngineRef = useRef(null);
  const goldenTapTimeoutRef = useRef(null);

  // Initialize game engine
  useEffect(() => {
    try {
      const engine = new GameEngine();
      gameEngineRef.current = engine;

      // Set up event listeners
      const handleStateUpdate = (data) => {
        setGameState(engine.getState());
      };

      const handleTapSuccess = (tapResult) => {
        setLastTapResult(tapResult);
        
        if (tapResult.isGoldenTap) {
          setIsGoldenTap(true);
          
          // Clear any existing timeout
          if (goldenTapTimeoutRef.current) {
            clearTimeout(goldenTapTimeoutRef.current);
          }
          
          // Reset golden tap state after animation
          goldenTapTimeoutRef.current = setTimeout(() => {
            setIsGoldenTap(false);
          }, 2000);
        }
      };

      const handleCoinsUpdated = () => {
        setGameState(engine.getState());
      };

      const handleEngineStarted = () => {
        setGameState(engine.getState());
        setIsLoading(false);
        setError(null);
      };

      const handleRateLimited = (data) => {
        setError({
          type: 'RATE_LIMITED',
          message: data.message,
          cooldownTime: data.cooldownTime
        });
        
        // Clear error after cooldown
        setTimeout(() => {
          setError(null);
        }, data.cooldownTime);
      };

      const handleSyncFailed = (data) => {
        setError({
          type: 'SYNC_FAILED',
          message: 'Connection lost. Retrying...',
          data
        });
      };

      const handleSyncSuccess = () => {
        if (error?.type === 'SYNC_FAILED') {
          setError(null);
        }
      };

      // Register event listeners
      engine.on('engine:started', handleEngineStarted);
      engine.on('tap:success', handleTapSuccess);
      engine.on('tap:rate_limited', handleRateLimited);
      engine.on('coins:updated', handleCoinsUpdated);
      engine.on('sync:failed', handleSyncFailed);
      engine.on('sync:success', handleSyncSuccess);
      engine.on('state:corrected', handleStateUpdate);

      // Start the engine
      engine.start();

      // Cleanup function
      return () => {
        engine.off('engine:started', handleEngineStarted);
        engine.off('tap:success', handleTapSuccess);
        engine.off('tap:rate_limited', handleRateLimited);
        engine.off('coins:updated', handleCoinsUpdated);
        engine.off('sync:failed', handleSyncFailed);
        engine.off('sync:success', handleSyncSuccess);
        engine.off('state:corrected', handleStateUpdate);
        
        engine.destroy();
        
        if (goldenTapTimeoutRef.current) {
          clearTimeout(goldenTapTimeoutRef.current);
        }
      };
    } catch (err) {
      console.error('Failed to initialize game engine:', err);
      setError({
        type: 'INITIALIZATION_FAILED',
        message: 'Failed to start game engine',
        error: err
      });
      setIsLoading(false);
    }
  }, [error?.type]);

  // Handle tap action
  const handleTap = useCallback((tapData) => {
    if (!gameEngineRef.current || isLoading || error?.type === 'RATE_LIMITED') {
      return null;
    }

    try {
      return gameEngineRef.current.handleTap(tapData);
    } catch (err) {
      console.error('Tap handling error:', err);
      setError({
        type: 'TAP_ERROR',
        message: 'Failed to process tap',
        error: err
      });
      return null;
    }
  }, [isLoading, error?.type]);

  // Force sync with server
  const forceSync = useCallback(() => {
    if (gameEngineRef.current) {
      gameEngineRef.current.forceSync();
    }
  }, []);

  // Get session statistics
  const getSessionStats = useCallback(() => {
    if (gameEngineRef.current) {
      return gameEngineRef.current.getSessionStats();
    }
    return null;
  }, []);

  // Reset session statistics
  const resetSessionStats = useCallback(() => {
    if (gameEngineRef.current) {
      gameEngineRef.current.resetSessionStats();
    }
  }, []);

  return {
    // State
    gameState,
    gameEngine: gameEngineRef.current,
    isLoading,
    error,
    isGoldenTap,
    lastTapResult,
    
    // Actions
    handleTap,
    forceSync,
    getSessionStats,
    resetSessionStats,
    
    // Computed values
    coins: gameState?.coins || 0,
    coinsPerTap: gameState?.coinsPerTap || 1,
    totalCoinsEarned: gameState?.totalCoinsEarned || 0,
    autoClickerRate: gameState?.autoClickerRate || 0,
    upgrades: gameState?.upgrades || {},
    achievements: gameState?.achievements || [],
    prestige: gameState?.prestige || { level: 0, points: 0 },
    streak: gameState?.streak || { days: 0, lastLogin: null }
  };
};

export default useGameEngine;