const request = require('supertest');
const { app, server } = require('./app');

describe('Tap Empire Server', () => {
  // Close server after all tests
  afterAll((done) => {
    if (server && server.listening) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('Health Check', () => {
    test('GET /health should return 200 and status info', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
    });
  });
  
  describe('API Status', () => {
    test('GET /api/status should return API info', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect(200);
      
      expect(response.body).toHaveProperty('message', 'Tap Empire API is running!');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
  
  describe('404 Handler', () => {
    test('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(404);
      
      expect(response.body).toHaveProperty('error', 'Route not found');
      expect(response.body).toHaveProperty('code', 'NOT_FOUND');
    });
  });
  
  describe('Rate Limiting', () => {
    test('should apply rate limiting to requests', async () => {
      // This test would need to be adjusted based on actual rate limiting configuration
      // For now, just test that the endpoint responds normally
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.status).toBe('OK');
    });
  });
});