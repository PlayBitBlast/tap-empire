// gameSocketHandler.test.js - Tests for GameSocketHandler class
// Tests socket event handling, batch processing, and anti-cheat validation

const GameSocketHandler = require('./gameSocketHandler');
const GameService = require('../services/gameService');
const { SOCKET_EVENTS, ERROR_CODES } = require('../../../shared/constants/events');
const { GAME_CONFIG } = require('../../../shared/constants/gameConfig');

// Mock the calculations module
jest.mock('../../../shared/utils/calculations', () => ({
  validateTapRate: jest.fn(() => true),
  generateGameStateChecksum: jest.fn(() => 'test-checksum')
}));

// Mock Socket.io
const mockIo = {
  sockets: {
    sockets: new Map()
  }
};

const mockSocket = {
  id: 'test-socket-123',
  on: jest.fn(),
  emit: jest.fn(),
  handshake: {
    auth: { userId: 1 }
  }
};

// Mock GameService
jest.mock('../services/gameService');

describe('GameSocketHandler', () => {
  let handler;
  let mockGameService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset GameService mock
    GameService.mockClear();
    mockGameService = {
      processTap: jest.fn(),
      validateAndCorrectState: jest.fn(),
      destroy: jest.fn()
    };
    GameService.mockImplementation(() => mockGameService);

    handler = new GameSocketHandler(mockIo);
  });

  afterEach(() => {
    if (handler) {
      handler.destroy();
    }
  });

  describe('Connection Handling', () => {
    test('should set up socket event listeners on connection', () => {
      handler.handleConnection(mockSocket);

      expect(mockSocket.on).toHaveBeenCalledWith(SOCKET_EVENTS.DISCONNECT, expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith(SOCKET_EVENTS.GAME_SYNC, expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith(SOCKET_EVENTS.GAME_TAP, expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith(SOCKET_EVENTS.GAME_UPGRADE, expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith(SOCKET_EVENTS.GAME_FORCE_SYNC, expect.any(Function));
    });

    test('should send welcome message on connection', () => {
      handler.handleConnection(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith(SOCKET_EVENTS.WELCOME, {
        message: 'Connected to Tap Empire game server',
        socketId: mockSocket.id,
        serverTime: expect.any(Number)
      });
    });

    test('should clean up on disconnection', () => {
      // First connect
      handler.handleConnection(mockSocket);
      
      // Authenticate user
      handler.connectedUsers.set(mockSocket.id, {
        userId: 1,
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        syncState: { lastSyncTime: 0, pendingOperations: [], checksumHistory: [] }
      });
      handler.userSockets.set(1, mockSocket.id);

      // Then disconnect
      handler.handleDisconnection(mockSocket);

      expect(handler.connectedUsers.has(mockSocket.id)).toBe(false);
      expect(handler.userSockets.has(1)).toBe(false);
    });
  });

  describe('Authentication', () => {
    test('should authenticate user successfully', async () => {
      const authData = { userId: 1 };

      await handler.handleAuthentication(mockSocket, authData);

      expect(handler.connectedUsers.has(mockSocket.id)).toBe(true);
      expect(handler.userSockets.get(1)).toBe(mockSocket.id);
      expect(mockSocket.emit).toHaveBeenCalledWith(SOCKET_EVENTS.AUTH_SUCCESS, {
        userId: 1,
        serverTime: expect.any(Number),
        message: 'Authentication successful'
      });
    });

    test('should reject authentication without userId', async () => {
      const authData = {};
      const socketWithoutAuth = { ...mockSocket, handshake: { auth: {} } };

      await handler.handleAuthentication(socketWithoutAuth, authData);

      expect(handler.connectedUsers.has(socketWithoutAuth.id)).toBe(false);
      expect(socketWithoutAuth.emit).toHaveBeenCalledWith(SOCKET_EVENTS.AUTH_ERROR, {
        error: 'Authentication required',
        code: ERROR_CODES.AUTH_INVALID_TOKEN
      });
    });
  });

  describe('Sync Request Validation', () => {
    let userInfo;

    beforeEach(() => {
      userInfo = {
        userId: 1,
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        syncState: {
          lastSyncTime: 0,
          pendingOperations: [],
          checksumHistory: []
        }
      };
    });

    test('should validate sync request format', () => {
      const validSyncData = {
        id: 'sync-123',
        operations: [{ operation: 'tap', data: { earnings: 10 } }],
        timestamp: Date.now()
      };

      const result = handler.validateSyncRequest(validSyncData, userInfo);

      expect(result.valid).toBe(true);
    });

    test('should reject sync request without required fields', () => {
      const invalidSyncData = {
        id: 'sync-123'
        // Missing operations and timestamp
      };

      const result = handler.validateSyncRequest(invalidSyncData, userInfo);

      expect(result.valid).toBe(false);
      expect(result.code).toBe(ERROR_CODES.VALIDATION_INVALID_DATA);
    });

    test('should reject sync request with too many operations', () => {
      const operations = [];
      for (let i = 0; i < GAME_CONFIG.MAX_BATCH_OPERATIONS + 1; i++) {
        operations.push({ operation: 'tap', data: { earnings: i } });
      }

      const syncData = {
        id: 'sync-123',
        operations,
        timestamp: Date.now()
      };

      const result = handler.validateSyncRequest(syncData, userInfo);

      expect(result.valid).toBe(false);
      expect(result.code).toBe(ERROR_CODES.VALIDATION_FIELD_OUT_OF_RANGE);
    });

    test('should reject sync request with invalid timestamp', () => {
      const syncData = {
        id: 'sync-123',
        operations: [{ operation: 'tap', data: { earnings: 10 } }],
        timestamp: Date.now() - 120000 // 2 minutes ago (too old)
      };

      const result = handler.validateSyncRequest(syncData, userInfo);

      expect(result.valid).toBe(false);
      expect(result.code).toBe(ERROR_CODES.VALIDATION_INVALID_DATA);
    });

    test('should enforce sync rate limiting', () => {
      userInfo.syncState.lastSyncTime = Date.now() - 500; // 500ms ago

      const syncData = {
        id: 'sync-123',
        operations: [{ operation: 'tap', data: { earnings: 10 } }],
        timestamp: Date.now()
      };

      const result = handler.validateSyncRequest(syncData, userInfo);

      expect(result.valid).toBe(false);
      expect(result.code).toBe(ERROR_CODES.RATE_LIMIT_EXCEEDED);
    });
  });

  describe('Batch Operation Processing', () => {
    beforeEach(() => {
      mockGameService.processTap.mockResolvedValue({
        success: true,
        earnings: 10,
        newCoins: 1010,
        totalCoinsEarned: 5010
      });
    });

    test('should process tap operations successfully', async () => {
      const operations = [
        { id: 'op-1', operation: 'tap', data: { earnings: 10, timestamp: Date.now() } },
        { id: 'op-2', operation: 'tap', data: { earnings: 15, timestamp: Date.now() } }
      ];

      const result = await handler.processSyncOperations(1, operations);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(mockGameService.processTap).toHaveBeenCalledTimes(2);
    });

    test('should handle failed operations', async () => {
      mockGameService.processTap
        .mockResolvedValueOnce({ success: true, earnings: 10 })
        .mockRejectedValueOnce(new Error('Validation failed'));

      const operations = [
        { id: 'op-1', operation: 'tap', data: { earnings: 10 } },
        { id: 'op-2', operation: 'tap', data: { earnings: 15 } }
      ];

      const result = await handler.processSyncOperations(1, operations);

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]).toMatchObject({
        id: 'op-2',
        operation: 'tap',
        error: 'Validation failed'
      });
    });

    test('should collect updates from successful operations', async () => {
      mockGameService.processTap.mockResolvedValue({
        success: true,
        earnings: 10,
        newCoins: 1010,
        totalCoinsEarned: 5010
      });

      const operations = [
        { id: 'op-1', operation: 'tap', data: { earnings: 10 } }
      ];

      const result = await handler.processSyncOperations(1, operations);

      expect(result.updates).toMatchObject({
        coins: 1010,
        totalCoinsEarned: 5010
      });
    });

    test('should handle unknown operation types', async () => {
      const operations = [
        { id: 'op-1', operation: 'unknown_operation', data: {} }
      ];

      const result = await handler.processSyncOperations(1, operations);

      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBe('Unknown operation: unknown_operation');
    });
  });

  describe('Game Sync Handling', () => {
    let authenticatedSocket;

    beforeEach(() => {
      authenticatedSocket = { ...mockSocket, emit: jest.fn() };
      handler.connectedUsers.set(authenticatedSocket.id, {
        userId: 1,
        connectedAt: Date.now(),
        lastActivity: Date.now() - 2000, // 2 seconds ago
        syncState: {
          lastSyncTime: 0,
          pendingOperations: [],
          checksumHistory: []
        }
      });

      mockGameService.validateAndCorrectState.mockResolvedValue({
        corrected: false,
        serverState: { coins: 1000, totalCoinsEarned: 5000 }
      });
    });

    test('should handle successful sync request', async () => {
      const syncData = {
        id: 'sync-123',
        operations: [{ operation: 'tap', data: { earnings: 10 } }],
        clientState: { coins: 1000, totalCoinsEarned: 5000 },
        checksum: 'test-checksum',
        timestamp: Date.now()
      };

      mockGameService.processTap.mockResolvedValue({
        success: true,
        earnings: 10,
        newCoins: 1010
      });

      await handler.handleGameSync(authenticatedSocket, syncData);

      expect(authenticatedSocket.emit).toHaveBeenCalledWith(
        SOCKET_EVENTS.GAME_SYNC_RESULT,
        expect.objectContaining({
          id: 'sync-123',
          success: true,
          operations: expect.any(Array)
        })
      );
    });

    test('should handle sync request from unauthenticated socket', async () => {
      const unauthenticatedSocket = { 
        ...mockSocket, 
        id: 'unauthenticated-socket-456', // Different socket ID
        emit: jest.fn() 
      };
      const syncData = {
        id: 'sync-123',
        operations: [{ operation: 'tap', data: { earnings: 10 } }],
        timestamp: Date.now()
      };

      // Make sure this socket is not in connectedUsers
      expect(handler.connectedUsers.has(unauthenticatedSocket.id)).toBe(false);

      await handler.handleGameSync(unauthenticatedSocket, syncData);

      expect(unauthenticatedSocket.emit).toHaveBeenCalledWith(
        SOCKET_EVENTS.GAME_SYNC_RESULT,
        expect.objectContaining({
          id: 'sync-123',
          success: false,
          error: 'Not authenticated',
          code: ERROR_CODES.AUTH_INVALID_TOKEN
        })
      );
    });

    test('should handle state conflicts with server correction', async () => {
      const syncData = {
        id: 'sync-123',
        operations: [{ operation: 'tap', data: { earnings: 10 } }],
        clientState: { coins: 2000, totalCoinsEarned: 5000 }, // Incorrect client state
        checksum: 'wrong-checksum',
        timestamp: Date.now()
      };

      mockGameService.validateAndCorrectState.mockResolvedValue({
        corrected: true,
        serverState: { coins: 1000, totalCoinsEarned: 5000 },
        discrepancies: [{ field: 'coins', client: 2000, server: 1000 }]
      });

      await handler.handleGameSync(authenticatedSocket, syncData);

      expect(authenticatedSocket.emit).toHaveBeenCalledWith(
        SOCKET_EVENTS.GAME_SYNC_RESULT,
        expect.objectContaining({
          id: 'sync-123',
          success: false,
          correction: expect.objectContaining({
            reason: 'State discrepancy detected',
            serverState: { coins: 1000, totalCoinsEarned: 5000 }
          })
        })
      );
    });
  });

  describe('Individual Event Handling', () => {
    let authenticatedSocket;

    beforeEach(() => {
      authenticatedSocket = { ...mockSocket, emit: jest.fn() };
      handler.connectedUsers.set(authenticatedSocket.id, {
        userId: 1,
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        syncState: { lastSyncTime: 0, pendingOperations: [], checksumHistory: [] }
      });
    });

    test('should handle tap events', async () => {
      const tapData = { earnings: 10, timestamp: Date.now() };

      mockGameService.processTap.mockResolvedValue({
        success: true,
        earnings: 10,
        isGoldenTap: false,
        newCoins: 1010
      });

      await handler.handleTapEvent(authenticatedSocket, tapData);

      expect(mockGameService.processTap).toHaveBeenCalledWith(1, tapData);
      expect(authenticatedSocket.emit).toHaveBeenCalledWith(
        SOCKET_EVENTS.GAME_TAP_RESULT,
        expect.objectContaining({
          success: true,
          earnings: 10,
          isGoldenTap: false,
          newCoins: 1010
        })
      );
    });

    test('should handle tap event errors', async () => {
      const tapData = { earnings: 10, timestamp: Date.now() };

      mockGameService.processTap.mockRejectedValue(new Error('Rate limit exceeded'));

      await handler.handleTapEvent(authenticatedSocket, tapData);

      expect(authenticatedSocket.emit).toHaveBeenCalledWith(
        SOCKET_EVENTS.GAME_TAP_RESULT,
        expect.objectContaining({
          success: false,
          error: 'Rate limit exceeded'
        })
      );
    });

    test('should handle force sync requests', async () => {
      const syncData = {
        id: 'force-sync-123',
        clientState: { coins: 1000, totalCoinsEarned: 5000 }
      };

      mockGameService.validateAndCorrectState.mockResolvedValue({
        corrected: false,
        serverState: { coins: 1000, totalCoinsEarned: 5000 }
      });

      await handler.handleForceSync(authenticatedSocket, syncData);

      expect(authenticatedSocket.emit).toHaveBeenCalledWith(
        SOCKET_EVENTS.GAME_SYNC_RESULT,
        expect.objectContaining({
          id: 'force-sync-123',
          success: true,
          serverState: { coins: 1000, totalCoinsEarned: 5000 }
        })
      );
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should update sync statistics', () => {
      handler.updateSyncStats(150, true);

      expect(handler.syncStats.totalSyncs).toBe(1);
      expect(handler.syncStats.successfulSyncs).toBe(1);
      expect(handler.syncStats.averageProcessingTime).toBe(150);
    });

    test('should provide comprehensive statistics', () => {
      handler.connectedUsers.set('socket-1', { userId: 1 });
      handler.connectedUsers.set('socket-2', { userId: 2 });
      handler.syncStats = {
        totalSyncs: 100,
        successfulSyncs: 85,
        failedSyncs: 15,
        averageProcessingTime: 120
      };

      const stats = handler.getStats();

      expect(stats).toMatchObject({
        totalSyncs: 100,
        successfulSyncs: 85,
        failedSyncs: 15,
        averageProcessingTime: 120,
        connectedUsers: 2,
        successRate: '85.00%'
      });
    });
  });

  describe('Cleanup and Destruction', () => {
    test('should clean up resources on destroy', () => {
      handler.connectedUsers.set('socket-1', { userId: 1 });
      handler.userSockets.set(1, 'socket-1');

      handler.destroy();

      expect(handler.connectedUsers.size).toBe(0);
      expect(handler.userSockets.size).toBe(0);
      expect(mockGameService.destroy).toHaveBeenCalled();
    });
  });
});