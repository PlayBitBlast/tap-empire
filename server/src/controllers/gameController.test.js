const GameController = require('./gameController');
const GameService = require('../services/gameService');

// Mock GameService
jest.mock('../services/gameService');

describe('GameController', () => {
  let gameController;
  let mockGameService;
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGameService = {
      processTap: jest.fn(),
      validateAndCorrectState: jest.fn(),
      getAntiCheatStats: jest.fn(),
      cleanupTapHistory: jest.fn()
    };

    GameService.mockImplementation(() => mockGameService);

    gameController = new GameController();

    req = {
      user: { id: 1, is_admin: false },
      body: {}
    };

    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('tap', () => {
    it('should process tap successfully', async () => {
      const tapResult = {
        success: true,
        earnings: 5,
        newCoins: 1005,
        isGoldenTap: false
      };

      req.body = {
        timestamp: Date.now(),
        clientChecksum: 'test-checksum'
      };

      mockGameService.processTap.mockResolvedValue(tapResult);

      await gameController.tap(req, res);

      expect(mockGameService.processTap).toHaveBeenCalledWith(1, {
        timestamp: req.body.timestamp,
        clientChecksum: req.body.clientChecksum
      });
      expect(res.json).toHaveBeenCalledWith(tapResult);
    });

    it('should return 400 for missing timestamp', async () => {
      req.body = {
        clientChecksum: 'test-checksum'
      };

      await gameController.tap(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing timestamp',
        message: 'Timestamp is required for tap validation'
      });
    });

    it('should return 400 for failed tap processing', async () => {
      const tapResult = {
        success: false,
        error: 'Tap rate too high'
      };

      req.body = {
        timestamp: Date.now(),
        clientChecksum: 'test-checksum'
      };

      mockGameService.processTap.mockResolvedValue(tapResult);

      await gameController.tap(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(tapResult);
    });

    it('should handle service errors', async () => {
      req.body = {
        timestamp: Date.now(),
        clientChecksum: 'test-checksum'
      };

      mockGameService.processTap.mockRejectedValue(new Error('Service error'));

      await gameController.tap(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
        message: 'Failed to process tap'
      });
    });
  });

  describe('syncState', () => {
    it('should sync state successfully', async () => {
      const syncResult = {
        corrected: false,
        serverState: {
          coins: 1000,
          checksum: 'test-checksum'
        }
      };

      req.body = {
        clientState: {
          coins: 1000,
          total_coins_earned: 5000
        }
      };

      mockGameService.validateAndCorrectState.mockResolvedValue(syncResult);

      await gameController.syncState(req, res);

      expect(mockGameService.validateAndCorrectState).toHaveBeenCalledWith(1, req.body.clientState);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        ...syncResult
      });
    });

    it('should return 400 for missing client state', async () => {
      req.body = {};

      await gameController.syncState(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing client state',
        message: 'Client state is required for synchronization'
      });
    });

    it('should handle service errors', async () => {
      req.body = {
        clientState: { coins: 1000 }
      };

      mockGameService.validateAndCorrectState.mockRejectedValue(new Error('Service error'));

      await gameController.syncState(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
        message: 'Failed to sync game state'
      });
    });
  });

  describe('getAntiCheatStats', () => {
    it('should return stats for admin user', async () => {
      req.user.is_admin = true;
      const stats = {
        activeTapSessions: 5,
        suspiciousActivities: 2
      };

      mockGameService.getAntiCheatStats.mockReturnValue(stats);

      await gameController.getAntiCheatStats(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        stats
      });
    });

    it('should deny access for non-admin user', async () => {
      req.user.is_admin = false;

      await gameController.getAntiCheatStats(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied',
        message: 'Admin access required'
      });
    });

    it('should handle service errors', async () => {
      req.user.is_admin = true;
      mockGameService.getAntiCheatStats.mockImplementation(() => {
        throw new Error('Service error');
      });

      await gameController.getAntiCheatStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get anti-cheat statistics'
      });
    });
  });

  describe('forceCleanup', () => {
    it('should cleanup for admin user', async () => {
      req.user.is_admin = true;

      await gameController.forceCleanup(req, res);

      expect(mockGameService.cleanupTapHistory).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Tap history cleanup completed'
      });
    });

    it('should deny access for non-admin user', async () => {
      req.user.is_admin = false;

      await gameController.forceCleanup(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied',
        message: 'Admin access required'
      });
    });

    it('should handle service errors', async () => {
      req.user.is_admin = true;
      mockGameService.cleanupTapHistory.mockImplementation(() => {
        throw new Error('Service error');
      });

      await gameController.forceCleanup(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
        message: 'Failed to cleanup tap history'
      });
    });
  });
});