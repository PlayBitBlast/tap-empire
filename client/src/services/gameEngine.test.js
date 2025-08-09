// GameEngine.test.js - Unit tests for the GameEngine class

import GameEngine from './gameEngine';
import { GAME_CONFIG } from '../shared/constants/gameConfig';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock shared utilities
jest.mock('../shared/utils/calculations', () => ({
  calculateCoinsPerTap: jest.fn(() => 1),
  calculateAutoClickerRate: jest.fn(() => 0),
  calculateGoldenTapChance: jest.fn(() => 0.02),
  calculateGoldenTapEarnings: jest.fn((base) => base * 10),
  validateTapRate: jest.fn(() => true),
  generateGameStateChecksum: jest.fn(() => 'mock-checksum')
}));

describe('GameEngine', () => {
  let gameEngine;
  let mockCalculations;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    mockCalculations = require('../shared/utils/calculations');
    gameEngine = new GameEngine();
    gameEngine.start();
  });

  afterEach(() => {
    if (gameEngine) {
      gameEngine.destroy();
    }
  });

  describe('Initialization', () => {
    test('should initialize with default state', () => {
      const state = gameEngine.getState();
      
      expect(state.coins).toBe(0);
      expect(state.totalCoinsEarned).toBe(0);
      expect(state.coinsPerTap).toBe(GAME_CONFIG.INITIAL_COINS_PER_TAP);
      expect(state.autoClickerRate).toBe(GAME_CONFIG.INITIAL_AUTO_CLICKER_RATE);
      expect(state.upgrades).toEqual({
        tap_multiplier: 0,
        auto_clicker: 0,
        golden_tap_chance: 0,
        offline_earnings: 0
      });
    });
  });

  describe('Game Loop', () => {
    test('should start and stop game loop', () => {
      gameEngine.stop();
      expect(gameEngine.isRunning).toBe(false);
      
      gameEngine.start();
      expect(gameEngine.isRunning).toBe(true);
      expect(gameEngine.gameLoopId).toBeTruthy();
      
      gameEngine.stop();
      expect(gameEngine.isRunning).toBe(false);
      expect(gameEngine.gameLoopId).toBe(null);
    });
  });

  describe('Tap Handling', () => {
    test('should handle normal tap correctly', () => {
      mockCalculations.calculateCoinsPerTap.mockReturnValue(5);
      mockCalculations.calculateGoldenTapChance.mockReturnValue(0);
      mockCalculations.validateTapRate.mockReturnValue(true);
      
      const initialCoins = gameEngine.state.coins;
      const tapResult = gameEngine.handleTap({ position: { x: 100, y: 200 } });
      
      expect(tapResult).toBeTruthy();
      expect(tapResult.earnings).toBe(5);
      expect(tapResult.isGoldenTap).toBe(false);
      expect(gameEngine.state.coins).toBe(initialCoins + 5);
      expect(gameEngine.state.sessionStats.tapsThisSession).toBe(1);
    });

    test('should handle golden tap correctly', () => {
      mockCalculations.calculateCoinsPerTap.mockReturnValue(5);
      mockCalculations.calculateGoldenTapChance.mockReturnValue(1);
      mockCalculations.calculateGoldenTapEarnings.mockReturnValue(50);
      mockCalculations.validateTapRate.mockReturnValue(true);
      
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0);
      
      const initialCoins = gameEngine.state.coins;
      const tapResult = gameEngine.handleTap();
      
      expect(tapResult.earnings).toBe(50);
      expect(tapResult.isGoldenTap).toBe(true);
      expect(gameEngine.state.coins).toBe(initialCoins + 50);
      expect(gameEngine.state.sessionStats.goldenTapsThisSession).toBe(1);
      
      Math.random = originalRandom;
    });

    test('should reject taps when rate limited', () => {
      mockCalculations.validateTapRate.mockReturnValue(false);
      
      const tapResult = gameEngine.handleTap();
      
      expect(tapResult).toBe(null);
    });

    test('should not handle taps when engine is stopped', () => {
      gameEngine.stop();
      
      const tapResult = gameEngine.handleTap();
      
      expect(tapResult).toBe(null);
    });
  });

  describe('Coin Management', () => {
    test('should update coins correctly', () => {
      const initialCoins = gameEngine.state.coins;
      const initialTotal = gameEngine.state.totalCoinsEarned;
      
      gameEngine.updateCoins(100);
      
      expect(gameEngine.state.coins).toBe(initialCoins + 100);
      expect(gameEngine.state.totalCoinsEarned).toBe(initialTotal + 100);
    });

    test('should recalculate derived values when coins update', () => {
      mockCalculations.calculateCoinsPerTap.mockReturnValue(10);
      mockCalculations.calculateAutoClickerRate.mockReturnValue(5);
      
      gameEngine.updateCoins(100);
      
      expect(mockCalculations.calculateCoinsPerTap).toHaveBeenCalledWith(gameEngine.state);
      expect(mockCalculations.calculateAutoClickerRate).toHaveBeenCalledWith(gameEngine.state);
      expect(gameEngine.state.coinsPerTap).toBe(10);
      expect(gameEngine.state.autoClickerRate).toBe(5);
    });
  }); 
 describe('Offline Progress', () => {
    test('should calculate offline progress correctly', () => {
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      gameEngine.state.lastOfflineCalculation = oneHourAgo;
      gameEngine.state.autoClickerRate = 10;
      
      const initialCoins = gameEngine.state.coins;
      const offlineResult = gameEngine.calculateOfflineProgress();
      
      expect(offlineResult).toBeTruthy();
      expect(offlineResult.earnings).toBeGreaterThan(0);
      expect(offlineResult.hoursOffline).toBeCloseTo(1, 1);
      expect(gameEngine.state.coins).toBeGreaterThan(initialCoins);
    });

    test('should not calculate offline progress for short periods', () => {
      const thirtySecondsAgo = Date.now() - 30000;
      gameEngine.state.lastOfflineCalculation = thirtySecondsAgo;
      
      const offlineResult = gameEngine.calculateOfflineProgress();
      
      expect(offlineResult).toBe(null);
    });

    test('should cap offline earnings at maximum hours', () => {
      const tenHoursAgo = Date.now() - (10 * 60 * 60 * 1000);
      gameEngine.state.lastOfflineCalculation = tenHoursAgo;
      gameEngine.state.autoClickerRate = 10;
      
      const offlineResult = gameEngine.calculateOfflineProgress();
      
      expect(offlineResult.hoursOffline).toBe(GAME_CONFIG.OFFLINE_EARNINGS_CAP_HOURS);
    });
  });

  describe('Synchronization', () => {
    test('should queue sync operations', () => {
      gameEngine.queueSync('tap', { earnings: 10 });
      
      expect(gameEngine.syncQueue).toHaveLength(1);
      expect(gameEngine.syncQueue[0].operation).toBe('tap');
      expect(gameEngine.syncQueue[0].data.earnings).toBe(10);
    });

    test('should limit sync queue size', () => {
      for (let i = 0; i < GAME_CONFIG.BATCH_SYNC_SIZE * 3; i++) {
        gameEngine.queueSync('tap', { earnings: i });
      }
      
      expect(gameEngine.syncQueue.length).toBeLessThanOrEqual(GAME_CONFIG.BATCH_SYNC_SIZE * 2);
    });

    test('should handle server sync response', () => {
      const mockResponse = { success: true };
      const emitSpy = jest.spyOn(gameEngine, 'emit');
      
      gameEngine.handleSyncResponse(mockResponse);
      
      expect(emitSpy).toHaveBeenCalledWith('sync:success', mockResponse);
    });

    test('should apply server corrections', () => {
      const serverState = {
        coins: 1000,
        totalCoinsEarned: 2000
      };
      
      gameEngine.applyServerCorrection(serverState);
      
      expect(gameEngine.state.coins).toBe(1000);
      expect(gameEngine.state.totalCoinsEarned).toBe(2000);
    });
  }); 
 describe('Event System', () => {
    test('should add and remove event listeners', () => {
      const callback = jest.fn();
      
      gameEngine.on('test:event', callback);
      gameEngine.emit('test:event', { data: 'test' });
      
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
      
      gameEngine.off('test:event', callback);
      gameEngine.emit('test:event', { data: 'test2' });
      
      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('should handle multiple listeners for same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      gameEngine.on('test:event', callback1);
      gameEngine.on('test:event', callback2);
      gameEngine.emit('test:event', { data: 'test' });
      
      expect(callback1).toHaveBeenCalledWith({ data: 'test' });
      expect(callback2).toHaveBeenCalledWith({ data: 'test' });
    });
  });

  describe('Session Statistics', () => {
    test('should track session statistics', () => {
      mockCalculations.calculateCoinsPerTap.mockReturnValue(5);
      mockCalculations.calculateGoldenTapChance.mockReturnValue(0);
      mockCalculations.validateTapRate.mockReturnValue(true);
      
      // Set session start time to a bit in the past
      gameEngine.state.sessionStats.sessionStartTime = Date.now() - 1000;
      
      gameEngine.handleTap();
      gameEngine.handleTap();
      
      const stats = gameEngine.getSessionStats();
      
      expect(stats.tapsThisSession).toBe(2);
      expect(stats.sessionDuration).toBeGreaterThan(0);
    });

    test('should reset session statistics', () => {
      gameEngine.state.sessionStats.tapsThisSession = 10;
      
      gameEngine.resetSessionStats();
      
      expect(gameEngine.state.sessionStats.tapsThisSession).toBe(0);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup resources on destroy', () => {
      gameEngine.on('test:event', jest.fn());
      gameEngine.queueSync('test', {});
      
      gameEngine.destroy();
      
      expect(gameEngine.isRunning).toBe(false);
      expect(gameEngine.eventListeners.size).toBe(0);
      expect(gameEngine.syncQueue).toHaveLength(0);
    });
  });
});