const jwt = require('jsonwebtoken');
const UserRepository = require('../repositories/UserRepository');

/**
 * Authentication middleware for protecting routes
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get user from database
    const userRepository = new UserRepository();
    const user = await userRepository.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Access denied',
        message: 'User not found'
      });
    }

    // Check if user is active and not banned
    if (!user.is_active || user.is_banned) {
      return res.status(403).json({
        success: false,
        error: 'Access forbidden',
        message: 'Account is inactive or banned'
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Access denied',
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Access denied',
        message: 'Token expired'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: 'Internal server error'
    });
  }
};

module.exports = authMiddleware;