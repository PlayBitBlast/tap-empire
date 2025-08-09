const LeaderboardService = require('../services/leaderboardService');
const { SOCKET_EVENTS, ERROR_CODES, SUCCESS_CODES } = require('../../../shared/constants/events');

/**
 * LeaderboardSocketHandler - Handles real-time leaderboard WebSocket events
 */
class LeaderboardSocketHandler {
  constructor(io) {
    this.io = io;
    this.leaderboardService = new LeaderboardService(io);
    
    // Track connected users for personalized updates
    this.connectedUsers = new Map(); // socketId -> userId
    this.userSockets = new Map(); // userId -> Set of socketIds
  }

  /**
   * Handle new socket connection
   * @param {Object} socket - Socket.io socket instance
   */
  handleConnection(socket) {
    console.log(`Leaderboard socket connected: ${socket.id}`);

    // Register event handlers
    this.registerEventHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });
  }

  /**
   * Register all leaderboard-related event handlers
   * @param {Object} socket - Socket.io socket instance
   */
  registerEventHandlers(socket) {
    // Leaderboard data request
    socket.on(SOCKET_EVENTS.LEADERBOARD_REQUEST, (data) => {
      this.handleLeaderboardRequest(socket, data);
    });

    // User authentication for personalized updates
    socket.on(SOCKET_EVENTS.AUTH_SUCCESS, (data) => {
      this.handleUserAuthentication(socket, data);
    });

    // User logout
    socket.on(SOCKET_EVENTS.AUTH_LOGOUT, () => {
      this.handleUserLogout(socket);
    });
  }

  /**
   * Handle leaderboard data request
   * @param {Object} socket - Socket.io socket instance
   * @param {Object} data - Request data
   */
  async handleLeaderboardRequest(socket, data) {
    try {
      // Validate request data
      const { type = 'all_time', limit = 100, offset = 0, includeUserRank = false, userId = null } = data;

      if (!['all_time', 'weekly', 'daily'].includes(type)) {
        socket.emit(SOCKET_EVENTS.LEADERBOARD_DATA, {
          success: false,
          error: 'Invalid leaderboard type',
          code: ERROR_CODES.VALIDATION_INVALID_DATA
        });
        return;
      }

      const parsedLimit = Math.min(Math.max(1, parseInt(limit) || 100), 100);
      const parsedOffset = Math.max(0, parseInt(offset) || 0);

      // Get leaderboard data
      const leaderboard = await this.leaderboardService.getLeaderboard(
        type,
        parsedLimit,
        parsedOffset
      );

      let userRankData = null;
      if (includeUserRank && userId) {
        try {
          userRankData = await this.leaderboardService.getUserRankWithContext(
            parseInt(userId),
            type,
            5
          );
        } catch (error) {
          console.error('Error fetching user rank data:', error);
          // Continue without user rank data
        }
      }

      // Send response
      socket.emit(SOCKET_EVENTS.LEADERBOARD_DATA, {
        success: true,
        code: SUCCESS_CODES.LEADERBOARD_DATA,
        data: {
          leaderboard,
          userRank: userRankData
        }
      });

    } catch (error) {
      console.error('Error handling leaderboard request:', error);
      socket.emit(SOCKET_EVENTS.LEADERBOARD_DATA, {
        success: false,
        error: 'Failed to fetch leaderboard data',
        code: ERROR_CODES.SYSTEM_INTERNAL_ERROR
      });
    }
  }

  /**
   * Handle user authentication for personalized updates
   * @param {Object} socket - Socket.io socket instance
   * @param {Object} data - Authentication data
   */
  handleUserAuthentication(socket, data) {
    try {
      const { userId } = data;
      if (!userId) return;

      // Track this socket for the user
      this.connectedUsers.set(socket.id, userId);
      
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(socket.id);

      // Join user-specific room for personalized updates
      socket.join(`user:${userId}`);

      console.log(`User ${userId} authenticated for leaderboard updates on socket ${socket.id}`);

    } catch (error) {
      console.error('Error handling user authentication:', error);
    }
  }

  /**
   * Handle user logout
   * @param {Object} socket - Socket.io socket instance
   */
  handleUserLogout(socket) {
    try {
      const userId = this.connectedUsers.get(socket.id);
      if (userId) {
        // Leave user-specific room
        socket.leave(`user:${userId}`);
        
        // Remove from tracking
        this.connectedUsers.delete(socket.id);
        
        const userSocketSet = this.userSockets.get(userId);
        if (userSocketSet) {
          userSocketSet.delete(socket.id);
          if (userSocketSet.size === 0) {
            this.userSockets.delete(userId);
          }
        }

        console.log(`User ${userId} logged out from leaderboard updates on socket ${socket.id}`);
      }
    } catch (error) {
      console.error('Error handling user logout:', error);
    }
  }

  /**
   * Handle socket disconnection
   * @param {Object} socket - Socket.io socket instance
   */
  handleDisconnection(socket) {
    try {
      const userId = this.connectedUsers.get(socket.id);
      if (userId) {
        // Clean up tracking
        this.connectedUsers.delete(socket.id);
        
        const userSocketSet = this.userSockets.get(userId);
        if (userSocketSet) {
          userSocketSet.delete(socket.id);
          if (userSocketSet.size === 0) {
            this.userSockets.delete(userId);
          }
        }
      }

      console.log(`Leaderboard socket disconnected: ${socket.id}`);
    } catch (error) {
      console.error('Error handling socket disconnection:', error);
    }
  }

  /**
   * Broadcast leaderboard update to all connected clients
   * @param {Object} updateData - Update data
   */
  broadcastLeaderboardUpdate(updateData) {
    try {
      this.io.emit(SOCKET_EVENTS.LEADERBOARD_UPDATE, {
        type: 'global_update',
        data: updateData,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error broadcasting leaderboard update:', error);
    }
  }

  /**
   * Broadcast rank change to all connected clients
   * @param {Object} rankData - Rank change data
   */
  broadcastRankChange(rankData) {
    try {
      // Broadcast to all clients
      this.io.emit(SOCKET_EVENTS.LEADERBOARD_RANK_CHANGE, {
        type: 'rank_change',
        data: rankData,
        timestamp: Date.now()
      });

      // Send personalized update to the specific user
      if (rankData.userId) {
        this.io.to(`user:${rankData.userId}`).emit(SOCKET_EVENTS.LEADERBOARD_UPDATE, {
          type: 'personal_rank_update',
          data: rankData,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error broadcasting rank change:', error);
    }
  }

  /**
   * Send leaderboard update to specific user
   * @param {number} userId - User ID
   * @param {Object} updateData - Update data
   */
  sendUserUpdate(userId, updateData) {
    try {
      this.io.to(`user:${userId}`).emit(SOCKET_EVENTS.LEADERBOARD_UPDATE, {
        type: 'user_specific_update',
        data: updateData,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error sending user-specific leaderboard update:', error);
    }
  }

  /**
   * Get connected users count
   * @returns {number} Number of connected users
   */
  getConnectedUsersCount() {
    return this.userSockets.size;
  }

  /**
   * Get connected sockets count
   * @returns {number} Number of connected sockets
   */
  getConnectedSocketsCount() {
    return this.connectedUsers.size;
  }

  /**
   * Check if user is connected
   * @param {number} userId - User ID
   * @returns {boolean} True if user is connected
   */
  isUserConnected(userId) {
    return this.userSockets.has(userId);
  }

  /**
   * Get user's socket count
   * @param {number} userId - User ID
   * @returns {number} Number of sockets for the user
   */
  getUserSocketCount(userId) {
    const userSocketSet = this.userSockets.get(userId);
    return userSocketSet ? userSocketSet.size : 0;
  }

  /**
   * Broadcast leaderboard reset notification
   * @param {string} leaderboardType - Type of leaderboard that was reset
   */
  broadcastLeaderboardReset(leaderboardType) {
    try {
      this.io.emit(SOCKET_EVENTS.LEADERBOARD_UPDATE, {
        type: 'leaderboard_reset',
        leaderboardType,
        message: `${leaderboardType} leaderboard has been reset`,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error broadcasting leaderboard reset:', error);
    }
  }

  /**
   * Get handler statistics
   * @returns {Object} Handler statistics
   */
  getStats() {
    return {
      connectedUsers: this.getConnectedUsersCount(),
      connectedSockets: this.getConnectedSocketsCount(),
      timestamp: Date.now()
    };
  }
}

module.exports = { LeaderboardSocketHandler };