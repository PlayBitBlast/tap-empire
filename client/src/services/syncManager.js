// SyncManager.js - Real-time synchronization system for Tap Empire
// Handles client-server communication with optimistic updates and conflict resolution

import { SOCKET_EVENTS, ERROR_CODES, SUCCESS_CODES } from '../../../shared/constants/events';
import { GAME_CONFIG } from '../../../shared/constants/gameConfig';
import { generateGameStateChecksum } from '../../../shared/utils/calculations';
import ErrorHandler from '../utils/errorHandler';

/**
 * SyncManager handles real-time synchronization between client and server
 * Features:
 * - Batch sync operations for efficiency
 * - Optimistic updates with server validation
 * - Conflict resolution and error recovery
 * - Connection management and reconnection
 */
class SyncManager {
  constructor(gameEngine, socket) {
    this.gameEngine = gameEngine;
    this.socket = socket;
    
    // Sync state
    this.syncQueue = [];
    this.pendingSyncs = new Map(); // Track pending sync operations
    this.lastSyncTime = Date.now();
    this.syncInProgress = false;
    this.connectionState = 'disconnected';
    
    // Error recovery
    this.retryQueue = [];
    this.maxRetries = 3;
    this.retryDelay = 1000; // Start with 1 second
    this.maxRetryDelay = 30000; // Max 30 seconds
    
    // Performance tracking
    this.syncStats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageLatency: 0,
      lastSyncLatency: 0
    };
    
    // Bind methods
    this.sync = this.sync.bind(this);
    this.handleSyncResponse = this.handleSyncResponse.bind(this);
    this.handleConnectionChange = this.handleConnectionChange.bind(this);
    this.processRetryQueue = this.processRetryQueue.bind(this);
    
    // Set up socket event listeners
    this.setupSocketListeners();
    
    // Start periodic sync
    this.startPeriodicSync();
    
    // Set up retry processing
    this.retryInterval = setInterval(this.processRetryQueue, 5000);
  }

  /**
   * Set up socket event listeners for sync responses
   */
  setupSocketListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.handleConnectionChange('connected');
    });

    this.socket.on('disconnect', () => {
      this.handleConnectionChange('disconnected');
    });

    this.socket.on('reconnect', () => {
      this.handleConnectionChange('reconnected');
    });

    // Sync response events
    this.socket.on(SOCKET_EVENTS.GAME_SYNC_RESULT, this.handleSyncResponse);
    this.socket.on(SOCKET_EVENTS.GAME_STATE_UPDATE, this.handleServerStateUpdate.bind(this));
    
    // Error events
    this.socket.on(SOCKET_EVENTS.VALIDATION_ERROR, this.handleValidationError.bind(this));
    this.socket.on(SOCKET_EVENTS.RATE_LIMIT_EXCEEDED, this.handleRateLimit.bind(this));
    this.socket.on(SOCKET_EVENTS.SYSTEM_ERROR, this.handleSystemError.bind(this));
  }

  /**
   * Queue operation for synchronization
   * @param {string} operation - Operation type (tap, upgrade, etc.)
   * @param {Object} data - Operation data
   * @param {Object} options - Sync options
   */
  queueSync(operation, data, options = {}) {
    const syncOperation = {
      id: this.generateSyncId(),
      operation,
      data,
      timestamp: Date.now(),
      priority: options.priority || 'normal',
      retryCount: 0,
      clientChecksum: generateGameStateChecksum(this.gameEngine.getState())
    };

    // Add to appropriate queue based on priority
    if (options.priority === 'high') {
      this.syncQueue.unshift(syncOperation);
    } else {
      this.syncQueue.push(syncOperation);
    }

    // Limit queue size to prevent memory issues
    if (this.syncQueue.length > GAME_CONFIG.MAX_SYNC_QUEUE_SIZE) {
      // Separate high and normal priority operations
      const highPriorityOps = this.syncQueue.filter(op => op.priority === 'high');
      const normalPriorityOps = this.syncQueue.filter(op => op.priority !== 'high');
      
      // Keep all high priority operations and trim normal priority operations
      const maxNormalOps = GAME_CONFIG.MAX_SYNC_QUEUE_SIZE - highPriorityOps.length;
      const trimmedNormalOps = normalPriorityOps.slice(-maxNormalOps);
      
      // Rebuild queue with high priority operations first
      this.syncQueue = [...highPriorityOps, ...trimmedNormalOps];
    }

    // Trigger immediate sync for high priority operations
    if (options.priority === 'high' && this.connectionState === 'connected') {
      this.sync();
    }
  }

  /**
   * Process sync queue and send batch to server
   */
  async sync() {
    if (this.syncInProgress || this.connectionState !== 'connected' || this.syncQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    const syncStartTime = Date.now();

    try {
      // Get batch of operations to sync
      const batchSize = Math.min(this.syncQueue.length, GAME_CONFIG.BATCH_SYNC_SIZE);
      const batch = this.syncQueue.splice(0, batchSize);

      if (batch.length === 0) {
        this.syncInProgress = false;
        return;
      }

      // Create sync request
      const syncRequest = {
        id: this.generateSyncId(),
        operations: batch,
        timestamp: Date.now(),
        clientState: {
          coins: this.gameEngine.state.coins,
          totalCoinsEarned: this.gameEngine.state.totalCoinsEarned,
          upgrades: this.gameEngine.state.upgrades
        },
        checksum: generateGameStateChecksum(this.gameEngine.getState())
      };

      // Track pending sync
      this.pendingSyncs.set(syncRequest.id, {
        request: syncRequest,
        startTime: syncStartTime,
        operations: batch
      });

      // Send to server
      this.socket.emit(SOCKET_EVENTS.GAME_SYNC, syncRequest);

      // Update stats
      this.syncStats.totalSyncs++;
      this.lastSyncTime = Date.now();

      // Set timeout for sync response
      setTimeout(() => {
        if (this.pendingSyncs.has(syncRequest.id)) {
          this.handleSyncTimeout(syncRequest.id);
        }
      }, GAME_CONFIG.SYNC_TIMEOUT_MS);

    } catch (error) {
      this.syncInProgress = false;
      this.handleSyncError(error, batch);
    }
  }

  /**
   * Handle sync response from server
   * @param {Object} response - Server sync response
   */
  handleSyncResponse(response) {
    const { id, success, operations, correction, error, timestamp } = response;
    
    if (!this.pendingSyncs.has(id)) {
      console.warn('Received response for unknown sync:', id);
      return;
    }

    const pendingSync = this.pendingSyncs.get(id);
    const latency = Date.now() - pendingSync.startTime;
    
    // Update performance stats
    this.updateSyncStats(latency, success);
    
    // Remove from pending
    this.pendingSyncs.delete(id);
    this.syncInProgress = false;

    if (success) {
      this.handleSyncSuccess(response, pendingSync);
    } else if (correction) {
      this.handleServerCorrection(correction, pendingSync);
    } else {
      this.handleSyncFailure(error, pendingSync);
    }

    // Continue processing queue
    if (this.syncQueue.length > 0) {
      setTimeout(() => this.sync(), 100);
    }
  }

  /**
   * Handle successful sync response
   * @param {Object} response - Server response
   * @param {Object} pendingSync - Original sync request
   */
  handleSyncSuccess(response, pendingSync) {
    // Emit success event
    this.gameEngine.emit('sync:success', {
      operations: pendingSync.operations,
      serverTimestamp: response.timestamp,
      latency: this.syncStats.lastSyncLatency
    });

    // Process any server updates
    if (response.updates) {
      this.applyServerUpdates(response.updates);
    }
  }

  /**
   * Handle server state correction
   * @param {Object} correction - Server correction data
   * @param {Object} pendingSync - Original sync request
   */
  handleServerCorrection(correction, pendingSync) {
    console.warn('Server corrected client state:', correction);

    // Apply server correction to game engine
    this.gameEngine.applyServerCorrection(correction.serverState);

    // Emit correction event
    this.gameEngine.emit('sync:corrected', {
      correction,
      operations: pendingSync.operations,
      reason: correction.reason || 'State mismatch detected'
    });

    // Show user notification
    this.showSyncNotification('Game state synchronized with server', 'info');
  }

  /**
   * Handle sync failure
   * @param {string} error - Error message
   * @param {Object} pendingSync - Original sync request
   */
  handleSyncFailure(error, pendingSync) {
    console.error('Sync failed:', error);
    
    this.syncStats.failedSyncs++;

    // Add operations back to retry queue if they haven't exceeded max retries
    const retriableOperations = pendingSync.operations.filter(op => 
      op.retryCount < this.maxRetries
    );

    if (retriableOperations.length > 0) {
      retriableOperations.forEach(op => {
        op.retryCount++;
        this.retryQueue.push(op);
      });
    }

    // Emit failure event
    this.gameEngine.emit('sync:failed', {
      error,
      operations: pendingSync.operations,
      willRetry: retriableOperations.length > 0
    });

    // Show user notification for critical failures
    if (error === ERROR_CODES.SECURITY_SUSPICIOUS_ACTIVITY) {
      this.showSyncNotification('Security validation failed. Please refresh the game.', 'error');
    } else if (retriableOperations.length === 0) {
      this.showSyncNotification('Some actions could not be synchronized', 'warning');
    }
  }

  /**
   * Handle sync timeout
   * @param {string} syncId - Sync request ID
   */
  handleSyncTimeout(syncId) {
    if (!this.pendingSyncs.has(syncId)) return;

    const pendingSync = this.pendingSyncs.get(syncId);
    console.warn('Sync timeout for request:', syncId);

    // Move operations to retry queue
    pendingSync.operations.forEach(op => {
      if (op.retryCount < this.maxRetries) {
        op.retryCount++;
        this.retryQueue.push(op);
      }
    });

    // Clean up
    this.pendingSyncs.delete(syncId);
    this.syncInProgress = false;
    this.syncStats.failedSyncs++;

    // Emit timeout event
    this.gameEngine.emit('sync:timeout', {
      syncId,
      operations: pendingSync.operations
    });
  }

  /**
   * Handle connection state changes
   * @param {string} state - New connection state
   */
  handleConnectionChange(state) {
    const previousState = this.connectionState;
    this.connectionState = state;

    console.log(`Connection state changed: ${previousState} -> ${state}`);

    if (state === 'connected' || state === 'reconnected') {
      // Reset retry delay on successful connection
      this.retryDelay = 1000;
      
      // Force sync on reconnection
      if (state === 'reconnected') {
        this.forceFullSync();
      }
      
      // Resume normal sync operations
      if (this.syncQueue.length > 0) {
        setTimeout(() => this.sync(), 500);
      }
    }

    // Emit connection event
    this.gameEngine.emit('connection:state_changed', {
      previousState,
      currentState: state,
      timestamp: Date.now()
    });
  }

  /**
   * Process retry queue
   */
  processRetryQueue() {
    if (this.retryQueue.length === 0 || this.connectionState !== 'connected') {
      return;
    }

    // Move operations from retry queue back to sync queue
    const operationsToRetry = this.retryQueue.splice(0, GAME_CONFIG.BATCH_SYNC_SIZE);
    
    operationsToRetry.forEach(operation => {
      // Add exponential backoff delay
      const delay = Math.min(this.retryDelay * Math.pow(2, operation.retryCount), this.maxRetryDelay);
      
      setTimeout(() => {
        this.syncQueue.push(operation);
        
        // Trigger sync if not already in progress
        if (!this.syncInProgress) {
          this.sync();
        }
      }, delay);
    });
  }

  /**
   * Force full state synchronization
   */
  forceFullSync() {
    const fullSyncOperation = {
      id: this.generateSyncId(),
      operation: 'full_sync',
      data: {
        clientState: this.gameEngine.getState(),
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      priority: 'high',
      retryCount: 0,
      clientChecksum: generateGameStateChecksum(this.gameEngine.getState())
    };

    this.queueSync('full_sync', fullSyncOperation.data, { priority: 'high' });
  }

  /**
   * Handle server state updates (pushed from server)
   * @param {Object} update - Server state update
   */
  handleServerStateUpdate(update) {
    console.log('Received server state update:', update);

    // Apply updates to game engine
    this.applyServerUpdates(update);

    // Emit update event
    this.gameEngine.emit('server:state_update', update);
  }

  /**
   * Apply server updates to game state
   * @param {Object} updates - Server updates
   */
  applyServerUpdates(updates) {
    if (updates.coins !== undefined) {
      this.gameEngine.state.coins = updates.coins;
    }
    
    if (updates.totalCoinsEarned !== undefined) {
      this.gameEngine.state.totalCoinsEarned = updates.totalCoinsEarned;
    }
    
    if (updates.upgrades) {
      this.gameEngine.state.upgrades = { ...this.gameEngine.state.upgrades, ...updates.upgrades };
    }

    // Recalculate derived values
    this.gameEngine.state.coinsPerTap = this.gameEngine.calculateCoinsPerTap();
    this.gameEngine.state.autoClickerRate = this.gameEngine.calculateAutoClickerRate();

    // Emit state update
    this.gameEngine.emit('state:updated', {
      updates,
      newState: this.gameEngine.getState()
    });
  }

  /**
   * Handle validation errors from server
   * @param {Object} error - Validation error
   */
  handleValidationError(error) {
    console.error('Validation error:', error);
    
    this.gameEngine.emit('validation:error', error);
    this.showSyncNotification('Action validation failed', 'error');
  }

  /**
   * Handle rate limiting from server
   * @param {Object} rateLimit - Rate limit info
   */
  handleRateLimit(rateLimit) {
    console.warn('Rate limited:', rateLimit);
    
    this.gameEngine.emit('rate_limit:exceeded', rateLimit);
    this.showSyncNotification(`Rate limited. Please wait ${Math.ceil(rateLimit.retryAfter / 1000)} seconds.`, 'warning');
  }

  /**
   * Handle system errors from server
   * @param {Object} error - System error
   */
  handleSystemError(error) {
    console.error('System error:', error);
    
    this.gameEngine.emit('system:error', error);
    this.showSyncNotification('Server error occurred. Retrying...', 'error');
  }

  /**
   * Start periodic sync timer
   */
  startPeriodicSync() {
    this.syncInterval = setInterval(() => {
      if (this.syncQueue.length > 0 && this.connectionState === 'connected') {
        this.sync();
      }
    }, GAME_CONFIG.SYNC_INTERVAL_MS);
  }

  /**
   * Stop periodic sync timer
   */
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Update sync performance statistics
   * @param {number} latency - Sync latency in ms
   * @param {boolean} success - Whether sync was successful
   */
  updateSyncStats(latency, success) {
    this.syncStats.totalSyncs++;
    this.syncStats.lastSyncLatency = latency;
    
    if (success) {
      this.syncStats.successfulSyncs++;
    } else {
      this.syncStats.failedSyncs++;
    }
    
    // Calculate rolling average latency
    const totalLatency = this.syncStats.averageLatency * (this.syncStats.totalSyncs - 1) + latency;
    this.syncStats.averageLatency = totalLatency / this.syncStats.totalSyncs;
  }

  /**
   * Generate unique sync ID
   * @returns {string} Unique sync ID
   */
  generateSyncId() {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Show sync notification to user
   * @param {string} message - Notification message
   * @param {string} type - Notification type (info, warning, error)
   */
  showSyncNotification(message, type = 'info') {
    this.gameEngine.emit('notification:show', {
      message,
      type,
      duration: type === 'error' ? 5000 : 3000
    });
  }

  /**
   * Get sync statistics
   * @returns {Object} Sync performance statistics
   */
  getSyncStats() {
    return {
      ...this.syncStats,
      queueSize: this.syncQueue.length,
      retryQueueSize: this.retryQueue.length,
      pendingSyncs: this.pendingSyncs.size,
      connectionState: this.connectionState,
      successRate: this.syncStats.totalSyncs > 0 
        ? (this.syncStats.successfulSyncs / this.syncStats.totalSyncs * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Clear all queues and reset state
   */
  reset() {
    this.syncQueue = [];
    this.retryQueue = [];
    this.pendingSyncs.clear();
    this.syncInProgress = false;
    
    this.syncStats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageLatency: 0,
      lastSyncLatency: 0
    };
  }

  /**
   * Handle sync errors with retry logic
   */
  handleSyncError(error, failedOperations = []) {
    this.syncStats.failedSyncs++;
    
    ErrorHandler.handleGameError({
      type: 'SYNC_FAILED',
      code: 'SYNC_ERROR',
      message: 'Failed to sync with server',
      originalError: error
    }, { 
      gameEngine: this.gameEngine,
      syncManager: this,
      retryCallback: () => this.retrySyncOperations(failedOperations)
    });

    // Add failed operations back to retry queue
    if (failedOperations.length > 0) {
      this.addToRetryQueue(failedOperations);
    }
  }

  /**
   * Handle sync timeout
   */
  handleSyncTimeout(syncId) {
    const pendingSync = this.pendingSyncs.get(syncId);
    if (!pendingSync) return;

    this.pendingSyncs.delete(syncId);
    this.syncInProgress = false;

    ErrorHandler.handleGameError({
      type: 'NETWORK_ERROR',
      code: 'SYNC_TIMEOUT',
      message: 'Sync request timed out',
      timeout: GAME_CONFIG.SYNC_TIMEOUT_MS
    }, { 
      gameEngine: this.gameEngine,
      syncManager: this,
      retryCallback: () => this.retrySyncOperations(pendingSync.operations)
    });

    // Add timed out operations to retry queue
    this.addToRetryQueue(pendingSync.operations);
  }

  /**
   * Add operations to retry queue
   */
  addToRetryQueue(operations) {
    operations.forEach(op => {
      if (op.retryCount < this.maxRetries) {
        op.retryCount++;
        this.retryQueue.push(op);
      } else {
        // Max retries reached, log and discard
        ErrorHandler.logError({
          type: 'SYNC_FAILED',
          code: 'MAX_RETRIES_EXCEEDED',
          message: 'Operation failed after max retries',
          operation: op
        });
      }
    });
  }

  /**
   * Retry failed sync operations
   */
  retrySyncOperations(operations) {
    if (this.connectionState !== 'connected') {
      // Can't retry now, add to retry queue
      this.addToRetryQueue(operations);
      return;
    }

    // Add operations back to sync queue with higher priority
    operations.forEach(op => {
      this.queueSync(op.operation, op.data, { priority: 'high' });
    });
  }

  /**
   * Handle connection errors
   */
  handleConnectionError(error) {
    this.connectionState = 'error';
    
    ErrorHandler.handleGameError({
      type: 'NETWORK_ERROR',
      code: 'CONNECTION_ERROR',
      message: 'Lost connection to server',
      originalError: error
    }, { 
      gameEngine: this.gameEngine,
      syncManager: this
    });

    // Switch game engine to offline mode
    if (this.gameEngine) {
      this.gameEngine.setOfflineMode(true);
    }

    // Attempt reconnection
    this.attemptReconnection();
  }

  /**
   * Attempt to reconnect to server
   */
  attemptReconnection() {
    if (this.reconnectAttempts >= 5) {
      ErrorHandler.handleGameError({
        type: 'NETWORK_ERROR',
        code: 'RECONNECTION_FAILED',
        message: 'Could not reconnect to server'
      }, { gameEngine: this.gameEngine });
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    setTimeout(() => {
      if (this.socket && this.socket.connected) {
        this.handleConnectionRestored();
      } else {
        this.attemptReconnection();
      }
    }, delay);
  }

  /**
   * Handle connection restored
   */
  handleConnectionRestored() {
    this.connectionState = 'connected';
    this.reconnectAttempts = 0;

    // Switch game engine back to online mode
    if (this.gameEngine) {
      this.gameEngine.setOfflineMode(false);
    }

    // Process retry queue
    this.processRetryQueue();

    // Force full sync to ensure state consistency
    this.forceFullSync();
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopPeriodicSync();
    
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
    }
    
    // Clear all pending syncs
    this.pendingSyncs.clear();
    
    // Remove socket listeners
    if (this.socket) {
      this.socket.off(SOCKET_EVENTS.GAME_SYNC_RESULT, this.handleSyncResponse);
      this.socket.off(SOCKET_EVENTS.GAME_STATE_UPDATE, this.handleServerStateUpdate);
      this.socket.off(SOCKET_EVENTS.VALIDATION_ERROR, this.handleValidationError);
      this.socket.off(SOCKET_EVENTS.RATE_LIMIT_EXCEEDED, this.handleRateLimit);
      this.socket.off(SOCKET_EVENTS.SYSTEM_ERROR, this.handleSystemError);
    }
    
    this.reset();
  }
}

export default SyncManager;