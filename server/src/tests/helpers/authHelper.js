const jwt = require('jsonwebtoken');

/**
 * Generate a test JWT token for authentication
 * @param {Object} payload - Token payload
 * @param {number} payload.id - User ID
 * @param {number} payload.telegram_id - Telegram user ID
 * @param {boolean} payload.is_admin - Whether user is admin
 * @returns {string} JWT token
 */
function generateTestToken(payload = {}) {
  const defaultPayload = {
    id: 1,
    telegram_id: 1,
    is_admin: false,
    ...payload
  };

  return jwt.sign(
    defaultPayload,
    process.env.JWT_SECRET || 'test-jwt-secret',
    { expiresIn: '1h' }
  );
}

/**
 * Generate multiple test tokens for different users
 * @param {number} count - Number of tokens to generate
 * @returns {Array<string>} Array of JWT tokens
 */
function generateMultipleTestTokens(count) {
  const tokens = [];
  for (let i = 1; i <= count; i++) {
    tokens.push(generateTestToken({
      id: i,
      telegram_id: i
    }));
  }
  return tokens;
}

/**
 * Generate admin test token
 * @param {Object} payload - Additional payload data
 * @returns {string} Admin JWT token
 */
function generateAdminTestToken(payload = {}) {
  return generateTestToken({
    ...payload,
    is_admin: true
  });
}

/**
 * Decode test token for verification
 * @param {string} token - JWT token to decode
 * @returns {Object} Decoded token payload
 */
function decodeTestToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET || 'test-jwt-secret');
}

module.exports = {
  generateTestToken,
  generateMultipleTestTokens,
  generateAdminTestToken,
  decodeTestToken
};