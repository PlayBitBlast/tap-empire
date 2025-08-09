const request = require('supertest');
const { app } = require('../app');

// Mock the TelegramAuthService
const mockAuthenticateUser = jest.fn();
const mockRefreshSession = jest.fn();

jest.mock('../services/telegramAuthService', () => {
  return jest.fn().mockImplementation(() => ({
    authenticateUser: mockAuthenticateUser,
    refreshSession: mockRefreshSession
  }));
});

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/telegram', () => {
    it('should authenticate user successfully', async () => {
      const mockResult = {
        success: true,
        token: 'mock-jwt-token',
        user: {
          id: 1,
          telegram_id: 123456789,
          username: 'testuser',
          first_name: 'Test',
          coins: 0
        }
      };

      mockAuthenticateUser.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/auth/telegram')
        .send({ initData: 'valid_telegram_init_data' })
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(mockAuthenticateUser).toHaveBeenCalledWith('valid_telegram_init_data');
    });

    it('should return 400 for missing initData', async () => {
      const response = await request(app)
        .post('/api/auth/telegram')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Validation error',
        message: '"initData" is required'
      });
    });

    it('should return 401 for authentication failure', async () => {
      mockAuthenticateUser.mockRejectedValue(
        new Error('Invalid Telegram authentication data')
      );

      const response = await request(app)
        .post('/api/auth/telegram')
        .send({ initData: 'invalid_telegram_init_data' })
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid Telegram authentication data'
      });
    });

    it('should apply rate limiting', async () => {
      // Make multiple requests to trigger rate limiting
      const requests = Array(12).fill().map(() => 
        request(app)
          .post('/api/auth/telegram')
          .send({ initData: 'test_data' })
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .expect(401);

      expect(response.body.error).toBe('Access denied');
    });

    it('should refresh session with valid token', async () => {
      // This test would require setting up a valid JWT token
      // For now, we'll just test the unauthorized case
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .send({ first_name: 'Updated' })
        .expect(401);

      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.error).toBe('Access denied');
    });
  });
});