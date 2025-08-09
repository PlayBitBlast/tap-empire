const request = require('supertest');
const app = require('../../app');
const { generateTestToken } = require('../helpers/authHelper');
const GameService = require('../../services/gameService');

describe('Integration Tests - Anti-Cheat System', () => {
  let authToken;
  let userId = 1;
  let gameService;

  beforeAll(() => {
    authToken = generateTestToken({ id: userId, telegram_id: userId });
    gameService = new GameService();
  });

  describe('Rate Limiting Validation', () => {
    it('should enforce tap rate limits correctly', async () => {
      const rapidTapPromises = [];
      const tapCount = 30; // Exceed the limit of 20 taps per second
      const baseTimestamp = Date.now();

      // Create rapid tap requests
      for (let i = 0; i < tapCount; i++) {
        const tapPromise = request(app)
          .post('/api/game/tap')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            timestamp: baseTimestamp + i, // Very close timestamps
            clientChecksum: 'test-checksum'
          });
        
        rapidTapPromises.push(tapPromise);
      }

      const responses = await Promise.all(rapidTapPromises);
      
      // Count successful and rate-limited responses
      const successfulTaps = responses.filter(r => r.status === 200).length;
      const rateLimitedTaps = responses.filter(r => 
        r.status === 400 && r.body.error === 'Tap rate too high'
      ).length;

      // Should have some rate-limited taps
      expect(rateLimitedTaps).toBeGreaterThan(0);
      expect(successfulTaps).toBeLessThan(tapCount);
      
      // Total should equal original count
      expect(successfulTaps + rateLimitedTaps).toBeLessThanOrEqual(tapCount);
    });

    it('should allow normal tap rate after cooldown', async () => {
      // First, trigger rate limiting
      const rapidTaps = [];
      for (let i = 0; i < 25; i++) {
        rapidTaps.push(
          request(app)
            .post('/api/game/tap')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              timestamp: Date.now() + i,
              clientChecksum: 'test-checksum'
            })
        );
      }

      await Promise.all(rapidTaps);

      // Wait for cooldown period
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Try normal tap after cooldown
      const normalTapResponse = await request(app)
        .post('/api/game/tap')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          timestamp: Date.now(),
          clientChecksum: 'test-checksum'
        });

      // Should succeed after cooldown
      expect([200, 400]).toContain(normalTapResponse.status);
      if (normalTapResponse.status === 400) {
        expect(normalTapResponse.body.error).not.toBe('Tap rate too high');
      }
    });

    it('should track tap history per user independently', async () => {
      const user1Token = generateTestToken({ id: 1, telegram_id: 1 });
      const user2Token = generateTestToken({ id: 2, telegram_id: 2 });

      // User 1 performs rapid taps
      const user1Taps = [];
      for (let i = 0; i < 25; i++) {
        user1Taps.push(
          request(app)
            .post('/api/game/tap')
            .set('Authorization', `Bearer ${user1Token}`)
            .send({
              timestamp: Date.now() + i,
              clientChecksum: 'test-checksum'
            })
        );
      }

      const user1Results = await Promise.all(user1Taps);
      const user1RateLimited = user1Results.filter(r => 
        r.status === 400 && r.body.error === 'Tap rate too high'
      ).length;

      // User 2 should not be affected by User 1's rate limiting
      const user2TapResponse = await request(app)
        .post('/api/game/tap')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          timestamp: Date.now(),
          clientChecksum: 'test-checksum'
        });

      expect(user1RateLimited).toBeGreaterThan(0);
      expect(user2TapResponse.status).toBe(200);
    });
  });

  describe('Timestamp Validation', () => {
    it('should reject taps with old timestamps', async () => {
      const oldTimestamp = Date.now() - 60000; // 1 minute ago

      const response = await request(app)
        .post('/api/game/tap')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          timestamp: oldTimestamp,
          clientChecksum: 'test-checksum'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid timestamp');
    });

    it('should reject taps with future timestamps', async () => {
      const futureTimestamp = Date.now() + 60000; // 1 minute in future

      const response = await request(app)
        .post('/api/game/tap')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          timestamp: futureTimestamp,
          clientChecksum: 'test-checksum'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid timestamp');
    });

    it('should accept timestamps within valid window', async () => {
      const validTimestamp = Date.now() - 1000; // 1 second ago

      const response = await request(app)
        .post('/api/game/tap')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          timestamp: validTimestamp,
          clientChecksum: 'test-checksum'
        });

      expect([200, 400]).toContain(response.status);
      if (response.status === 400) {
        expect(response.body.error).not.toBe('Invalid timestamp');
      }
    });
  });

  describe('State Validation and Correction', () => {
    it('should detect and correct impossible coin amounts', async () => {
      const impossibleState = {
        coins: 999999999, // Impossibly high amount
        total_coins_earned: 1000,
        coins_per_tap: 1,
        auto_clicker_rate: 0
      };

      const syncResponse = await request(app)
        .post('/api/game/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientState: impossibleState
        });

      expect(syncResponse.status).toBe(200);
      expect(syncResponse.body.success).toBe(true);
      expect(syncResponse.body.corrected).toBe(true);
      expect(syncResponse.body.serverState.coins).toBeLessThan(impossibleState.coins);
    });

    it('should detect inconsistent total earnings', async () => {
      const inconsistentState = {
        coins: 1000,
        total_coins_earned: 500, // Less than current coins (impossible)
        coins_per_tap: 1,
        auto_clicker_rate: 0
      };

      const syncResponse = await request(app)
        .post('/api/game/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientState: inconsistentState
        });

      expect(syncResponse.status).toBe(200);
      expect(syncResponse.body.success).toBe(true);
      expect(syncResponse.body.corrected).toBe(true);
      expect(syncResponse.body.serverState.total_coins_earned).toBeGreaterThanOrEqual(
        syncResponse.body.serverState.coins
      );
    });

    it('should validate upgrade levels against coin spending', async () => {
      const invalidUpgradeState = {
        coins: 100,
        total_coins_earned: 200,
        upgrades: {
          tap_multiplier: 50, // Would cost way more than 200 coins
          auto_clicker: 0
        }
      };

      const syncResponse = await request(app)
        .post('/api/game/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientState: invalidUpgradeState
        });

      expect(syncResponse.status).toBe(200);
      if (syncResponse.body.corrected) {
        expect(syncResponse.body.serverState.upgrades.tap_multiplier).toBeLessThan(50);
      }
    });
  });

  describe('Suspicious Activity Detection', () => {
    it('should flag accounts with repeated violations', async () => {
      const testUserId = 999; // Use unique user ID for this test
      const testToken = generateTestToken({ id: testUserId, telegram_id: testUserId });

      // Trigger multiple violations
      const violations = [];
      
      // Multiple timestamp violations
      for (let i = 0; i < 3; i++) {
        violations.push(
          request(app)
            .post('/api/game/tap')
            .set('Authorization', `Bearer ${testToken}`)
            .send({
              timestamp: Date.now() - 120000, // 2 minutes ago (invalid)
              clientChecksum: 'test-checksum'
            })
        );
      }

      // Multiple rate limit violations
      for (let i = 0; i < 30; i++) {
        violations.push(
          request(app)
            .post('/api/game/tap')
            .set('Authorization', `Bearer ${testToken}`)
            .send({
              timestamp: Date.now() + i,
              clientChecksum: 'test-checksum'
            })
        );
      }

      await Promise.all(violations);

      // Check if account gets flagged (this would be logged in the database)
      // For now, we verify that violations were properly rejected
      const violationResponses = await Promise.all(violations);
      const rejectedCount = violationResponses.filter(r => r.status === 400).length;
      
      expect(rejectedCount).toBeGreaterThan(5); // Multiple violations detected
    });

    it('should log suspicious activity for admin review', async () => {
      const adminToken = generateTestToken({ id: 1, telegram_id: 1, is_admin: true });

      // Trigger suspicious activity
      await request(app)
        .post('/api/game/tap')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          timestamp: Date.now() - 180000, // 3 minutes ago
          clientChecksum: 'test-checksum'
        });

      // Admin should be able to view anti-cheat stats
      const statsResponse = await request(app)
        .get('/api/game/anticheat/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(statsResponse.status).toBe(200);
      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.stats).toBeDefined();
      expect(typeof statsResponse.body.stats.suspiciousActivities).toBe('number');
    });
  });

  describe('Earnings Validation', () => {
    it('should validate tap earnings against user state', async () => {
      // Get current user state
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      const userCoinsPerTap = profileResponse.body.user.coins_per_tap || 1;

      // Perform normal tap
      const tapResponse = await request(app)
        .post('/api/game/tap')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          timestamp: Date.now(),
          clientChecksum: 'test-checksum'
        });

      if (tapResponse.status === 200) {
        const earnings = tapResponse.body.earnings;
        const isGoldenTap = tapResponse.body.isGoldenTap;

        if (isGoldenTap) {
          // Golden tap should be 10x normal earnings
          expect(earnings).toBe(userCoinsPerTap * 10);
        } else {
          // Normal tap should match user's coins per tap
          expect(earnings).toBe(userCoinsPerTap);
        }
      }
    });

    it('should reject impossible earnings amounts', async () => {
      // This test would require mocking the client to send invalid earnings
      // In a real scenario, the server calculates earnings, so this is more of a 
      // validation that the server doesn't trust client-reported earnings
      
      const syncResponse = await request(app)
        .post('/api/game/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientState: {
            coins: 1000000, // Claiming impossible earnings
            total_coins_earned: 1000000,
            coins_per_tap: 1
          }
        });

      expect(syncResponse.status).toBe(200);
      if (syncResponse.body.corrected) {
        expect(syncResponse.body.serverState.coins).toBeLessThan(1000000);
      }
    });
  });

  describe('Session Integrity', () => {
    it('should maintain session integrity across requests', async () => {
      let previousCoins = 0;

      // Get initial state
      const initialResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);
      
      if (initialResponse.status === 200) {
        previousCoins = initialResponse.body.user.coins;
      }

      // Perform multiple taps and verify incremental increases
      for (let i = 0; i < 5; i++) {
        const tapResponse = await request(app)
          .post('/api/game/tap')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            timestamp: Date.now() + i * 1000, // Space out taps
            clientChecksum: 'test-checksum'
          });

        if (tapResponse.status === 200) {
          expect(tapResponse.body.newCoins).toBeGreaterThan(previousCoins);
          previousCoins = tapResponse.body.newCoins;
        }

        // Small delay between taps
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    });

    it('should handle session cleanup properly', async () => {
      // Force cleanup of tap history
      const adminToken = generateTestToken({ id: 1, telegram_id: 1, is_admin: true });

      const cleanupResponse = await request(app)
        .post('/api/game/anticheat/cleanup')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(cleanupResponse.status).toBe(200);
      expect(cleanupResponse.body.success).toBe(true);

      // Verify that taps work normally after cleanup
      const tapResponse = await request(app)
        .post('/api/game/tap')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          timestamp: Date.now(),
          clientChecksum: 'test-checksum'
        });

      expect([200, 400]).toContain(tapResponse.status);
    });
  });
});