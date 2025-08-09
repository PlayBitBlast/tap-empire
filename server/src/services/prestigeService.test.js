const PrestigeService = require('./prestigeService');
const { GAME_CONFIG } = require('../../../shared/constants/gameConfig');

// Mock dependencies
jest.mock('../repositories/UserRepository');
jest.mock('../repositories/UpgradeRepository');
jest.mock('./upgradeService');

const UserRepository = require('../repositories/UserRepository');
const UpgradeRepository = require('../repositories/UpgradeRepository');
const UpgradeService = require('./upgradeService');

describe('PrestigeService', () => {
  let prestigeService;
  let mockUserRepository;
  let mockUpgradeRepository;
  let mockUpgradeService;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock instances
    mockUserRepository = {
      findById: jest.fn(),
      prestige: jest.fn(),
      transaction: jest.fn(),
      db: {
        query: jest.fn(),
        queryMany: jest.fn()
      }
    };
    
    mockUpgradeRepository = {
      getUserUpgrades: jest.fn()
    };
    
    mockUpgradeService = {
      resetUpgradesForPrestige: jest.fn()
    };

    // Mock constructors
    UserRepository.mockImplementation(() => mockUserRepository);
    UpgradeRepository.mockImplementation(() => mockUpgradeRepository);
    UpgradeService.mockImplementation(() => mockUpgradeService);

    prestigeService = new PrestigeService();
  });

  describe('canPrestige', () => {
    it('should return true when user has enough coins', async () => {
      const mockUser = {
        id: 1,
        total_coins_earned: GAME_CONFIG.PRESTIGE_UNLOCK_COINS,
        prestige_level: 0,
        prestige_points: 0
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await prestigeService.canPrestige(1);

      expect(result.canPrestige).toBe(true);
      expect(result.requiredCoins).toBe(GAME_CONFIG.PRESTIGE_UNLOCK_COINS);
      expect(result.currentTotalCoins).toBe(GAME_CONFIG.PRESTIGE_UNLOCK_COINS);
      expect(result.newPrestigePoints).toBeGreaterThan(0);
    });

    it('should return false when user does not have enough coins', async () => {
      const mockUser = {
        id: 1,
        total_coins_earned: GAME_CONFIG.PRESTIGE_UNLOCK_COINS - 1,
        prestige_level: 0,
        prestige_points: 0
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await prestigeService.canPrestige(1);

      expect(result.canPrestige).toBe(false);
      expect(result.requiredCoins).toBe(GAME_CONFIG.PRESTIGE_UNLOCK_COINS);
      expect(result.currentTotalCoins).toBe(GAME_CONFIG.PRESTIGE_UNLOCK_COINS - 1);
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(prestigeService.canPrestige(1)).rejects.toThrow('User not found');
    });
  });

  describe('performPrestige', () => {
    it('should successfully perform prestige when eligible', async () => {
      const mockUser = {
        id: 1,
        total_coins_earned: GAME_CONFIG.PRESTIGE_UNLOCK_COINS,
        prestige_level: 0,
        prestige_points: 0,
        coins: 50000
      };

      const mockUpdatedUser = {
        ...mockUser,
        prestige_level: 1,
        prestige_points: 1000,
        coins: 0
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.transaction.mockImplementation(async (callback) => {
        return await callback();
      });
      mockUserRepository.prestige.mockResolvedValue(mockUpdatedUser);
      mockUpgradeService.resetUpgradesForPrestige.mockResolvedValue({
        success: true,
        upgradesReset: 5
      });

      const result = await prestigeService.performPrestige(1);

      expect(result.success).toBe(true);
      expect(result.newPrestigeLevel).toBe(1);
      expect(result.prestigePointsEarned).toBeGreaterThan(0);
      expect(mockUpgradeService.resetUpgradesForPrestige).toHaveBeenCalledWith(1);
      expect(mockUserRepository.prestige).toHaveBeenCalled();
    });

    it('should throw error when user cannot prestige', async () => {
      const mockUser = {
        id: 1,
        total_coins_earned: GAME_CONFIG.PRESTIGE_UNLOCK_COINS - 1,
        prestige_level: 0,
        prestige_points: 0
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      await expect(prestigeService.performPrestige(1)).rejects.toThrow(
        `Need ${GAME_CONFIG.PRESTIGE_UNLOCK_COINS} total coins to prestige`
      );
    });
  });

  describe('getPrestigeUpgrades', () => {
    it('should return prestige upgrades with user data', async () => {
      const mockUser = {
        id: 1,
        prestige_points: 500
      };

      const mockUpgrades = [
        {
          upgrade_type: 'prestige_multiplier',
          level: 2
        }
      ];

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUpgradeRepository.getUserUpgrades.mockResolvedValue(mockUpgrades);

      const result = await prestigeService.getPrestigeUpgrades(1);

      expect(result.userPrestigePoints).toBe(500);
      expect(result.upgrades).toBeDefined();
      expect(result.upgrades.prestige_multiplier).toBeDefined();
      expect(result.upgrades.prestige_multiplier.currentLevel).toBe(2);
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(prestigeService.getPrestigeUpgrades(1)).rejects.toThrow('User not found');
    });
  });

  describe('getPrestigeStats', () => {
    it('should return comprehensive prestige statistics', async () => {
      const mockUser = {
        id: 1,
        prestige_level: 3,
        prestige_points: 1500,
        total_coins_earned: 5000000
      };

      const mockUpgrades = [
        {
          upgrade_type: 'prestige_multiplier',
          level: 5
        }
      ];

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUpgradeRepository.getUserUpgrades.mockResolvedValue(mockUpgrades);

      const result = await prestigeService.getPrestigeStats(1);

      expect(result.prestigeLevel).toBe(3);
      expect(result.prestigePoints).toBe(1500);
      expect(result.lifetimeCoins).toBe(5000000);
      expect(result.prestigeUpgradeCount).toBe(1);
      expect(result.totalPrestigeMultiplier).toBeGreaterThan(1);
    });
  });

  describe('validatePrestige', () => {
    it('should validate successful prestige', async () => {
      const mockUser = {
        id: 1,
        total_coins_earned: GAME_CONFIG.PRESTIGE_UNLOCK_COINS,
        prestige_level: 0,
        prestige_points: 0
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await prestigeService.validatePrestige(1);

      expect(result.valid).toBe(true);
      expect(result.newPrestigePoints).toBeGreaterThan(0);
      expect(result.newPrestigeLevel).toBe(1);
    });

    it('should return invalid when insufficient coins', async () => {
      const mockUser = {
        id: 1,
        total_coins_earned: GAME_CONFIG.PRESTIGE_UNLOCK_COINS - 1,
        prestige_level: 0,
        prestige_points: 0
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await prestigeService.validatePrestige(1);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Insufficient total coins earned');
    });

    it('should return invalid when no new prestige points would be earned', async () => {
      const mockUser = {
        id: 1,
        total_coins_earned: GAME_CONFIG.PRESTIGE_UNLOCK_COINS,
        prestige_level: 1,
        prestige_points: 1000 // Already has max points for this amount
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await prestigeService.validatePrestige(1);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('No new prestige points would be earned');
    });
  });

  describe('calculatePrestigeMultiplier', () => {
    it('should calculate prestige multiplier from upgrades', async () => {
      const mockUpgrades = [
        {
          upgrade_type: 'prestige_multiplier',
          level: 3
        }
      ];

      mockUpgradeRepository.getUserUpgrades.mockResolvedValue(mockUpgrades);

      const result = await prestigeService.calculatePrestigeMultiplier(1);

      expect(result).toBeGreaterThan(1);
      expect(typeof result).toBe('number');
    });

    it('should return 1 when no prestige upgrades', async () => {
      mockUpgradeRepository.getUserUpgrades.mockResolvedValue([]);

      const result = await prestigeService.calculatePrestigeMultiplier(1);

      expect(result).toBe(1);
    });
  });
});