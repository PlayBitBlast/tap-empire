// gameSocketHandler.js - Server-side socket handlers for game synchronization
// Handles real-time game events with anti-cheat validation and state management

const { SOCKET_EVENTS, ERROR_CODES, SUCCESS_CODES } = require('../../../shared/constants/events');
const { GAME_CONFIG } = require('../../../shared/constants/gameConfig');
const GameService = require('../services/gameService');
const { validateTapRate, generateGameStateChecksum } = require('../../../shared/utils/calculations');
const ServerErrorHandler = require('../middleware/errorHandler');

/**
 * GameSocketHandler manages real-time game synchronization
 * Features:
 * - Batch operation processing
 * - Anti-cheat validation
 * - State conflict resolution
 * - Error handling and recovery
 */
class GameSocketHandler {
  constructor(io) {
    this.io = io;
    this.gameService = new GameService(io);
    
    // Track connected users and their sync state
    this.connectedUsers = new Map();
    this.userSockets = new Map(); // userId -> socketId mapping
    
    // Performance tracking
    this.syncStats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageProcessingTime: 0
    };
    
    // Bind methods
    this.handleConnection = this.handleConnection.bind(this);
    this.handleDisconnection = this.handleDisconnection.bind(this);
    this.handleGameSync = this.handleGameSync.bind(this);
    this.handleTapEvent = this.handleTapEvent.bind(this);
    this.handleUpgradeEvent = this.handleUpgradeEvent.bind(this);
    this.handleForceSync = this.handleForceSync.bind(this);
  }

  /**
   * Initialize socket event handlers
   * @param {Object} socket - Socket.io socket instance
   */
  handleConnection(socket) {
    console.log(`Game socket connected: ${socket.id}`);
    
    // Set up event handlers with error handling
    socket.on(SOCKET_EVENTS.DISCONNECT, () => this.handleDisconnection(socket));
    socket.on(SOCKET_EVENTS.GAME_SYNC, (data) => this.handleWithErrorHandling(socket, data, this.handleGameSync.bind(this)));
    socket.on(SOCKET_EVENTS.GAME_TAP, (data) => this.handleWithErrorHandling(socket, data, this.handleTapEvent.bind(this)));
    socket.on(SOCKET_EVENTS.GAME_UPGRADE, (data) => this.handleWithErrorHandling(socket, data, this.handleUpgradeEvent.bind(this)));
    socket.on(SOCKET_EVENTS.GAME_FORCE_SYNC, (data) => this.handleWithErrorHandling(socket, data, this.handleForceSync.bind(this)));
    
    // Authentication and user setup will be handled by auth middleware
    socket.on('authenticate', (authData) => this.handleAuthentication(socket, authData));
    
    // Send welcome message
    socket.emit(SOCKET_EVENTS.WELCOME, {
      message: 'Connected to Tap Empire game server',
      socketId: socket.id,
      serverTime: Date.now()
    });
  }

  /**
   * Wrapper for handling socket events with error handling
   * @param {Object} socket - Socket instance
   * @param {Object} data - Event data
   * @param {Function} handler - Event handler function
   */
  async handleWithErrorHandling(socket, data, handler) {
    try {
      await handler(socket, data);
    } catch (error) {
      ServerErrorHandler.handleSocketError(socket, error, {
        event: handler.name,
        data,
        userId: socket.userId
      });
    }
  }

  /**
   * Handle user authentication
   * @param {Object} socket - Socket instance
   * @param {Object} authData - Authentication data
   */
  async handleAuthentication(socket, authData) {
    try {
      // TODO: Validate JWT token and get user ID
      // For now, using mock authentication
      const userId = authData?.userId || socket.handshake?.auth?.userId;
      
      if (!userId) {
        socket.emit(SOCKET_EVENTS.AUTH_ERROR, {
          error: 'Authentication required',
          code: ERROR_CODES.AUTH_INVALID_TOKEN
        });
        return;
      }

      // Store user connection info
      this.connectedUsers.set(socket.id, {
        userId,
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        syncState: {
          lastSyncTime: 0,
          pendingOperations: [],
          checksumHistory: []
        }
      });

      // Map user to socket for direct messaging
      this.userSockets.set(userId, socket.id);

      socket.emit(SOCKET_EVENTS.AUTH_SUCCESS, {
        userId,
        serverTime: Date.now(),
        message: 'Authentication successful'
      });

      console.log(`User ${userId} authenticated on socket ${socket.id}`);

    } catch (error) {
      console.error('Authentication error:', error);
      socket.emit(SOCKET_EVENTS.AUTH_ERROR, {
        error: 'Authentication failed',
        code: ERROR_CODES.AUTH_INVALID_TOKEN
      });
    }
  }

  /**
   * Handle socket disconnection
   * @param {Object} socket - Socket instance
   */
  handleDisconnection(socket) {
    const userInfo = this.connectedUsers.get(socket.id);
    
    if (userInfo) {
      console.log(`User ${userInfo.userId} disconnected from socket ${socket.id}`);
      
      // Clean up user mappings
      this.userSockets.delete(userInfo.userId);
      this.connectedUsers.delete(socket.id);
    } else {
      console.log(`Socket ${socket.id} disconnected (unauthenticated)`);
    }
  }

  /**
   * Handle batch game synchronization
   * @param {Object} socket - Socket instance
   * @param {Object} syncData - Sync request data
   */
  async handleGameSync(socket, syncData) {
    const startTime = Date.now();
    const userInfo = this.connectedUsers.get(socket.id);
    
    if (!userInfo) {
      socket.emit(SOCKET_EVENTS.GAME_SYNC_RESULT, {
        id: syncData?.id || 'unknown',
        success: false,
        error: 'Not authenticated',
        code: ERROR_CODES.AUTH_INVALID_TOKEN,
        timestamp: Date.now()
      });
      return;
    }

    try {
      const { id, operations, clientState, checksum, timestamp } = syncData;
      const userId = userInfo.userId;

      // Update user activity
      userInfo.lastActivity = Date.now();

      // Validate sync request
      const validationResult = this.validateSyncRequest(syncData, userInfo);
      if (!validationResult.valid) {
        socket.emit(SOCKET_EVENTS.GAME_SYNC_RESULT, {
          id,
          success: false,
          error: validationResult.error,
          code: validationResult.code
        });
        return;
      }

      // Process operations in batch
      const results = await this.processSyncOperations(userId, operations);
      
      // Check for state conflicts
      const stateValidation = await this.validateClientState(userId, clientState, checksum);
      
      // Prepare response
      const response = {
        id,
        timestamp: Date.now(),
        processingTime: Date.now() - startTime
      };

      if (stateValidation.hasConflict) {
        // State conflict detected - send correction
        response.success = false;
        response.correction = {
          reason: stateValidation.reason,
          serverState: stateValidation.serverState,
          discrepancies: stateValidation.discrepancies
        };
        
        console.warn(`State conflict for user ${userId}:`, stateValidation.reason);
      } else {
        // Successful sync
        response.success = true;
        response.operations = results.successful;
        
        // Include any server updates
        if (results.updates) {
          response.updates = results.updates;
        }
      }

      // Send response
      socket.emit(SOCKET_EVENTS.GAME_SYNC_RESULT, response);

      // Update sync statistics
      this.updateSyncStats(Date.now() - startTime, response.success);

      // Handle failed operations
      if (results.failed && results.failed.length > 0) {
        this.handleFailedOperations(socket, results.failed);
      }

    } catch (error) {
      console.error(`Sync error for user ${userInfo.userId}:`, error);
      
      socket.emit(SOCKET_EVENTS.GAME_SYNC_RESULT, {
        id: syncData.id,
        success: false,
        error: 'Internal server error',
        code: ERROR_CODES.SYSTEM_INTERNAL_ERROR,
        timestamp: Date.now()
      });

      this.syncStats.failedSyncs++;
    }
  }

  /**
   * Process batch of sync operations
   * @param {number} userId - User ID
   * @param {Array} operations - Array of operations to process
   * @returns {Promise<Object>} Processing results
   */
  async processSyncOperations(userId, operations) {
    const results = {
      successful: [],
      failed: [],
      updates: {}
    };

    for (const operation of operations) {
      try {
        let result;

        switch (operation.operation) {
          case 'tap':
            result = await this.gameService.processTap(userId, operation.data);
            break;
            
          case 'upgrade_purchase':
            result = await this.processUpgradePurchase(userId, operation.data);
            break;
            
          case 'full_sync':
            result = await this.processFullSync(userId, operation.data);
            break;
            
          default:
            throw new Error(`Unknown operation: ${operation.operation}`);
        }

        if (result && result.success) {
          results.successful.push({
            id: operation.id,
            operation: operation.operation,
            result
          });

          // Collect updates for client
          if (result.newCoins !== undefined) {
            results.updates.coins = result.newCoins;
          }
          if (result.totalCoinsEarned !== undefined) {
            results.updates.totalCoinsEarned = result.totalCoinsEarned;
          }
        } else {
          results.failed.push({
            id: operation.id,
            operation: operation.operation,
            error: result?.error || 'Operation failed',
            originalData: operation.data
          });
        }

      } catch (error) {
        console.error(`Operation ${operation.operation} failed:`, error);
        results.failed.push({
          id: operation.id,
          operation: operation.operation,
          error: error.message,
          originalData: operation.data
        });
      }
    }

    return results;
  }

  /**
   * Handle individual tap event (for real-time feedback)
   * @param {Object} socket - Socket instance
   * @param {Object} tapData - Tap event data
   */
  async handleTapEvent(socket, tapData) {
    const userInfo = this.connectedUsers.get(socket.id);
    
    if (!userInfo) {
      socket.emit(SOCKET_EVENTS.GAME_TAP_RESULT, {
        success: false,
        error: 'Not authenticated',
        code: ERROR_CODES.AUTH_INVALID_TOKEN
      });
      return;
    }

    try {
      const result = await this.gameService.processTap(userInfo.userId, tapData);
      
      socket.emit(SOCKET_EVENTS.GAME_TAP_RESULT, {
        ...result,
        timestamp: Date.now()
      });

      // Broadcast to other clients if needed (for multiplayer features)
      // this.broadcastToUser(userInfo.userId, SOCKET_EVENTS.GAME_STATE_UPDATE, result);

    } catch (error) {
      console.error(`Tap processing error for user ${userInfo.userId}:`, error);
      
      socket.emit(SOCKET_EVENTS.GAME_TAP_RESULT, {
        success: false,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle upgrade purchase event
   * @param {Object} socket - Socket instance
   * @param {Object} upgradeData - Upgrade purchase data
   */
  async handleUpgradeEvent(socket, upgradeData) {
    const userInfo = this.connectedUsers.get(socket.id);
    
    if (!userInfo) {
      socket.emit(SOCKET_EVENTS.GAME_UPGRADE_RESULT, {
        success: false,
        error: 'Not authenticated',
        code: ERROR_CODES.AUTH_INVALID_TOKEN
      });
      return;
    }

    try {
      const result = await this.processUpgradePurchase(userInfo.userId, upgradeData);
      
      socket.emit(SOCKET_EVENTS.GAME_UPGRADE_RESULT, {
        ...result,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error(`Upgrade processing error for user ${userInfo.userId}:`, error);
      
      socket.emit(SOCKET_EVENTS.GAME_UPGRADE_RESULT, {
        success: false,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle force sync request
   * @param {Object} socket - Socket instance
   * @param {Object} syncData - Force sync data
   */
  async handleForceSync(socket, syncData) {
    const userInfo = this.connectedUsers.get(socket.id);
    
    if (!userInfo) {
      socket.emit(SOCKET_EVENTS.GAME_SYNC_RESULT, {
        success: false,
        error: 'Not authenticated',
        code: ERROR_CODES.AUTH_INVALID_TOKEN
      });
      return;
    }

    try {
      const result = await this.processFullSync(userInfo.userId, syncData);
      
      socket.emit(SOCKET_EVENTS.GAME_SYNC_RESULT, {
        id: syncData.id || 'force_sync',
        success: true,
        correction: result.correction,
        serverState: result.serverState,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error(`Force sync error for user ${userInfo.userId}:`, error);
      
      socket.emit(SOCKET_EVENTS.GAME_SYNC_RESULT, {
        id: syncData.id || 'force_sync',
        success: false,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Validate sync request
   * @param {Object} syncData - Sync request data
   * @param {Object} userInfo - User connection info
   * @returns {Object} Validation result
   */
  validateSyncRequest(syncData, userInfo) {
    // Check required fields
    if (!syncData.id || !syncData.operations || !Array.isArray(syncData.operations)) {
      return {
        valid: false,
        error: 'Invalid sync request format',
        code: ERROR_CODES.VALIDATION_INVALID_DATA
      };
    }

    // Check operation count limits
    if (syncData.operations.length > GAME_CONFIG.MAX_BATCH_OPERATIONS) {
      return {
        valid: false,
        error: 'Too many operations in batch',
        code: ERROR_CODES.VALIDATION_FIELD_OUT_OF_RANGE
      };
    }

    // Check timestamp validity
    const now = Date.now();
    const maxAge = 60000; // 1 minute
    
    if (!syncData.timestamp || syncData.timestamp < (now - maxAge) || syncData.timestamp > (now + 5000)) {
      return {
        valid: false,
        error: 'Invalid timestamp',
        code: ERROR_CODES.VALIDATION_INVALID_DATA
      };
    }

    // Check sync rate limiting
    const timeSinceLastSync = now - userInfo.syncState.lastSyncTime;
    if (timeSinceLastSync < GAME_CONFIG.MIN_SYNC_INTERVAL_MS) {
      return {
        valid: false,
        error: 'Sync rate limit exceeded',
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED
      };
    }

    // Update last sync time
    userInfo.syncState.lastSyncTime = now;

    return { valid: true };
  }

  /**
   * Validate client state against server state
   * @param {number} userId - User ID
   * @param {Object} clientState - Client's reported state
   * @param {string} clientChecksum - Client state checksum
   * @returns {Promise<Object>} Validation result
   */
  async validateClientState(userId, clientState, clientChecksum) {
    try {
      const validationResult = await this.gameService.validateAndCorrectState(userId, clientState);
      
      if (validationResult.corrected) {
        return {
          hasConflict: true,
          reason: 'State discrepancy detected',
          serverState: validationResult.serverState,
          discrepancies: validationResult.discrepancies
        };
      }

      // Verify checksum
      const serverChecksum = generateGameStateChecksum(validationResult.serverState);
      if (clientChecksum && clientChecksum !== serverChecksum) {
        return {
          hasConflict: true,
          reason: 'Checksum mismatch',
          serverState: validationResult.serverState,
          discrepancies: [{ field: 'checksum', client: clientChecksum, server: serverChecksum }]
        };
      }

      return {
        hasConflict: false,
        serverState: validationResult.serverState
      };

    } catch (error) {
      console.error(`State validation error for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Process upgrade purchase
   * @param {number} userId - User ID
   * @param {Object} upgradeData - Upgrade data
   * @returns {Promise<Object>} Purchase result
   */
  async processUpgradePurchase(userId, upgradeData) {
    // TODO: Implement upgrade purchase logic
    // This would integrate with the upgrade service
    return {
      success: true,
      upgradeType: upgradeData.upgradeType,
      newLevel: (upgradeData.oldLevel || 0) + 1,
      cost: upgradeData.cost || 0
    };
  }

  /**
   * Process full state synchronization
   * @param {number} userId - User ID
   * @param {Object} syncData - Full sync data
   * @returns {Promise<Object>} Sync result
   */
  async processFullSync(userId, syncData) {
    const validationResult = await this.gameService.validateAndCorrectState(userId, syncData.clientState);
    
    return {
      success: true,
      correction: validationResult.corrected,
      serverState: validationResult.serverState,
      discrepancies: validationResult.discrepancies || []
    };
  }

  /**
   * Handle failed operations
   * @param {Object} socket - Socket instance
   * @param {Array} failedOperations - Failed operations
   */
  handleFailedOperations(socket, failedOperations) {
    // Send individual failure notifications
    failedOperations.forEach(failure => {
      socket.emit(SOCKET_EVENTS.VALIDATION_ERROR, {
        operationId: failure.id,
        operation: failure.operation,
        error: failure.error,
        originalData: failure.originalData
      });
    });
  }

  /**
   * Broadcast message to specific user
   * @param {number} userId - User ID
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  broadcastToUser(userId, event, data) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit(event, data);
      }
    }
  }

  /**
   * Update sync performance statistics
   * @param {number} processingTime - Processing time in ms
   * @param {boolean} success - Whether sync was successful
   */
  updateSyncStats(processingTime, success) {
    this.syncStats.totalSyncs++;
    
    if (success) {
      this.syncStats.successfulSyncs++;
    } else {
      this.syncStats.failedSyncs++;
    }
    
    // Calculate rolling average processing time
    const totalTime = this.syncStats.averageProcessingTime * (this.syncStats.totalSyncs - 1) + processingTime;
    this.syncStats.averageProcessingTime = totalTime / this.syncStats.totalSyncs;
  }

  /**
   * Get handler statistics
   * @returns {Object} Handler statistics
   */
  getStats() {
    return {
      ...this.syncStats,
      connectedUsers: this.connectedUsers.size,
      successRate: this.syncStats.totalSyncs > 0 
        ? (this.syncStats.successfulSyncs / this.syncStats.totalSyncs * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.connectedUsers.clear();
    this.userSockets.clear();
    
    if (this.gameService) {
      this.gameService.destroy();
    }
  }
}

module.exports = GameSocketHandler;