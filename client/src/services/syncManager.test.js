// syncManager.test.js - Tests for SyncManager class
// Tests batch sync operations, conflict resolution, and error recovery

import SyncManager from './syncManager';
import GameEngine from './gameEngine';
import { SOCKET_EVENTS, ERROR_CODES } from '../../../shared/constants/events';
import { GAME_CONFIG } from '../../../shared/constants/gameConfig';

// Mock socket.io-client
const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  connected: true
};

// Mock game engine
const mockGameEngine = {
  state: {
    coins: 1000,
    totalCoinsEarned: 5000,
    upgrades: { tap_multiplier: 5 }
  },
  getState: jest.fn(() => mockGameEngine.state),
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  applyServerCorrection: jest.fn()
};

describe('SyncManager', () => {
  let syncManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGameEngine.getState.mockReturnValue(mockGameEngine.state);
    syncManager = new SyncManager(mockGameEngine, mockSocket);
  });

  afterEach(() => {
    if (syncManager) {
      syncManager.destroy();
    }
  });

  describe('Initialization', () => {
    test('should initialize with correct default values', () => {
      expect(syncManager.gameEngine).toBe(mockGameEngine);
      expect(syncManager.socket).toBe(mockSocket);
      expect(syncManager.syncQueue).toEqual([]);
      expect(syncManager.connectionState).toBe('disconnected');
      expect(syncManager.syncInProgress).toBe(false);
    });

    test('should set up socket event listeners', () => {
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith(SOCKET_EVENTS.GAME_SYNC_RESULT, expect.any(Function));
    });

    test('should start periodic sync timer', () => {
      expect(syncManager.syncInterval).toBeDefined();
    });
  });

  describe('Queue Management', () => {
    beforeEach(() => {
      syncManager.connectionState = 'disconnected'; // Prevent immediate sync
    });

    test('should queue sync operations correctly', () => {
      const operation = 'tap';
      const data = { earnings: 10, timestamp: Date.now() };

      syncManager.queueSync(operation, data);

      expect(syncManager.syncQueue).toHaveLength(1);
      expect(syncManager.syncQueue[0]).toMatchObject({
        operation,
        data,
        priority: 'normal'
      });
    });

    test('should prioritize high priority operations', () => {
      syncManager.queueSync('tap', { earnings: 5 });
      syncManager.queueSync('upgrade', { type: 'tap_multiplier' }, { priority: 'high' });
      syncManager.queueSync('tap', { earnings: 10 });

      expect(syncManager.syncQueue[0].operation).toBe('upgrade');
      expect(syncManager.syncQueue[0].priority).toBe('high');
    });

    test('should limit queue size to prevent memory issues', () => {
      // Fill queue beyond limit
      for (let i = 0; i < GAME_CONFIG.MAX_SYNC_QUEUE_SIZE + 10; i++) {
        syncManager.queueSync('tap', { earnings: i });
      }

      expect(syncManager.syncQueue.length).toBeLessThanOrEqual(GAME_CONFIG.MAX_SYNC_QUEUE_SIZE);
    });

    test('should preserve high priority operations when trimming queue', () => {
      // Fill with normal priority operations
      for (let i = 0; i < GAME_CONFIG.MAX_SYNC_QUEUE_SIZE; i++) {
        syncManager.queueSync('tap', { earnings: i });
      }

      // Add high priority operation (this should trigger trimming)
      syncManager.queueSync('upgrade', { type: 'important' }, { priority: 'high' });

      const highPriorityOps = syncManager.syncQueue.filter(op => op.priority === 'high');
      expect(highPriorityOps).toHaveLength(1);
      expect(highPriorityOps[0].data.type).toBe('important');
      
      // Queue should not exceed max size
      expect(syncManager.syncQueue.length).toBeLessThanOrEqual(GAME_CONFIG.MAX_SYNC_QUEUE_SIZE);
    });
  });

  describe('Batch Synchronization', () => {
    beforeEach(() => {
      syncManager.connectionState = 'connected';
      syncManager.syncInProgress = false;
    });

    test('should not sync when disconnected', async () => {
      syncManager.connectionState = 'disconnected';
      syncManager.queueSync('tap', { earnings: 10 });

      await syncManager.sync();

      expect(mockSocket.emit).not.toHaveBeenCalled();
      expect(syncManager.syncQueue).toHaveLength(1);
    });

    test('should not sync when already in progress', async () => {
      syncManager.syncInProgress = true;
      syncManager.queueSync('tap', { earnings: 10 });

      await syncManager.sync();

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    test('should batch operations correctly', async () => {
      // Add multiple operations
      for (let i = 0; i < 5; i++) {
        syncManager.queueSync('tap', { earnings: i });
      }

      await syncManager.sync();

      expect(mockSocket.emit).toHaveBeenCalledWith(
        SOCKET_EVENTS.GAME_SYNC,
        expect.objectContaining({
          operations: expect.arrayContaining([
            expect.objectContaining({ operation: 'tap' })
          ])
        })
      );

      expect(syncManager.syncQueue).toHaveLength(0);
    });

    test('should respect batch size limits', async () => {
      // Add more operations than batch size
      for (let i = 0; i < GAME_CONFIG.BATCH_SYNC_SIZE + 5; i++) {
        syncManager.queueSync('tap', { earnings: i });
      }

      await syncManager.sync();

      const syncCall = mockSocket.emit.mock.calls.find(call => call[0] === SOCKET_EVENTS.GAME_SYNC);
      expect(syncCall[1].operations).toHaveLength(GAME_CONFIG.BATCH_SYNC_SIZE);
      expect(syncManager.syncQueue).toHaveLength(5);
    });

    test('should include client state and checksum in sync request', async () => {
      syncManager.queueSync('tap', { earnings: 10 });

      await syncManager.sync();

      const syncCall = mockSocket.emit.mock.calls.find(call => call[0] === SOCKET_EVENTS.GAME_SYNC);
      expect(syncCall[1]).toMatchObject({
        clientState: expect.objectContaining({
          coins: mockGameEngine.state.coins,
          totalCoinsEarned: mockGameEngine.state.totalCoinsEarned
        }),
        checksum: expect.any(String)
      });
    });
  });

  describe('Sync Response Handling', () => {
    test('should handle successful sync response', () => {
      const syncId = 'test-sync-123';
      const pendingSync = {
        request: { id: syncId },
        startTime: Date.now() - 100,
        operations: [{ operation: 'tap', data: { earnings: 10 } }]
      };

      syncManager.pendingSyncs.set(syncId, pendingSync);

      const response = {
        id: syncId,
        success: true,
        operations: pendingSync.operations,
        timestamp: Date.now()
      };

      syncManager.handleSyncResponse(response);

      expect(mockGameEngine.emit).toHaveBeenCalledWith('sync:success', expect.any(Object));
      expect(syncManager.pendingSyncs.has(syncId)).toBe(false);
      expect(syncManager.syncInProgress).toBe(false);
    });

    test('should handle server correction response', () => {
      const syncId = 'test-sync-123';
      const pendingSync = {
        request: { id: syncId },
        startTime: Date.now() - 100,
        operations: [{ operation: 'tap', data: { earnings: 10 } }]
      };

      syncManager.pendingSyncs.set(syncId, pendingSync);

      const correction = {
        serverState: { coins: 500, totalCoinsEarned: 2000 },
        reason: 'State mismatch detected'
      };

      const response = {
        id: syncId,
        success: false,
        correction,
        timestamp: Date.now()
      };

      syncManager.handleSyncResponse(response);

      expect(mockGameEngine.applyServerCorrection).toHaveBeenCalledWith(correction.serverState);
      expect(mockGameEngine.emit).toHaveBeenCalledWith('sync:corrected', expect.any(Object));
    });

    test('should handle sync failure and retry', () => {
      const syncId = 'test-sync-123';
      const operations = [
        { operation: 'tap', data: { earnings: 10 }, retryCount: 0 }
      ];
      const pendingSync = {
        request: { id: syncId },
        startTime: Date.now() - 100,
        operations
      };

      syncManager.pendingSyncs.set(syncId, pendingSync);

      const response = {
        id: syncId,
        success: false,
        error: 'Validation failed',
        timestamp: Date.now()
      };

      syncManager.handleSyncResponse(response);

      expect(syncManager.retryQueue).toHaveLength(1);
      expect(syncManager.retryQueue[0].retryCount).toBe(1);
      expect(mockGameEngine.emit).toHaveBeenCalledWith('sync:failed', expect.any(Object));
    });

    test('should not retry operations that exceed max retries', () => {
      const syncId = 'test-sync-123';
      const operations = [
        { operation: 'tap', data: { earnings: 10 }, retryCount: 3 } // Already at max retries
      ];
      const pendingSync = {
        request: { id: syncId },
        startTime: Date.now() - 100,
        operations
      };

      syncManager.pendingSyncs.set(syncId, pendingSync);

      const response = {
        id: syncId,
        success: false,
        error: 'Validation failed',
        timestamp: Date.now()
      };

      syncManager.handleSyncResponse(response);

      expect(syncManager.retryQueue).toHaveLength(0);
    });
  });

  describe('Connection Management', () => {
    test('should handle connection state changes', () => {
      syncManager.handleConnectionChange('connected');

      expect(syncManager.connectionState).toBe('connected');
      expect(mockGameEngine.emit).toHaveBeenCalledWith('connection:state_changed', {
        previousState: 'disconnected',
        currentState: 'connected',
        timestamp: expect.any(Number)
      });
    });

    test('should force full sync on reconnection', () => {
      const forceFullSyncSpy = jest.spyOn(syncManager, 'forceFullSync');
      
      syncManager.handleConnectionChange('reconnected');

      expect(forceFullSyncSpy).toHaveBeenCalled();
    });

    test('should reset retry delay on successful connection', () => {
      syncManager.retryDelay = 5000; // Set high retry delay
      
      syncManager.handleConnectionChange('connected');

      expect(syncManager.retryDelay).toBe(1000); // Should reset to initial value
    });
  });

  describe('Error Recovery', () => {
    test('should process retry queue', () => {
      syncManager.connectionState = 'connected';
      syncManager.retryQueue = [
        { operation: 'tap', data: { earnings: 10 }, retryCount: 1 }
      ];

      syncManager.processRetryQueue();

      // Should move operation back to sync queue with delay
      expect(syncManager.retryQueue).toHaveLength(0);
    });

    test('should not process retry queue when disconnected', () => {
      syncManager.connectionState = 'disconnected';
      syncManager.retryQueue = [
        { operation: 'tap', data: { earnings: 10 }, retryCount: 1 }
      ];

      syncManager.processRetryQueue();

      expect(syncManager.retryQueue).toHaveLength(1);
    });

    test('should handle sync timeout', () => {
      const syncId = 'test-sync-123';
      const operations = [
        { operation: 'tap', data: { earnings: 10 }, retryCount: 0 }
      ];
      const pendingSync = {
        request: { id: syncId },
        startTime: Date.now() - 100,
        operations
      };

      syncManager.pendingSyncs.set(syncId, pendingSync);

      syncManager.handleSyncTimeout(syncId);

      expect(syncManager.pendingSyncs.has(syncId)).toBe(false);
      expect(syncManager.syncInProgress).toBe(false);
      expect(syncManager.retryQueue).toHaveLength(1);
      expect(mockGameEngine.emit).toHaveBeenCalledWith('sync:timeout', expect.any(Object));
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should update sync statistics correctly', () => {
      syncManager.updateSyncStats(100, true);

      expect(syncManager.syncStats.totalSyncs).toBe(1);
      expect(syncManager.syncStats.successfulSyncs).toBe(1);
      expect(syncManager.syncStats.lastSyncLatency).toBe(100);
    });

    test('should calculate average latency correctly', () => {
      syncManager.updateSyncStats(100, true);
      syncManager.updateSyncStats(200, true);

      expect(syncManager.syncStats.averageLatency).toBe(150);
    });

    test('should provide comprehensive sync statistics', () => {
      syncManager.syncQueue = [{ operation: 'tap' }];
      syncManager.retryQueue = [{ operation: 'upgrade' }];
      syncManager.pendingSyncs.set('test', {});
      syncManager.connectionState = 'connected';
      syncManager.syncStats = {
        totalSyncs: 10,
        successfulSyncs: 8,
        failedSyncs: 2,
        averageLatency: 150,
        lastSyncLatency: 120
      };

      const stats = syncManager.getSyncStats();

      expect(stats).toMatchObject({
        totalSyncs: 10,
        successfulSyncs: 8,
        failedSyncs: 2,
        averageLatency: 150,
        lastSyncLatency: 120,
        queueSize: 1,
        retryQueueSize: 1,
        pendingSyncs: 1,
        connectionState: 'connected',
        successRate: '80.00%'
      });
    });
  });

  describe('Cleanup and Destruction', () => {
    test('should clean up resources on destroy', () => {
      syncManager.syncInterval = setInterval(() => {}, 1000);
      syncManager.retryInterval = setInterval(() => {}, 1000);
      syncManager.pendingSyncs.set('test', {});
      syncManager.syncQueue = [{ operation: 'tap' }];

      syncManager.destroy();

      expect(syncManager.syncInterval).toBeNull();
      expect(syncManager.pendingSyncs.size).toBe(0);
      expect(syncManager.syncQueue).toHaveLength(0);
      expect(mockSocket.off).toHaveBeenCalled();
    });

    test('should reset state correctly', () => {
      syncManager.syncQueue = [{ operation: 'tap' }];
      syncManager.retryQueue = [{ operation: 'upgrade' }];
      syncManager.pendingSyncs.set('test', {});
      syncManager.syncInProgress = true;

      syncManager.reset();

      expect(syncManager.syncQueue).toHaveLength(0);
      expect(syncManager.retryQueue).toHaveLength(0);
      expect(syncManager.pendingSyncs.size).toBe(0);
      expect(syncManager.syncInProgress).toBe(false);
    });
  });
});