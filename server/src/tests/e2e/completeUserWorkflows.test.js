const request = require('supertest');
const io = require('socket.io-client');
const app = require('../../app');
const { generateTestToken } = require('../helpers/authHelper');

describe('End-to-End Tests - Complete User Workflows', () => {
  let authToken;
  let userId = 1;

  beforeAll(() => {
    authToken = generateTestToken({ id: userId, telegram_id: userId });
  });

  describe('New User Onboarding Flow', () => {
    it('should complete full new user experience', async () => {
      const newUserId = Math.floor(Math.random() * 10000) + 1000;
      const newUserToken = generateTestToken({ 
        id: newUserId, 
        telegram_id: newUserId 
      });

      // 1. User authentication and profile creation
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${newUserToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.user.id).toBe(newUserId);

      // 2. First tap action
      const firstTapResponse = await request(app)
        .post('/api/game/tap')
        .set('Authorization', `Bearer ${newUserToken}`)
        .send({
          timestamp: Date.now(),
          clientChecksum: 'test-checksum'
        });

      expect(firstTapResponse.status).toBe(200);
      expect(firstTapResponse.body.success).toBe(true);
      expect(firstTapResponse.body.earnings).toBeGreaterThan(0);

      // 3. Check initial leaderboard position
      const leaderboardResponse = await request(app)
        .get('/api/leaderboard')
        .set('Authorization', `Bearer ${newUserToken}`);

      expect(leaderboardResponse.status).toBe(200);
      expect(leaderboardResponse.body.success).toBe(true);

      // 4. Check for initial achievements
      const achievementsResponse = await request(app)
        .get('/api/achievements')
        .set('Authorization', `Bearer ${newUserToken}`);

      expect(achievementsResponse.status).toBe(200);
      expect(achievementsResponse.body.success).toBe(true);

      // 5. Daily bonus check (should be available for new user)
      const dailyBonusResponse = await request(app)
        .get('/api/daily-bonus/status')
        .set('Authorization', `Bearer ${newUserToken}`);

      expect(dailyBonusResponse.status).toBe(200);
      expect(dailyBonusResponse.body.success).toBe(true);
    });
  });

  describe('Daily Active User Flow', () => {
    it('should complete typical daily user session', async () => {
      // 1. Login and check daily bonus
      const dailyBonusStatusResponse = await request(app)
        .get('/api/daily-bonus/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(dailyBonusStatusResponse.status).toBe(200);

      // 2. Claim daily bonus if available
      if (dailyBonusStatusResponse.body.canClaim) {
        const claimResponse = await request(app)
          .post('/api/daily-bonus/claim')
          .set('Authorization', `Bearer ${authToken}`);

        expect(claimResponse.status).toBe(200);
        expect(claimResponse.body.success).toBe(true);
      }

      // 3. Check offline progress
      const offlineProgressResponse = await request(app)
        .get('/api/offline-progress')
        .set('Authorization', `Bearer ${authToken}`);

      expect(offlineProgressResponse.status).toBe(200);

      // 4. Collect offline earnings if available
      if (offlineProgressResponse.body.hasOfflineEarnings) {
        const collectResponse = await request(app)
          .post('/api/offline-progress/collect')
          .set('Authorization', `Bearer ${authToken}`);

        expect(collectResponse.status).toBe(200);
        expect(collectResponse.body.success).toBe(true);
      }

      // 5. Perform multiple taps (simulate active play)
      let totalEarnings = 0;
      for (let i = 0; i < 10; i++) {
        const tapResponse = await request(app)
          .post('/api/game/tap')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            timestamp: Date.now() + i * 1000,
            clientChecksum: 'test-checksum'
          });

        if (tapResponse.status === 200) {
          totalEarnings += tapResponse.body.earnings;
        }

        // Realistic delay between taps
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      expect(totalEarnings).toBeGreaterThan(0);

      // 6. Check for upgrade opportunities
      const upgradesResponse = await request(app)
        .get('/api/upgrades')
        .set('Authorization', `Bearer ${authToken}`);

      expect(upgradesResponse.status).toBe(200);
      expect(upgradesResponse.body.success).toBe(true);

      // 7. Purchase upgrade if affordable
      const affordableUpgrade = upgradesResponse.body.upgrades.find(
        upgrade => upgrade.canAfford
      );

      if (affordableUpgrade) {
        const purchaseResponse = await request(app)
          .post('/api/upgrades/purchase')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            upgradeType: affordableUpgrade.type
          });

        expect([200, 400]).toContain(purchaseResponse.status);
      }

      // 8. Check leaderboard position
      const finalLeaderboardResponse = await request(app)
        .get('/api/leaderboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(finalLeaderboardResponse.status).toBe(200);
      expect(finalLeaderboardResponse.body.success).toBe(true);
    });
  });

  describe('Social Interaction Flow', () => {
    it('should complete social features workflow', async () => {
      const friend1Token = generateTestToken({ id: 101, telegram_id: 101 });
      const friend2Token = generateTestToken({ id: 102, telegram_id: 102 });

      // 1. Get friends list
      const friendsResponse = await request(app)
        .get('/api/social/friends')
        .set('Authorization', `Bearer ${authToken}`);

      expect(friendsResponse.status).toBe(200);
      expect(friendsResponse.body.success).toBe(true);

      // 2. Send gifts to friends (if any available)
      const availableFriends = friendsResponse.body.friends.filter(
        friend => friend.canReceiveGift
      );

      if (availableFriends.length > 0) {
        const giftResponse = await request(app)
          .post('/api/social/send-gift')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            friendId: availableFriends[0].id,
            amount: 10
          });

        expect([200, 400]).toContain(giftResponse.status);
      }

      // 3. Check for received gifts
      const giftsResponse = await request(app)
        .get('/api/social/gifts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(giftsResponse.status).toBe(200);
      expect(giftsResponse.body.success).toBe(true);

      // 4. Collect received gifts
      if (giftsResponse.body.gifts.length > 0) {
        const collectGiftResponse = await request(app)
          .post('/api/social/collect-gift')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            giftId: giftsResponse.body.gifts[0].id
          });

        expect([200, 400]).toContain(collectGiftResponse.status);
      }

      // 5. Compare progress with friends
      const socialStatsResponse = await request(app)
        .get('/api/social/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(socialStatsResponse.status).toBe(200);
      expect(socialStatsResponse.body.success).toBe(true);
    });
  });

  describe('Progression and Achievement Flow', () => {
    it('should complete progression milestone workflow', async () => {
      // 1. Check current achievements
      const initialAchievementsResponse = await request(app)
        .get('/api/achievements')
        .set('Authorization', `Bearer ${authToken}`);

      expect(initialAchievementsResponse.status).toBe(200);
      const initialUnlocked = initialAchievementsResponse.body.achievements.filter(
        a => a.unlocked
      ).length;

      // 2. Perform actions to potentially unlock achievements
      // Multiple taps for tap-related achievements
      for (let i = 0; i < 20; i++) {
        await request(app)
          .post('/api/game/tap')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            timestamp: Date.now() + i * 1000,
            clientChecksum: 'test-checksum'
          });

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 3. Check for new achievements
      const updatedAchievementsResponse = await request(app)
        .get('/api/achievements')
        .set('Authorization', `Bearer ${authToken}`);

      expect(updatedAchievementsResponse.status).toBe(200);
      const newUnlocked = updatedAchievementsResponse.body.achievements.filter(
        a => a.unlocked
      ).length;

      // May have unlocked new achievements
      expect(newUnlocked).toBeGreaterThanOrEqual(initialUnlocked);

      // 4. Check prestige eligibility
      const prestigeStatusResponse = await request(app)
        .get('/api/prestige/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(prestigeStatusResponse.status).toBe(200);
      expect(prestigeStatusResponse.body.success).toBe(true);

      // 5. If eligible, check prestige options (don't actually prestige in test)
      if (prestigeStatusResponse.body.canPrestige) {
        const prestigeInfoResponse = await request(app)
          .get('/api/prestige/info')
          .set('Authorization', `Bearer ${authToken}`);

        expect(prestigeInfoResponse.status).toBe(200);
        expect(prestigeInfoResponse.body.success).toBe(true);
        expect(prestigeInfoResponse.body.prestigePoints).toBeGreaterThan(0);
      }
    });
  });

  describe('Event Participation Flow', () => {
    it('should complete event participation workflow', async () => {
      // 1. Check for active events
      const eventsResponse = await request(app)
        .get('/api/events/active')
        .set('Authorization', `Bearer ${authToken}`);

      expect(eventsResponse.status).toBe(200);
      expect(eventsResponse.body.success).toBe(true);

      const activeEvents = eventsResponse.body.events;

      if (activeEvents.length > 0) {
        // 2. Participate in event (perform actions during event)
        const event = activeEvents[0];
        
        // Perform taps during event to benefit from multipliers
        for (let i = 0; i < 5; i++) {
          const tapResponse = await request(app)
            .post('/api/game/tap')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              timestamp: Date.now() + i * 1000,
              clientChecksum: 'test-checksum'
            });

          if (tapResponse.status === 200 && event.type === 'multiplier') {
            // During multiplier events, earnings should be higher
            expect(tapResponse.body.earnings).toBeGreaterThan(0);
          }

          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // 3. Check event-specific upgrades if available
        if (event.hasExclusiveUpgrades) {
          const eventUpgradesResponse = await request(app)
            .get(`/api/events/${event.id}/upgrades`)
            .set('Authorization', `Bearer ${authToken}`);

          expect(eventUpgradesResponse.status).toBe(200);
        }

        // 4. Check event leaderboard if applicable
        if (event.hasLeaderboard) {
          const eventLeaderboardResponse = await request(app)
            .get(`/api/events/${event.id}/leaderboard`)
            .set('Authorization', `Bearer ${authToken}`);

          expect(eventLeaderboardResponse.status).toBe(200);
        }
      }
    });
  });

  describe('Real-time Features Flow', () => {
    let socket;

    beforeEach((done) => {
      socket = io('http://localhost:3001', {
        auth: {
          token: authToken
        }
      });

      socket.on('connect', done);
    });

    afterEach(() => {
      if (socket) {
        socket.disconnect();
      }
    });

    it('should complete real-time interaction workflow', (done) => {
      let leaderboardUpdateReceived = false;
      let achievementNotificationReceived = false;

      // 1. Listen for real-time updates
      socket.on('leaderboard:update', (data) => {
        leaderboardUpdateReceived = true;
        expect(data.rank).toBeDefined();
      });

      socket.on('achievement:unlocked', (data) => {
        achievementNotificationReceived = true;
        expect(data.achievement).toBeDefined();
      });

      socket.on('friend:gift_received', (data) => {
        expect(data.sender).toBeDefined();
        expect(data.amount).toBeGreaterThan(0);
      });

      // 2. Perform actions that trigger real-time updates
      const performActions = async () => {
        // Multiple taps to trigger leaderboard updates
        for (let i = 0; i < 5; i++) {
          await request(app)
            .post('/api/game/tap')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              timestamp: Date.now() + i * 1000,
              clientChecksum: 'test-checksum'
            });

          await new Promise(resolve => setTimeout(resolve, 300));
        }
      };

      performActions()
        .then(() => {
          // 3. Wait for real-time notifications
          setTimeout(() => {
            expect(leaderboardUpdateReceived).toBe(true);
            // Achievement notification is optional
            done();
          }, 2000);
        })
        .catch(done);
    }, 15000);

    it('should handle real-time sync workflow', (done) => {
      // 1. Sync game state via WebSocket
      const testState = {
        coins: 1000,
        total_coins_earned: 5000,
        checksum: 'test-checksum'
      };

      socket.on('game:sync_response', (response) => {
        expect(response.success).toBe(true);
        expect(response.serverState).toBeDefined();

        // 2. Apply server corrections if needed
        if (response.corrected) {
          expect(response.discrepancies).toBeDefined();
          expect(Array.isArray(response.discrepancies)).toBe(true);
        }

        done();
      });

      socket.emit('game:sync', {
        clientState: testState,
        timestamp: Date.now()
      });
    });
  });

  describe('Error Recovery Flow', () => {
    it('should recover gracefully from various error scenarios', async () => {
      // 1. Network timeout simulation (old timestamp)
      const timeoutResponse = await request(app)
        .post('/api/game/tap')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          timestamp: Date.now() - 120000, // 2 minutes ago
          clientChecksum: 'test-checksum'
        });

      expect(timeoutResponse.status).toBe(400);
      expect(timeoutResponse.body.success).toBe(false);

      // 2. Recovery with valid request
      const recoveryResponse = await request(app)
        .post('/api/game/tap')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          timestamp: Date.now(),
          clientChecksum: 'test-checksum'
        });

      expect([200, 400]).toContain(recoveryResponse.status);

      // 3. State desync recovery
      const desyncState = {
        coins: 999999, // Impossible amount
        total_coins_earned: 1000
      };

      const syncResponse = await request(app)
        .post('/api/game/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientState: desyncState
        });

      expect(syncResponse.status).toBe(200);
      expect(syncResponse.body.success).toBe(true);
      
      if (syncResponse.body.corrected) {
        expect(syncResponse.body.serverState.coins).toBeLessThan(desyncState.coins);
      }

      // 4. Continue normal gameplay after recovery
      const normalTapResponse = await request(app)
        .post('/api/game/tap')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          timestamp: Date.now(),
          clientChecksum: 'test-checksum'
        });

      expect([200, 400]).toContain(normalTapResponse.status);
    });
  });

  describe('Complete Session Flow', () => {
    it('should complete full user session from start to finish', async () => {
      const sessionUserId = Math.floor(Math.random() * 10000) + 2000;
      const sessionToken = generateTestToken({ 
        id: sessionUserId, 
        telegram_id: sessionUserId 
      });

      // 1. Session start - authentication
      const authResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(authResponse.status).toBe(200);
      const initialCoins = authResponse.body.user.coins;

      // 2. Check and claim daily bonus
      const dailyBonusResponse = await request(app)
        .get('/api/daily-bonus/status')
        .set('Authorization', `Bearer ${sessionToken}`);

      if (dailyBonusResponse.body.canClaim) {
        await request(app)
          .post('/api/daily-bonus/claim')
          .set('Authorization', `Bearer ${sessionToken}`);
      }

      // 3. Active gameplay session
      let sessionEarnings = 0;
      for (let i = 0; i < 15; i++) {
        const tapResponse = await request(app)
          .post('/api/game/tap')
          .set('Authorization', `Bearer ${sessionToken}`)
          .send({
            timestamp: Date.now() + i * 1000,
            clientChecksum: 'test-checksum'
          });

        if (tapResponse.status === 200) {
          sessionEarnings += tapResponse.body.earnings;
        }

        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // 4. Check for upgrades and purchase if possible
      const upgradesResponse = await request(app)
        .get('/api/upgrades')
        .set('Authorization', `Bearer ${sessionToken}`);

      if (upgradesResponse.status === 200) {
        const affordableUpgrade = upgradesResponse.body.upgrades.find(
          upgrade => upgrade.canAfford
        );

        if (affordableUpgrade) {
          await request(app)
            .post('/api/upgrades/purchase')
            .set('Authorization', `Bearer ${sessionToken}`)
            .send({
              upgradeType: affordableUpgrade.type
            });
        }
      }

      // 5. Social interactions
      const friendsResponse = await request(app)
        .get('/api/social/friends')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(friendsResponse.status).toBe(200);

      // 6. Check achievements
      const achievementsResponse = await request(app)
        .get('/api/achievements')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(achievementsResponse.status).toBe(200);

      // 7. Final state sync
      const finalProfileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(finalProfileResponse.status).toBe(200);
      const finalCoins = finalProfileResponse.body.user.coins;

      // Verify session progress
      expect(finalCoins).toBeGreaterThanOrEqual(initialCoins);
      expect(sessionEarnings).toBeGreaterThan(0);

      console.log(`Session completed: ${sessionEarnings} coins earned`);
    });
  });
});