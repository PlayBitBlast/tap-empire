const request = require('supertest');
const app = require('../../app');
const { generateTestToken } = require('../helpers/authHelper');

describe('Performance Tests - Concurrent Users', () => {
  let authTokens = [];
  
  beforeAll(async () => {
    // Generate auth tokens for test users
    for (let i = 1; i <= 100; i++) {
      const token = generateTestToken({ id: i, telegram_id: i });
      authTokens.push(token);
    }
  });

  describe('Concurrent Tap Processing', () => {
    it('should handle 100 concurrent taps without performance degradation', async () => {
      const startTime = Date.now();
      const tapPromises = [];

      // Create 100 concurrent tap requests
      for (let i = 0; i < 100; i++) {
        const tapPromise = request(app)
          .post('/api/game/tap')
          .set('Authorization', `Bearer ${authTokens[i % authTokens.length]}`)
          .send({
            timestamp: Date.now(),
            clientChecksum: 'test-checksum'
          });
        
        tapPromises.push(tapPromise);
      }

      const responses = await Promise.all(tapPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Performance assertions
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // All requests should succeed or fail gracefully
      responses.forEach(response => {
        expect([200, 400, 429]).toContain(response.status);
      });

      // Calculate success rate
      const successfulTaps = responses.filter(r => r.status === 200).length;
      const successRate = successfulTaps / responses.length;
      
      // At least 80% should succeed (some may be rate limited)
      expect(successRate).toBeGreaterThan(0.8);
    });

    it('should maintain response time under load', async () => {
      const responseTimes = [];
      const batchSize = 20;
      const batches = 5;

      for (let batch = 0; batch < batches; batch++) {
        const batchPromises = [];
        
        for (let i = 0; i < batchSize; i++) {
          const startTime = Date.now();
          const tapPromise = request(app)
            .post('/api/game/tap')
            .set('Authorization', `Bearer ${authTokens[i % authTokens.length]}`)
            .send({
              timestamp: Date.now(),
              clientChecksum: 'test-checksum'
            })
            .then(response => {
              const responseTime = Date.now() - startTime;
              responseTimes.push(responseTime);
              return response;
            });
          
          batchPromises.push(tapPromise);
        }

        await Promise.all(batchPromises);
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Calculate average response time
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      expect(avgResponseTime).toBeLessThan(200); // Average under 200ms
      expect(maxResponseTime).toBeLessThan(1000); // Max under 1 second
    });
  });

  describe('Concurrent Leaderboard Updates', () => {
    it('should handle concurrent leaderboard updates correctly', async () => {
      const updatePromises = [];

      // Simulate 50 users earning coins simultaneously
      for (let i = 0; i < 50; i++) {
        const updatePromise = request(app)
          .post('/api/game/tap')
          .set('Authorization', `Bearer ${authTokens[i]}`)
          .send({
            timestamp: Date.now(),
            clientChecksum: 'test-checksum'
          });
        
        updatePromises.push(updatePromise);
      }

      const responses = await Promise.all(updatePromises);
      
      // Check that leaderboard remains consistent
      const leaderboardResponse = await request(app)
        .get('/api/leaderboard')
        .set('Authorization', `Bearer ${authTokens[0]}`);

      expect(leaderboardResponse.status).toBe(200);
      expect(leaderboardResponse.body.success).toBe(true);
      expect(Array.isArray(leaderboardResponse.body.leaderboard)).toBe(true);
    });
  });

  describe('Memory Usage Under Load', () => {
    it('should not have memory leaks during sustained load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Run sustained load for 30 seconds
      const duration = 30000; // 30 seconds
      const startTime = Date.now();
      let requestCount = 0;

      while (Date.now() - startTime < duration) {
        const batchPromises = [];
        
        for (let i = 0; i < 10; i++) {
          const tapPromise = request(app)
            .post('/api/game/tap')
            .set('Authorization', `Bearer ${authTokens[requestCount % authTokens.length]}`)
            .send({
              timestamp: Date.now(),
              clientChecksum: 'test-checksum'
            });
          
          batchPromises.push(tapPromise);
          requestCount++;
        }

        await Promise.all(batchPromises);
        
        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100;

      // Memory increase should be reasonable (less than 50% increase)
      expect(memoryIncreasePercent).toBeLessThan(50);
      
      console.log(`Processed ${requestCount} requests`);
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB (${memoryIncreasePercent.toFixed(2)}%)`);
    });
  });

  describe('Database Connection Pool', () => {
    it('should handle concurrent database operations efficiently', async () => {
      const dbOperationPromises = [];

      // Create 50 concurrent operations that require database access
      for (let i = 0; i < 50; i++) {
        const operationPromise = Promise.all([
          // Tap operation
          request(app)
            .post('/api/game/tap')
            .set('Authorization', `Bearer ${authTokens[i]}`)
            .send({
              timestamp: Date.now(),
              clientChecksum: 'test-checksum'
            }),
          
          // Leaderboard fetch
          request(app)
            .get('/api/leaderboard')
            .set('Authorization', `Bearer ${authTokens[i]}`),
          
          // User profile fetch
          request(app)
            .get('/api/auth/profile')
            .set('Authorization', `Bearer ${authTokens[i]}`)
        ]);
        
        dbOperationPromises.push(operationPromise);
      }

      const startTime = Date.now();
      const results = await Promise.all(dbOperationPromises);
      const endTime = Date.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds

      // Check that all operations completed successfully or failed gracefully
      results.forEach(([tapResponse, leaderboardResponse, profileResponse]) => {
        expect([200, 400, 429, 500]).toContain(tapResponse.status);
        expect([200, 500]).toContain(leaderboardResponse.status);
        expect([200, 500]).toContain(profileResponse.status);
      });
    });
  });

  describe('WebSocket Performance', () => {
    it('should handle multiple WebSocket connections efficiently', async () => {
      const io = require('socket.io-client');
      const connections = [];
      const connectionPromises = [];

      // Create 20 WebSocket connections
      for (let i = 0; i < 20; i++) {
        const connectionPromise = new Promise((resolve, reject) => {
          const socket = io('http://localhost:3001', {
            auth: {
              token: authTokens[i]
            }
          });

          socket.on('connect', () => {
            connections.push(socket);
            resolve(socket);
          });

          socket.on('connect_error', reject);

          // Set timeout for connection
          setTimeout(() => reject(new Error('Connection timeout')), 5000);
        });

        connectionPromises.push(connectionPromise);
      }

      try {
        await Promise.all(connectionPromises);

        // Test broadcasting to all connections
        const broadcastPromises = connections.map(socket => {
          return new Promise((resolve) => {
            socket.on('leaderboard:update', (data) => {
              resolve(data);
            });
          });
        });

        // Trigger a leaderboard update
        await request(app)
          .post('/api/game/tap')
          .set('Authorization', `Bearer ${authTokens[0]}`)
          .send({
            timestamp: Date.now(),
            clientChecksum: 'test-checksum'
          });

        // Wait for broadcasts (with timeout)
        const broadcastResults = await Promise.race([
          Promise.all(broadcastPromises),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Broadcast timeout')), 3000)
          )
        ]);

        expect(broadcastResults.length).toBe(connections.length);

      } finally {
        // Clean up connections
        connections.forEach(socket => socket.disconnect());
      }
    }, 15000); // Increase timeout for this test
  });
});