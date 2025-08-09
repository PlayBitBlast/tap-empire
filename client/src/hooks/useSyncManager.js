// useSyncManager.js - React hook for managing real-time synchronization
// Integrates SyncManager with GameEngine and provides sync status to components

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import SyncManager from '../services/syncManager';
import { SOCKET_EVENTS } from '../../../shared/constants/events';

/**
 * Custom hook for managing real-time synchronization
 * @param {GameEngine} gameEngine - Game engine instance
 * @param {Object} options - Configuration options
 * @returns {Object} Sync manager and status
 */
const useSyncManager = (gameEngine, options = {}) => {
  const [syncStatus, setSyncStatus] = useState({
    connected: false,
    syncing: false,
    lastSyncTime: null,
    error: null,
    stats: null
  });

  const socketRef = useRef(null);
  const syncManagerRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const {
    serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001',
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 1000
  } = options;

  /**
   * Initialize socket connection and sync manager
   */
  const initializeSync = useCallback(() => {
    if (!gameEngine) return;

    try {
      // Create socket connection
      socketRef.current = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: reconnectAttempts,
        reconnectionDelay: reconnectDelay,
        auth: {
          // TODO: Add proper authentication token
          userId: gameEngine.state.userId || 'anonymous'
        }
      });

      // Create sync manager
      syncManagerRef.current = new SyncManager(gameEngine, socketRef.current);

      // Set sync manager in game engine
      gameEngine.setSyncManager(syncManagerRef.current);

      // Set up event listeners
      setupEventListeners();

      console.log('Sync manager initialized');

    } catch (error) {
      console.error('Failed to initialize sync manager:', error);
      setSyncStatus(prev => ({
        ...prev,
        error: error.message,
        connected: false
      }));
    }
  }, [gameEngine, serverUrl, reconnectAttempts, reconnectDelay]);

  /**
   * Set up event listeners for sync status updates
   */
  const setupEventListeners = useCallback(() => {
    if (!socketRef.current || !syncManagerRef.current || !gameEngine) return;

    const socket = socketRef.current;
    const syncManager = syncManagerRef.current;

    // Socket connection events
    socket.on('connect', () => {
      console.log('Socket connected');
      setSyncStatus(prev => ({
        ...prev,
        connected: true,
        error: null
      }));
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setSyncStatus(prev => ({
        ...prev,
        connected: false,
        syncing: false,
        error: reason === 'io server disconnect' ? 'Server disconnected' : null
      }));
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setSyncStatus(prev => ({
        ...prev,
        connected: false,
        error: error.message
      }));
    });

    // Game engine sync events
    gameEngine.on('sync:success', (data) => {
      setSyncStatus(prev => ({
        ...prev,
        syncing: false,
        lastSyncTime: Date.now(),
        error: null,
        stats: syncManager.getSyncStats()
      }));
    });

    gameEngine.on('sync:failed', (data) => {
      setSyncStatus(prev => ({
        ...prev,
        syncing: false,
        error: data.error,
        stats: syncManager.getSyncStats()
      }));
    });

    gameEngine.on('sync:corrected', (data) => {
      setSyncStatus(prev => ({
        ...prev,
        syncing: false,
        lastSyncTime: Date.now(),
        error: null,
        stats: syncManager.getSyncStats()
      }));

      // Show notification about state correction
      console.warn('Game state corrected by server:', data.reason);
    });

    gameEngine.on('connection:state_changed', (data) => {
      setSyncStatus(prev => ({
        ...prev,
        connected: data.currentState === 'connected' || data.currentState === 'reconnected'
      }));
    });

    // Sync request events
    gameEngine.on('sync:request', () => {
      setSyncStatus(prev => ({
        ...prev,
        syncing: true
      }));
    });

    // Notification events
    gameEngine.on('notification:show', (notification) => {
      // Handle sync-related notifications
      if (notification.type === 'error' && notification.message.includes('sync')) {
        setSyncStatus(prev => ({
          ...prev,
          error: notification.message
        }));
      }
    });

  }, [gameEngine]);

  /**
   * Connect to server
   */
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    if (socketRef.current) {
      socketRef.current.connect();
    } else {
      initializeSync();
    }
  }, [initializeSync]);

  /**
   * Disconnect from server
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

  /**
   * Force full synchronization
   */
  const forceSync = useCallback(() => {
    if (syncManagerRef.current) {
      syncManagerRef.current.forceFullSync();
    }
  }, []);

  /**
   * Get current sync statistics
   */
  const getSyncStats = useCallback(() => {
    return syncManagerRef.current ? syncManagerRef.current.getSyncStats() : null;
  }, []);

  /**
   * Reset sync manager state
   */
  const resetSync = useCallback(() => {
    if (syncManagerRef.current) {
      syncManagerRef.current.reset();
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    if (autoConnect && gameEngine) {
      initializeSync();
    }

    return () => {
      // Cleanup on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (syncManagerRef.current) {
        syncManagerRef.current.destroy();
      }

      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [autoConnect, gameEngine, initializeSync]);

  // Update sync stats periodically
  useEffect(() => {
    const updateStats = () => {
      if (syncManagerRef.current) {
        setSyncStatus(prev => ({
          ...prev,
          stats: syncManagerRef.current.getSyncStats()
        }));
      }
    };

    const interval = setInterval(updateStats, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    // Sync manager instance
    syncManager: syncManagerRef.current,
    
    // Connection status
    connected: syncStatus.connected,
    syncing: syncStatus.syncing,
    lastSyncTime: syncStatus.lastSyncTime,
    error: syncStatus.error,
    stats: syncStatus.stats,
    
    // Control methods
    connect,
    disconnect,
    forceSync,
    resetSync,
    getSyncStats,
    
    // Socket instance (for advanced usage)
    socket: socketRef.current
  };
};

export default useSyncManager;