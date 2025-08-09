const {
  calculateUpgradeCost,
  calculateUpgradeEffect,
  calculateCoinsPerTap,
  calculateAutoClickerRate,
  calculateDailyBonus,
  calculatePrestigePoints,
  calculateOfflineEarnings,
  validateTapRate,
  generateGameStateChecksum
} = require('./calculations');

describe('Game Calculations', () => {
  describe('calculateUpgradeCost', () => {
    test('should calculate correct upgrade cost for tap_multiplier', () => {
      expect(calculateUpgradeCost('tap_multiplier', 0)).toBe(10);
      expect(calculateUpgradeCost('tap_multiplier', 1)).toBe(11); // 10 * 1.15^1 = 11.5, floored to 11
      expect(calculateUpgradeCost('tap_multiplier', 5)).toBe(20); // 10 * 1.15^5 ≈ 20.11
    });

    test('should return 0 for invalid upgrade type', () => {
      expect(calculateUpgradeCost('invalid_upgrade', 0)).toBe(0);
    });
  });

  describe('calculateUpgradeEffect', () => {
    test('should calculate correct upgrade effect', () => {
      expect(calculateUpgradeEffect('tap_multiplier', 0)).toBe(0);
      expect(calculateUpgradeEffect('tap_multiplier', 5)).toBe(5);
      expect(calculateUpgradeEffect('auto_clicker', 10)).toBe(10);
    });
  });

  describe('calculateCoinsPerTap', () => {
    test('should calculate base coins per tap', () => {
      const userState = {
        upgrades: {},
        prestige_level: 0,
        achievements: []
      };
      expect(calculateCoinsPerTap(userState)).toBe(1);
    });

    test('should calculate coins per tap with upgrades', () => {
      const userState = {
        upgrades: { tap_multiplier: 5 },
        prestige_level: 0,
        achievements: []
      };
      expect(calculateCoinsPerTap(userState)).toBeGreaterThan(1);
    });
  });

  describe('calculateDailyBonus', () => {
    test('should calculate correct daily bonus', () => {
      expect(calculateDailyBonus(1)).toBe(100);
      expect(calculateDailyBonus(3)).toBe(300);
      expect(calculateDailyBonus(7)).toBe(700);
      expect(calculateDailyBonus(10)).toBe(700); // Capped at 7x
    });
  });

  describe('calculatePrestigePoints', () => {
    test('should calculate correct prestige points', () => {
      expect(calculatePrestigePoints(1000000)).toBe(1000); // 1M coins = 1000 points
      expect(calculatePrestigePoints(500000)).toBe(500);
      expect(calculatePrestigePoints(0)).toBe(0);
    });
  });

  describe('calculateOfflineEarnings', () => {
    test('should calculate offline earnings correctly', () => {
      expect(calculateOfflineEarnings(10, 1)).toBe(36000); // 10 coins/sec * 1 hour * 3600 sec
      expect(calculateOfflineEarnings(5, 2)).toBe(36000); // 5 coins/sec * 2 hours * 3600 sec
      expect(calculateOfflineEarnings(10, 5)).toBe(144000); // Capped at 4 hours
    });
  });

  describe('validateTapRate', () => {
    test('should validate normal tap rates', () => {
      const now = Date.now();
      const timestamps = [now - 500, now - 300, now - 100];
      expect(validateTapRate(timestamps, 20)).toBe(true);
    });

    test('should reject excessive tap rates', () => {
      const now = Date.now();
      const timestamps = Array.from({ length: 25 }, (_, i) => now - i * 10);
      expect(validateTapRate(timestamps, 20)).toBe(false);
    });

    test('should handle empty timestamp arrays', () => {
      expect(validateTapRate([], 20)).toBe(true);
      expect(validateTapRate([Date.now()], 20)).toBe(true);
    });
  });

  describe('generateGameStateChecksum', () => {
    test('should generate consistent checksums', () => {
      const gameState = {
        coins: 1000,
        total_coins_earned: 5000,
        coins_per_tap: 2,
        auto_clicker_rate: 5
      };
      
      const checksum1 = generateGameStateChecksum(gameState);
      const checksum2 = generateGameStateChecksum(gameState);
      
      expect(checksum1).toBe(checksum2);
      expect(typeof checksum1).toBe('string');
      expect(checksum1.length).toBeGreaterThan(0);
    });

    test('should generate different checksums for different states', () => {
      const gameState1 = { coins: 1000, total_coins_earned: 5000, coins_per_tap: 2, auto_clicker_rate: 5 };
      const gameState2 = { coins: 2000, total_coins_earned: 5000, coins_per_tap: 2, auto_clicker_rate: 5 };
      
      const checksum1 = generateGameStateChecksum(gameState1);
      const checksum2 = generateGameStateChecksum(gameState2);
      
      expect(checksum1).not.toBe(checksum2);
    });
  });
});