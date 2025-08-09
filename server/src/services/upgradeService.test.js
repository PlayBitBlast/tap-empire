const UpgradeService = require('./upgradeService');
const UpgradeRepository = require('../repositories/UpgradeRepository');
const UserRepository = require('../repositories/UserRepository');
const { UPGRADE_CONFIGS } = require('../../../shared/constants/gameConfig');

// Mock the repositories
jest.mock('../repositories/UpgradeRepository');
jest.mock('../repositories/UserRepository');

describe('UpgradeService', () => {
  let upgradeService;
  let mockUpgradeRepository;
  let mockUserRepository;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock instances
    mockUpgradeRepository = new UpgradeRepository();
    mockUserRepository = new UserRepository();
    
    // Create service instance
    upgradeService = new UpgradeService();
    upgradeService.upgradeRepository = mockUpgradeRepository;
    upgradeService.userRepository = mockUserRepository;
  });

  describe('getAvailableUpgrades', () => {
    it('should return available upgrades with user data', async () => {
      const userId = 1;
      const mockUser = {
        id: 1,
        coins: 1000,
        prestige_points: 5
      };
      const mockUpgrades = [
        { upgrade_type: 'tap_multiplier', level: 2 },
        { upgrade_type: 'auto_clicker', level: 1 }
      ];

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUpgradeRepository.getUserUpgrades.mockResolvedValue(mockUpgrades);

      const result = await upgradeService.getAvailableUpgrades(userId);

      expect(result).toHaveProperty('upgrades');
      expect(result).toHaveProperty('userCoins', 1000);
      expect(result).toHaveProperty('userPrestigePoints', 5);
      expect(result.upgrades).toHaveProperty('tap_multiplier');
      expect(result.upgrades.tap_multiplier.currentLevel).toBe(2);
    });

    it('should throw error if user not found', async () => {
      const userId = 999;
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(upgradeService.getAvailableUpgrades(userId))
        .rejects.toThrow('User not found');
    });
  });

  describe('purchaseUpgrade', () => {
    it('should successfully purchase an upgrade', async () => {
      const userId = 1;
      const upgradeType = 'tap_multiplier';
      const mockUser = {
        id: 1,
        coins: 1000,
        prestige_points: 0
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUpgradeRepository.getUpgradeLevel.mockResolvedValue(0);
      mockUpgradeRepository.transaction.mockImplementation(async (callback) => {
        return await callback();
      });
      mockUpgradeRepository.incrementUpgrade.mockResolvedValue({
        level: 1,
        upgrade_type: upgradeType
      });
      mockUserRepository.updateCoins = jest.fn().mockResolvedValue();
      upgradeService.updateUserDerivedStats = jest.fn().mockResolvedValue();

      const result = await upgradeService.purchaseUpgrade(userId, upgradeType);

      expect(result.success).toBe(true);
      expect(result.upgrade.newLevel).toBe(1);
      expect(result.upgrade.type).toBe(upgradeType);
    });

    it('should throw error for invalid upgrade type', async () => {
      const userId = 1;
      const upgradeType = 'invalid_upgrade';

      await expect(upgradeService.purchaseUpgrade(userId, upgradeType))
        .rejects.toThrow('Invalid upgrade type');
    });

    it('should throw error if user not found', async () => {
      const userId = 999;
      const upgradeType = 'tap_multiplier';

      mockUserRepository.findById.mockResolvedValue(null);

      await expect(upgradeService.purchaseUpgrade(userId, upgradeType))
        .rejects.toThrow('User not found');
    });

    it('should throw error if upgrade is at max level', async () => {
      const userId = 1;
      const upgradeType = 'tap_multiplier';
      const mockUser = { id: 1, coins: 1000 };
      const maxLevel = UPGRADE_CONFIGS[upgradeType].maxLevel;

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUpgradeRepository.getUpgradeLevel.mockResolvedValue(maxLevel);

      await expect(upgradeService.purchaseUpgrade(userId, upgradeType))
        .rejects.toThrow('Upgrade is already at maximum level');
    });

    it('should throw error if insufficient coins', async () => {
      const userId = 1;
      const upgradeType = 'tap_multiplier';
      const mockUser = { id: 1, coins: 5 }; // Not enough coins

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUpgradeRepository.getUpgradeLevel.mockResolvedValue(0);

      await expect(upgradeService.purchaseUpgrade(userId, upgradeType))
        .rejects.toThrow('Insufficient coins');
    });
  });

  describe('validateUpgradePurchase', () => {
    it('should validate successful purchase', async () => {
      const userId = 1;
      const upgradeType = 'tap_multiplier';
      const mockUser = { id: 1, coins: 1000 };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUpgradeRepository.getUpgradeLevel.mockResolvedValue(0);

      const result = await upgradeService.validateUpgradePurchase(userId, upgradeType);

      expect(result.valid).toBe(true);
      expect(result.cost).toBeDefined();
      expect(result.currentLevel).toBe(0);
      expect(result.nextLevel).toBe(1);
    });

    it('should return invalid for insufficient funds', async () => {
      const userId = 1;
      const upgradeType = 'tap_multiplier';
      const mockUser = { id: 1, coins: 5 };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUpgradeRepository.getUpgradeLevel.mockResolvedValue(0);

      const result = await upgradeService.validateUpgradePurchase(userId, upgradeType);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Insufficient');
    });

    it('should return invalid for max level upgrade', async () => {
      const userId = 1;
      const upgradeType = 'tap_multiplier';
      const mockUser = { id: 1, coins: 1000 };
      const maxLevel = UPGRADE_CONFIGS[upgradeType].maxLevel;

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUpgradeRepository.getUpgradeLevel.mockResolvedValue(maxLevel);

      const result = await upgradeService.validateUpgradePurchase(userId, upgradeType);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Upgrade is at maximum level');
    });
  });

  describe('getUserUpgradeStats', () => {
    it('should return user upgrade statistics', async () => {
      const userId = 1;
      const mockStats = {
        totalUpgradeTypes: 3,
        totalUpgradeLevels: 10,
        highestUpgradeLevel: 5,
        averageUpgradeLevel: 3.33
      };
      const mockUpgrades = [
        { upgrade_type: 'tap_multiplier', level: 5 },
        { upgrade_type: 'auto_clicker', level: 3 },
        { upgrade_type: 'golden_tap_chance', level: 2 }
      ];

      mockUpgradeRepository.getUserUpgradeStats.mockResolvedValue(mockStats);
      mockUpgradeRepository.getUserUpgrades.mockResolvedValue(mockUpgrades);

      const result = await upgradeService.getUserUpgradeStats(userId);

      expect(result).toHaveProperty('totalUpgradeTypes', 3);
      expect(result).toHaveProperty('totalUpgradeLevels', 10);
      expect(result).toHaveProperty('totalCoinsSpent');
      expect(result).toHaveProperty('upgradesByCategory');
    });
  });

  describe('resetUpgradesForPrestige', () => {
    it('should reset non-prestige upgrades', async () => {
      const userId = 1;
      const mockUpgrades = [
        { id: 1, upgrade_type: 'tap_multiplier', level: 5 },
        { id: 2, upgrade_type: 'auto_clicker', level: 3 },
        { id: 3, upgrade_type: 'prestige_multiplier', level: 2 }
      ];

      mockUpgradeRepository.getUserUpgrades.mockResolvedValue(mockUpgrades);
      mockUpgradeRepository.transaction.mockImplementation(async (callback) => {
        return await callback();
      });
      mockUpgradeRepository.delete.mockResolvedValue();
      upgradeService.updateUserDerivedStats = jest.fn().mockResolvedValue();

      const result = await upgradeService.resetUpgradesForPrestige(userId);

      expect(result.success).toBe(true);
      expect(result.upgradesReset).toBe(2); // tap_multiplier and auto_clicker
      expect(result.prestigeUpgradesKept).toBe(1); // prestige_multiplier
    });
  });
});