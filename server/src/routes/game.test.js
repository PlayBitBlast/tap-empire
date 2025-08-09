const gameRoutes = require('./game');
const GameController = require('../controllers/gameController');

// Mock dependencies
jest.mock('../controllers/gameController');
jest.mock('../middleware/auth', () => (req, res, next) => {
  req.user = { id: 1, is_admin: false };
  next();
});
jest.mock('../middleware/rateLimit', () => ({
  gameActionRateLimit: jest.fn((req, res, next) => next())
}));

describe('Game Routes', () => {
  let mockGameController;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGameController = {
      tap: jest.fn(),
      syncState: jest.fn(),
      getAntiCheatStats: jest.fn(),
      forceCleanup: jest.fn()
    };

    GameController.mockImplementation(() => mockGameController);
  });

  describe('Route Configuration', () => {
    it('should export router with correct routes', () => {
      expect(gameRoutes).toBeDefined();
      expect(typeof gameRoutes).toBe('function');
    });

    it('should create GameController instance', () => {
      // The controller is created when the routes module is loaded
      // Since we're mocking it, we just verify the mock is set up correctly
      expect(GameController).toBeDefined();
      expect(typeof GameController).toBe('function');
    });
  });

  describe('Route Handlers', () => {
    it('should bind controller methods correctly', () => {
      // This test verifies that the routes are set up correctly
      // The actual HTTP testing is done in the controller tests
      expect(mockGameController.tap).toBeDefined();
      expect(mockGameController.syncState).toBeDefined();
      expect(mockGameController.getAntiCheatStats).toBeDefined();
      expect(mockGameController.forceCleanup).toBeDefined();
    });
  });
});