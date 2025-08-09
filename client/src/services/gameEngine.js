// GameEngine.js - Core game engine for Tap Empire
// Handles state management, game loop, and local persistence

import {
  calculateCoinsPerTap,
  calculateAutoClickerRate,
  calculateGoldenTapChance,
  calculateGoldenTapEarnings,
  calculatePrestigeMultiplier,
  validateTapRate,
  generateGameStateChecksum,
  calculateUpgradeCost,
  calculateUpgradeEffect
} from '../shared/utils/calculations';

import { GAME_CONFIG } from '../shared/constants/gameConfig';
import ErrorHandler from '../utils/errorHandler';

/**
 * Core game engine class that manages game state, calculations, and synchronization
 */
class GameEngine {
  constructor() {
    this.state = this.getInitialState();
    this.eventListeners = new Map();
    this.syncQueue = [];
    this.gameLoopId = null;
    this.lastSyncTime = Date.now();
    this.tapTimestamps = [];
    this.isRunning = false;
    this.animations = [];

    // Bind methods to preserve context
    this.gameLoop = this.gameLoop.bind(this);
    this.handleTap = this.handleTap.bind(this);
    this.updateAutoClickers = this.updateAutoClickers.bind(this);

    // Load saved state from localStorage
    this.loadState();
  }

  /**
   * Get initial game state
   */
  getInitialState() {
    return {
      coins: 0,
      totalCoinsEarned: 0,
      coinsPerTap: GAME_CONFIG.INITIAL_COINS_PER_TAP,
      autoClickerRate: GAME_CONFIG.INITIAL_AUTO_CLICKER_RATE,
      upgrades: {
        tap_multiplier: 0,
        auto_clicker: 0,
        golden_tap_chance: 0,
        offline_earnings: 0
      },
      prestige: {
        level: 0,
        points: 0,
        totalPrestiges: 0
      },
      achievements: [],
      streak: {
        days: 0,
        lastLogin: null,
        lastBonus: null
      },
      lastOfflineCalculation: Date.now(),
      activeEventMultiplier: 1,
      goldenTapStreak: 0,
      sessionStats: {
        tapsThisSession: 0,
        coinsEarnedThisSession: 0,
        goldenTapsThisSession: 0,
        sessionStartTime: Date.now()
      }
    };
  }

  /**
   * Update event multipliers from event service
   */
  updateEventMultipliers(eventMultipliers) {
    this.state.activeEventMultiplier = eventMultipliers.totalMultiplier || 1;
    this.emit('state:updated', { 
      type: 'event_multipliers',
      eventMultipliers: eventMultipliers
    });
    this.saveState();
  }

  /**
   * Start the game engine and begin the game loop
   */
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.calculateOfflineProgress();
    this.startGameLoop();
    this.emit('engine:started', { state: this.state });
  }

  /**
   * Stop the game engine and save state
   */
  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.stopGameLoop();
    this.saveState();
    this.emit('engine:stopped');
  }

  /**
   * Start the 60fps game loop
   */
  startGameLoop() {
    if (this.gameLoopId) return;

    this.gameLoopId = setInterval(this.gameLoop, GAME_CONFIG.GAME_LOOP_INTERVAL_MS);
  }

  /**
   * Stop the game loop
   */
  stopGameLoop() {
    if (this.gameLoopId) {
      clearInterval(this.gameLoopId);
      this.gameLoopId = null;
    }
  }

  /**
   * Main game loop - runs at 60fps
   */
  gameLoop() {
    if (!this.isRunning) return;

    const now = Date.now();
    const deltaTime = now - (this.lastGameLoopTime || now);
    this.lastGameLoopTime = now;

    // Update auto-clickers
    this.updateAutoClickers(deltaTime);

    // Process animations
    this.updateAnimations(deltaTime);

    // Sync to server periodically
    if (now - this.lastSyncTime > GAME_CONFIG.SYNC_INTERVAL_MS) {
      this.syncToServer();
      this.lastSyncTime = now;
    }

    // Save state periodically
    if (now - (this.lastSaveTime || 0) > 30000) { // Save every 30 seconds
      this.saveState();
      this.lastSaveTime = now;
    }
  }

  /**
   * Handle tap action with optimistic updates
   */
  handleTap(tapData = {}) {
    const now = Date.now();
    
    try {
      if (!this.isRunning) return null;

      // Add timestamp for rate limiting validation
      this.tapTimestamps.push(now);

      // Clean old timestamps (keep only last second)
      this.tapTimestamps = this.tapTimestamps.filter(
        timestamp => timestamp > now - GAME_CONFIG.TAP_VALIDATION_WINDOW_MS
      );

      // Validate tap rate (anti-cheat)
      if (!validateTapRate(this.tapTimestamps)) {
        const rateLimitError = {
          type: 'RATE_LIMITED',
          code: 'TAP_RATE_EXCEEDED',
          message: 'Tapping too fast!',
          retryAfter: 1000
        };
        
        ErrorHandler.handleGameError(rateLimitError, { gameEngine: this });
        
        this.emit('tap:rate_limited', {
          message: 'Tapping too fast!',
          cooldownTime: 1000
        });
        return null;
      }
    } catch (error) {
      ErrorHandler.handleGameError({
        type: 'VALIDATION_ERROR',
        code: 'TAP_VALIDATION_FAILED',
        message: 'Failed to validate tap',
        originalError: error
      }, { gameEngine: this });
      return null;
    }

    // Calculate earnings
    const baseEarnings = calculateCoinsPerTap(this.state);
    const goldenTapChance = calculateGoldenTapChance(this.state);
    const isGoldenTap = Math.random() < goldenTapChance;

    let earnings = baseEarnings;
    if (isGoldenTap) {
      earnings = calculateGoldenTapEarnings(baseEarnings);
      this.state.goldenTapStreak++;
      this.state.sessionStats.goldenTapsThisSession++;
    } else {
      this.state.goldenTapStreak = 0;
    }

    // Update state optimistically
    this.updateCoins(earnings);
    this.state.sessionStats.tapsThisSession++;
    this.state.sessionStats.coinsEarnedThisSession += earnings;

    // Create tap result
    const tapResult = {
      earnings,
      isGoldenTap,
      totalCoins: this.state.coins,
      coinsPerTap: baseEarnings,
      timestamp: now,
      position: tapData.position || { x: 0, y: 0 }
    };

    // Add to sync queue
    this.queueSync('tap', {
      earnings,
      isGoldenTap,
      timestamp: now,
      clientChecksum: generateGameStateChecksum(this.state)
    });

    // Trigger animations and events
    this.triggerTapAnimation(tapResult);
    this.emit('tap:success', tapResult);

    // Emit golden tap event for special handling
    if (isGoldenTap) {
      this.emit('golden_tap:triggered', {
        earnings,
        multiplier: GAME_CONFIG.GOLDEN_TAP_MULTIPLIER,
        totalGoldenTaps: this.state.sessionStats.goldenTapsThisSession
      });
    }

    return tapResult;
  }
  /**
    * Update auto-clicker earnings
    */
  updateAutoClickers(deltaTime) {
    if (this.state.autoClickerRate <= 0) return;

    const secondsElapsed = deltaTime / 1000;
    const earnings = Math.floor(this.state.autoClickerRate * secondsElapsed);

    if (earnings > 0) {
      this.updateCoins(earnings);
      this.emit('auto_clicker:earnings', { earnings, totalCoins: this.state.coins });
    }
  }

  /**
   * Update coin count and related calculations
   */
  updateCoins(amount) {
    this.state.coins += amount;
    this.state.totalCoinsEarned += amount;

    // Recalculate derived values
    this.state.coinsPerTap = calculateCoinsPerTap(this.state);
    this.state.autoClickerRate = calculateAutoClickerRate(this.state);

    this.emit('coins:updated', {
      coins: this.state.coins,
      totalEarned: this.state.totalCoinsEarned,
      amount
    });
  }

  /**
   * Calculate offline progress locally (for preview and validation)
   * Note: Actual collection should be done through the server
   */
  calculateOfflineProgress() {
    const now = Date.now();
    const lastCalculation = this.state.lastOfflineCalculation || now;
    const offlineTime = now - lastCalculation;

    // Only calculate if offline for more than 1 minute
    if (offlineTime < 60000) {
      return {
        hasOfflineProgress: false,
        reason: 'Not enough offline time',
        offlineHours: 0,
        earnings: 0
      };
    }

    const offlineHours = offlineTime / (1000 * 60 * 60);
    const cappedHours = Math.min(offlineHours, GAME_CONFIG.OFFLINE_EARNINGS_CAP_HOURS);

    if (this.state.autoClickerRate > 0 && cappedHours > 0) {
      const offlineEarnings = Math.floor(this.state.autoClickerRate * cappedHours * 3600);

      if (offlineEarnings > 0) {
        const offlineResult = {
          hasOfflineProgress: true,
          earnings: offlineEarnings,
          offlineHours: cappedHours,
          actualOfflineHours: offlineHours,
          autoClickerRate: this.state.autoClickerRate,
          lastCalculation: lastCalculation
        };

        this.emit('offline:progress_calculated', offlineResult);
        return offlineResult;
      }
    }

    return {
      hasOfflineProgress: false,
      reason: 'No auto-clickers or no earnings',
      offlineHours: cappedHours,
      earnings: 0
    };
  }

  /**
   * Apply offline progress earnings (called after server validation)
   * @param {number} earnings - Validated earnings from server
   * @param {number} newTimestamp - New offline calculation timestamp
   */
  applyOfflineProgress(earnings, newTimestamp) {
    if (earnings > 0) {
      this.updateCoins(earnings);
      this.state.lastOfflineCalculation = newTimestamp || Date.now();
      
      this.emit('offline:progress_applied', {
        earnings,
        newTimestamp: this.state.lastOfflineCalculation,
        totalCoins: this.state.coins
      });
    }
  }  /**

   * Trigger tap animation
   */
  triggerTapAnimation(tapResult) {
    const animation = {
      id: Date.now() + Math.random(),
      type: tapResult.isGoldenTap ? 'golden_tap' : 'normal_tap',
      earnings: tapResult.earnings,
      position: tapResult.position,
      startTime: Date.now(),
      duration: GAME_CONFIG.FLOATING_COIN_DURATION_MS
    };

    this.animations.push(animation);
    this.emit('animation:tap', animation);
  }

  /**
   * Update animations
   */
  updateAnimations(deltaTime) {
    const now = Date.now();

    // Remove completed animations
    this.animations = this.animations.filter(animation => {
      const elapsed = now - animation.startTime;
      return elapsed < animation.duration;
    });

    // Emit animation updates
    if (this.animations.length > 0) {
      this.emit('animation:update', { animations: this.animations, deltaTime });
    }
  }

  /**
   * Set sync manager for server communication
   * @param {SyncManager} syncManager - Sync manager instance
   */
  setSyncManager(syncManager) {
    this.syncManager = syncManager;
  }

  /**
   * Queue operation for server synchronization
   */
  queueSync(operation, data, options = {}) {
    if (this.syncManager) {
      this.syncManager.queueSync(operation, data, options);
    } else {
      // Fallback to local queue if sync manager not available
      this.syncQueue.push({
        operation,
        data,
        timestamp: Date.now(),
        id: Date.now() + Math.random()
      });

      // Limit queue size to prevent memory issues
      if (this.syncQueue.length > GAME_CONFIG.BATCH_SYNC_SIZE * 2) {
        this.syncQueue = this.syncQueue.slice(-GAME_CONFIG.BATCH_SYNC_SIZE);
      }
    }
  }

  /**
   * Sync queued operations to server
   */
  syncToServer() {
    if (this.syncManager) {
      this.syncManager.sync();
    } else if (this.syncQueue.length > 0) {
      // Fallback sync without sync manager
      const batch = this.syncQueue.splice(0, GAME_CONFIG.BATCH_SYNC_SIZE);
      const syncData = {
        operations: batch,
        timestamp: Date.now(),
        checksum: generateGameStateChecksum(this.state)
      };

      this.emit('sync:request', syncData);
    }
  }

  /**
   * Force immediate sync to server
   */
  forceSync() {
    if (this.syncManager) {
      this.syncManager.forceFullSync();
    } else {
      this.syncToServer();
    }
  }  /**

   * Handle server sync response
   */
  handleSyncResponse(response) {
    if (response.success) {
      // Server accepted our state
      this.emit('sync:success', response);
    } else if (response.correction) {
      // Server corrected our state
      this.applyServerCorrection(response.correction);
      this.emit('sync:corrected', response);
    } else {
      // Sync failed
      this.emit('sync:failed', response);
    }
  }

  /**
   * Apply server state correction
   */
  applyServerCorrection(serverState) {
    // Merge server state with client state
    this.state = {
      ...this.state,
      ...serverState,
      // Preserve client-only state
      animations: this.state.animations,
      sessionStats: this.state.sessionStats
    };

    // Recalculate derived values
    this.state.coinsPerTap = calculateCoinsPerTap(this.state);
    this.state.autoClickerRate = calculateAutoClickerRate(this.state);

    this.emit('state:corrected', { newState: this.state });
  }

  /**
   * Save game state to localStorage
   */
  saveState() {
    try {
      const stateToSave = {
        ...this.state,
        // Don't save temporary data
        animations: undefined,
        sessionStats: undefined
      };

      localStorage.setItem('tapEmpire:gameState', JSON.stringify(stateToSave));
      localStorage.setItem('tapEmpire:lastSave', Date.now().toString());

      this.emit('state:saved');
    } catch (error) {
      ErrorHandler.handleGameError({
        type: 'STORAGE_ERROR',
        code: 'SAVE_FAILED',
        message: 'Failed to save game state',
        originalError: error
      }, { gameEngine: this });
      
      this.emit('state:save_failed', { error });
    }
  }

  /**
   * Load game state from localStorage
   */
  loadState() {
    try {
      const savedState = localStorage.getItem('tapEmpire:gameState');
      const lastSave = localStorage.getItem('tapEmpire:lastSave');

      if (savedState && lastSave) {
        const parsedState = JSON.parse(savedState);
        const saveTime = parseInt(lastSave);

        // Merge saved state with initial state
        this.state = {
          ...this.getInitialState(),
          ...parsedState,
          lastOfflineCalculation: saveTime
        };

        // Recalculate derived values
        this.state.coinsPerTap = calculateCoinsPerTap(this.state);
        this.state.autoClickerRate = calculateAutoClickerRate(this.state);

        this.emit('state:loaded', { state: this.state });
      }
    } catch (error) {
      ErrorHandler.handleGameError({
        type: 'STORAGE_ERROR',
        code: 'LOAD_FAILED',
        message: 'Failed to load game state',
        originalError: error
      }, { gameEngine: this });
      
      this.state = this.getInitialState();
      this.emit('state:load_failed', { error });
    }
  }
  /**
     * Get current game state (read-only)
     */
  getState() {
    return { ...this.state };
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    const now = Date.now();
    const sessionDuration = now - this.state.sessionStats.sessionStartTime;

    return {
      ...this.state.sessionStats,
      sessionDuration,
      averageTapsPerMinute: this.state.sessionStats.tapsThisSession / (sessionDuration / 60000),
      averageCoinsPerTap: this.state.sessionStats.tapsThisSession > 0
        ? this.state.sessionStats.coinsEarnedThisSession / this.state.sessionStats.tapsThisSession
        : 0
    };
  }

  /**
   * Reset session statistics
   */
  resetSessionStats() {
    this.state.sessionStats = {
      tapsThisSession: 0,
      coinsEarnedThisSession: 0,
      goldenTapsThisSession: 0,
      sessionStartTime: Date.now()
    };

    this.emit('session:reset');
  }

  /**
   * Event system - add event listener
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Event system - remove event listener
   */
  off(event, callback) {
    if (!this.eventListeners.has(event)) return;

    const listeners = this.eventListeners.get(event);
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Event system - emit event
   */
  emit(event, data) {
    if (!this.eventListeners.has(event)) return;

    const listeners = this.eventListeners.get(event);
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Purchase an upgrade
   * @param {string} upgradeType - Type of upgrade to purchase
   * @returns {Promise<Object>} Purchase result
   */
  async purchaseUpgrade(upgradeType) {
    try {
      // Optimistically update the upgrade level
      const currentLevel = this.state.upgrades[upgradeType] || 0;
      const newLevel = currentLevel + 1;

      // Calculate cost and validate locally first
      const cost = calculateUpgradeCost(upgradeType, currentLevel);

      if (this.state.coins < cost) {
        throw new Error('Insufficient coins');
      }

      // Update state optimistically
      this.state.upgrades[upgradeType] = newLevel;
      this.state.coins -= cost;

      // Recalculate derived values
      this.state.coinsPerTap = calculateCoinsPerTap(this.state);
      this.state.autoClickerRate = calculateAutoClickerRate(this.state);

      // Queue sync operation
      this.queueSync('upgrade_purchase', {
        upgradeType,
        oldLevel: currentLevel,
        newLevel,
        cost,
        timestamp: Date.now()
      });

      // Emit events
      this.emit('upgrade:purchased', {
        upgradeType,
        oldLevel: currentLevel,
        newLevel,
        cost,
        newCoinsPerTap: this.state.coinsPerTap,
        newAutoClickerRate: this.state.autoClickerRate
      });

      this.emit('coins:updated', {
        coins: this.state.coins,
        totalEarned: this.state.totalCoinsEarned,
        amount: -cost
      });

      return {
        success: true,
        upgradeType,
        oldLevel: currentLevel,
        newLevel,
        cost
      };
    } catch (error) {
      this.emit('upgrade:purchase_failed', {
        upgradeType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get upgrade information
   * @param {string} upgradeType - Type of upgrade
   * @returns {Object} Upgrade information
   */
  getUpgradeInfo(upgradeType) {
    const { UPGRADE_CONFIGS } = require('../shared/constants/gameConfig');
    const config = UPGRADE_CONFIGS[upgradeType];

    if (!config) {
      throw new Error('Invalid upgrade type');
    }

    const currentLevel = this.state.upgrades[upgradeType] || 0;
    const currentCost = calculateUpgradeCost(upgradeType, currentLevel);
    const currentEffect = calculateUpgradeEffect(upgradeType, currentLevel);
    const nextEffect = calculateUpgradeEffect(upgradeType, currentLevel + 1);

    return {
      type: upgradeType,
      name: config.name,
      description: config.description,
      category: config.category,
      currentLevel,
      maxLevel: config.maxLevel,
      currentCost,
      currentEffect,
      nextEffect,
      effectIncrease: nextEffect - currentEffect,
      canAfford: this.state.coins >= currentCost,
      isMaxLevel: currentLevel >= config.maxLevel
    };
  }

  /**
   * Get all available upgrades
   * @returns {Object} All upgrade information
   */
  getAllUpgrades() {
    const { UPGRADE_CONFIGS } = require('../shared/constants/gameConfig');
    const upgrades = {};

    for (const upgradeType of Object.keys(UPGRADE_CONFIGS)) {
      upgrades[upgradeType] = this.getUpgradeInfo(upgradeType);
    }

    return upgrades;
  }

  /**
   * Check if user can afford an upgrade
   * @param {string} upgradeType - Type of upgrade
   * @returns {boolean} Whether user can afford the upgrade
   */
  canAffordUpgrade(upgradeType) {
    const currentLevel = this.state.upgrades[upgradeType] || 0;
    const cost = calculateUpgradeCost(upgradeType, currentLevel);
    return this.state.coins >= cost;
  }

  /**
   * Get upgrade cost
   * @param {string} upgradeType - Type of upgrade
   * @returns {number} Cost of the upgrade
   */
  getUpgradeCost(upgradeType) {
    const currentLevel = this.state.upgrades[upgradeType] || 0;
    return calculateUpgradeCost(upgradeType, currentLevel);
  }

  /**
   * Handle server upgrade response
   * @param {Object} response - Server response
   */
  handleUpgradeResponse(response) {
    if (response.success) {
      // Server confirmed the upgrade
      this.emit('upgrade:confirmed', response);
    } else {
      // Server rejected the upgrade, revert optimistic update
      const { upgradeType, oldLevel, cost } = response.originalRequest;

      this.state.upgrades[upgradeType] = oldLevel;
      this.state.coins += cost;

      // Recalculate derived values
      this.state.coinsPerTap = calculateCoinsPerTap(this.state);
      this.state.autoClickerRate = calculateAutoClickerRate(this.state);

      this.emit('upgrade:reverted', {
        upgradeType,
        reason: response.error,
        revertedLevel: oldLevel
      });
    }
  }

  /**
   * Handle prestige reset
   * @param {Object} prestigeResult - Result from server prestige operation
   */
  handlePrestigeReset(prestigeResult) {
    const {
      newPrestigeLevel,
      prestigePointsEarned,
      totalPrestigePoints,
      resetStats
    } = prestigeResult;

    // Reset game state while preserving prestige data
    this.state = {
      ...this.getInitialState(),
      prestige: {
        level: newPrestigeLevel,
        points: totalPrestigePoints,
        totalPrestiges: (this.state.prestige?.totalPrestiges || 0) + 1
      },
      totalCoinsEarned: this.state.totalCoinsEarned, // Keep lifetime total
      // Reset upgrades but keep prestige upgrades
      upgrades: {
        tap_multiplier: 0,
        auto_clicker: 0,
        golden_tap_chance: 0,
        offline_earnings: 0,
        // Prestige upgrades are handled server-side
      }
    };

    // Recalculate derived values with new prestige multiplier
    this.state.coinsPerTap = calculateCoinsPerTap(this.state);
    this.state.autoClickerRate = calculateAutoClickerRate(this.state);

    // Save the new state
    this.saveState();

    // Emit prestige event
    this.emit('prestige:completed', {
      newPrestigeLevel,
      prestigePointsEarned,
      totalPrestigePoints,
      resetStats,
      newState: this.state
    });

    // Reset session stats
    this.resetSessionStats();
  }

  /**
   * Get prestige information from current state
   * @returns {Object} Prestige information
   */
  getPrestigeInfo() {
    return {
      level: this.state.prestige?.level || 0,
      points: this.state.prestige?.points || 0,
      totalPrestiges: this.state.prestige?.totalPrestiges || 0,
      canPrestige: this.state.totalCoinsEarned >= GAME_CONFIG.PRESTIGE_UNLOCK_COINS,
      progressToNext: Math.min(
        (this.state.totalCoinsEarned / GAME_CONFIG.PRESTIGE_UNLOCK_COINS) * 100,
        100
      )
    };
  }

  /**
   * Calculate prestige multiplier from current prestige level
   * @returns {number} Prestige multiplier
   */
  getPrestigeMultiplier() {
    const prestigeLevel = this.state.prestige?.level || 0;
    return calculatePrestigeMultiplier(prestigeLevel);
  }

  /**
   * Update prestige points (called when purchasing prestige upgrades)
   * @param {number} newPoints - New prestige points amount
   */
  updatePrestigePoints(newPoints) {
    if (!this.state.prestige) {
      this.state.prestige = { level: 0, points: 0, totalPrestiges: 0 };
    }
    
    this.state.prestige.points = newPoints;
    
    // Recalculate derived values as prestige upgrades may affect them
    this.state.coinsPerTap = calculateCoinsPerTap(this.state);
    this.state.autoClickerRate = calculateAutoClickerRate(this.state);
    
    this.emit('prestige:points_updated', {
      newPoints,
      prestigeInfo: this.getPrestigeInfo()
    });
  }

  /**
   * Set offline mode for graceful degradation
   */
  setOfflineMode(isOffline) {
    this.isOfflineMode = isOffline;
    
    if (isOffline) {
      // Stop sync attempts
      this.stopGameLoop();
      this.startGameLoop(); // Restart without sync
      this.emit('mode:offline');
    } else {
      // Resume normal operation
      this.forceSync();
      this.emit('mode:online');
    }
  }

  /**
   * Force full sync to get correct state from server
   */
  forceFullSync() {
    if (this.syncManager) {
      this.syncManager.forceFullSync();
    } else {
      // Fallback: emit event for manual handling
      this.emit('sync:full_sync_requested', {
        currentState: this.state,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle sync errors with retry logic
   */
  handleSyncError(error, retryCount = 0) {
    ErrorHandler.handleGameError({
      type: 'SYNC_FAILED',
      code: 'SYNC_ERROR',
      message: 'Failed to sync with server',
      originalError: error
    }, { 
      gameEngine: this, 
      retryCount,
      retryCallback: () => this.handleSyncRetry(retryCount + 1)
    });
  }

  /**
   * Retry sync operation
   */
  handleSyncRetry(retryCount) {
    if (retryCount < 3) {
      setTimeout(() => {
        this.forceSync();
      }, 1000 * Math.pow(2, retryCount)); // Exponential backoff
    } else {
      // Max retries reached, switch to offline mode
      this.setOfflineMode(true);
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stop();
    this.eventListeners.clear();
    this.syncQueue = [];
    this.animations = [];
    this.tapTimestamps = [];
  }
}

export default GameEngine;