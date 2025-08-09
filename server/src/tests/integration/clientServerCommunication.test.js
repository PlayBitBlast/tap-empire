const request = require('supertest');
const io = require('socket.io-client');
const app = require('../../app');
const { generateTestToken } = require('../helpers/authHelper');

describe('Integration Tests - Client-Server Communication', () => {
  let authToken;
  let userId = 1;

  beforeAll(() => {
    authToken = generateTestToken({ id: userId, telegram_id: userId });
  });

  describe('HTTP API Integration', () => {
    it('should complete full game flow via HTTP API', async () => {
      // 1. Authenticate user
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.success).toBe(true);

      // 2. Perform tap action
      const tapResponse = await request(app)
        .post('/api/game/tap')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          timestamp: Date.now(),
          clientChecksum: 'test-checksum'
        });

      expect(tapResponse.status).toBe(200);
      expect(tapResponse.body.success).toBe(true);
      expect(typeof tapResponse.body.earnings).toBe('number');

      // 3. Check leaderboard update
      const leaderboardResponse = await request(app)
        .get('/api/leaderboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(leaderboardResponse.status).toBe(200);
      expect(leaderboardResponse.body.success).toBe(true);

      // 4. Sync game state
      const syncResponse = await request(app)
        .post('/api/game/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientState: {
            coins: tapResponse.body.newCoins,
            total_coins_earned: tapResponse.body.earnings
          }
        });

      expect(syncResponse.status).toBe(200);
      expect(syncResponse.body.success).toBe(true);
    });

    it('should handle API error scenarios gracefully', async () => {
      // Test invalid authentication
      const invalidAuthResponse = await request(app)
        .post('/api/game/tap')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          timestamp: Date.now(),
          clientChecksum: 'test-checksum'
        });

      expect(invalidAuthResponse.status).toBe(401);

      // Test missing required fields
      const missingFieldResponse = await request(app)
        .post('/api/game/tap')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientChecksum: 'test-checksum'
          // Missing timestamp
        });

      expect(missingFieldResponse.status).toBe(400);

      // Test rate limiting
      const rapidTapPromises = [];
      for (let i = 0; i < 25; i++) {
        rapidTapPromises.push(
          request(app)
            .post('/api/game/tap')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              timestamp: Date.now() + i,
              clientChecksum: 'test-checksum'
            })
        );
      }

      const rapidTapResults = await Promise.all(rapidTapPromises);
      const rateLimitedResponses = rapidTapResults.filter(r => r.status === 429 || (r.status === 400 && r.body.error === 'Tap rate too high'));
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('WebSocket Integration', () => {
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

    it('should establish WebSocket connection and receive real-time updates', (done) => {
      let updateReceived = false;

      // Listen for leaderboard updates
      socket.on('leaderboard:update', (data) => {
        expect(data).toBeDefined();
        expect(typeof data.rank).toBe('number');
        updateReceived = true;
      });

      // Trigger an action that should cause a leaderboard update
      request(app)
        .post('/api/game/tap')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          timestamp: Date.now(),
          clientChecksum: 'test-checksum'
        })
        .then(() => {
          // Wait a bit for the WebSocket update
          setTimeout(() => {
            expect(updateReceived).toBe(true);
            done();
          }, 1000);
        })
        .catch(done);
    }, 10000);

    it('should handle WebSocket authentication errors', (done) => {
      const invalidSocket = io('http://localhost:3001', {
        auth: {
          token: 'invalid-token'
        }
      });

      invalidSocket.on('connect_error', (error) => {
        expect(error).toBeDefined();
        invalidSocket.disconnect();
        done();
      });

      // If connection succeeds when it shouldn't, fail the test
      invalidSocket.on('connect', () => {
        invalidSocket.disconnect();
        done(new Error('Should not connect with invalid token'));
      });
    });

    it('should sync game state via WebSocket', (done) => {
      const testState = {
        coins: 1000,
        total_coins_earned: 5000,
        checksum: 'test-checksum'
      };

      socket.on('game:sync_response', (response) => {
        expect(response.success).toBe(true);
        expect(response.serverState).toBeDefined();
        done();
      });

      socket.emit('game:sync', {
        clientState: testState,
        timestamp: Date.now()
      });
    });

    it('should handle WebSocket disconnection and reconnection', (done) => {
      let disconnected = false;
      let reconnected = false;

      socket.on('disconnect', () => {
        disconnected = true;
      });

      socket.on('connect', () => {
        if (disconnected) {
          reconnected = true;
          expect(reconnected).toBe(true);
          done();
        }
      });

      // Force disconnect and reconnect
      setTimeout(() => {
        socket.disconnect();
        setTimeout(() => {
          socket.connect();
        }, 100);
      }, 100);
    }, 5000);
  });

  describe('Hybrid HTTP + WebSocket Workflows', () => {
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

    it('should coordinate HTTP actions with WebSocket notifications', (done) => {
      let achievementNotificationReceived = false;
      let leaderboardUpdateReceived = false;

      // Listen for WebSocket notifications
      socket.on('achievement:unlocked', (data) => {
        achievementNotificationReceived = true;
        expect(data.achievement).toBeDefined();
      });

      socket.on('leaderboard:update', (data) => {
        leaderboardUpdateReceived = true;
        expect(data.rank).toBeDefined();
      });

      // Perform multiple HTTP actions to potentially trigger achievements
      const performMultipleTaps = async () => {
        for (let i = 0; i < 10; i++) {
          await request(app)
            .post('/api/game/tap')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              timestamp: Date.now() + i,
              clientChecksum: 'test-checksum'
            });
          
          // Small delay between taps
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      };

      performMultipleTaps()
        .then(() => {
          // Wait for WebSocket notifications
          setTimeout(() => {
            expect(leaderboardUpdateReceived).toBe(true);
            // Achievement notification is optional depending on game state
            done();
          }, 2000);
        })
        .catch(done);
    }, 15000);

    it('should maintain state consistency between HTTP and WebSocket', (done) => {
      let httpCoins = 0;
      let websocketCoins = 0;

      // Get initial state via HTTP
      request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .then(response => {
          httpCoins = response.body.user.coins;

          // Listen for WebSocket state updates
          socket.on('game:state_update', (data) => {
            websocketCoins = data.coins;
            
            // Coins should match between HTTP and WebSocket
            expect(Math.abs(websocketCoins - httpCoins)).toBeLessThan(100); // Allow small discrepancy
            done();
          });

          // Perform action that triggers state update
          return request(app)
            .post('/api/game/tap')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              timestamp: Date.now(),
              clientChecksum: 'test-checksum'
            });
        })
        .then(tapResponse => {
          httpCoins = tapResponse.body.newCoins;
        })
        .catch(done);
    }, 10000);
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from temporary network issues', async () => {
      // Simulate network timeout by using very old timestamp
      const timeoutResponse = await request(app)
        .post('/api/game/tap')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          timestamp: Date.now() - 60000, // 1 minute ago
          clientChecksum: 'test-checksum'
        });

      expect(timeoutResponse.status).toBe(400);
      expect(timeoutResponse.body.success).toBe(false);

      // Follow up with valid request to ensure recovery
      const recoveryResponse = await request(app)
        .post('/api/game/tap')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          timestamp: Date.now(),
          clientChecksum: 'test-checksum'
        });

      expect(recoveryResponse.status).toBe(200);
      expect(recoveryResponse.body.success).toBe(true);
    });

    it('should handle concurrent HTTP and WebSocket operations', (done) => {
      const socket = io('http://localhost:3001', {
        auth: {
          token: authToken
        }
      });

      socket.on('connect', () => {
        const httpPromise = request(app)
          .post('/api/game/tap')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            timestamp: Date.now(),
            clientChecksum: 'test-checksum'
          });

        const websocketPromise = new Promise((resolve) => {
          socket.emit('game:sync', {
            clientState: { coins: 1000 },
            timestamp: Date.now()
          });

          socket.on('game:sync_response', resolve);
        });

        Promise.all([httpPromise, websocketPromise])
          .then(([httpResponse, websocketResponse]) => {
            expect(httpResponse.status).toBe(200);
            expect(websocketResponse.success).toBe(true);
            socket.disconnect();
            done();
          })
          .catch(done);
      });
    }, 10000);
  });
});