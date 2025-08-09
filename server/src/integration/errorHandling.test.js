/**
 * Integration tests for error handling
 */

const express = require('express');
const request = require('supertest');
const ServerErrorHandler = require('../middleware/errorHandler');
const errorRoutes = require('../routes/errors');

// Create a minimal test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/errors', errorRoutes);
  app.use(ServerErrorHandler.errorMiddleware);
  return app;
};

describe('Error Handling Integration', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('API Error Handling', () => {
    it('should handle validation errors properly', async () => {
      const response = await request(app)
        .post('/api/errors/log')
        .send({
          // Missing required fields
          timestamp: Date.now()
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid request data',
        code: 'VALIDATION_FAILED',
        details: 'Error type is required'
      });
    });

    it('should handle successful error logging', async () => {
      const response = await request(app)
        .post('/api/errors/log')
        .send({
          timestamp: Date.now(),
          error: {
            type: 'NETWORK_ERROR',
            code: 'CONNECTION_LOST',
            message: 'Connection lost'
          },
          context: {
            action: 'tap'
          },
          userAgent: 'test-agent',
          url: 'http://localhost:3000',
          userId: 'test-user'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Error logged successfully'
      });
    });

    it('should handle health check endpoint', async () => {
      const response = await request(app)
        .get('/api/errors/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        status: 'healthy',
        timestamp: expect.any(String)
      });
    });

    it('should handle 404 errors gracefully', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint');

      expect(response.status).toBe(404);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/errors/log')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error format', async () => {
      const response = await request(app)
        .post('/api/errors/log')
        .send({});

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
    });
  });

  describe('Error Statistics', () => {
    it('should return error statistics', async () => {
      const response = await request(app)
        .get('/api/errors/stats');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          totalErrors: expect.any(Number),
          errorsByType: expect.any(Object),
          errorsByHour: expect.any(Object),
          criticalErrors: expect.any(Number),
          lastUpdated: expect.any(String)
        }
      });
    });
  });
});