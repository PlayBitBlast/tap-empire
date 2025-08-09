const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { redisManager } = require('./config/redis');
const ServerErrorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
require('dotenv').config();

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process, just log the error
});

const app = express();
const server = http.createServer(app);

// Socket.io setup with CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.get('/api/status', (req, res) => {
  res.json({
    message: 'Tap Empire API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Import and use routes
const authRoutes = require('./routes/auth');
const upgradeRoutes = require('./routes/upgrades');
const gameRoutes = require('./routes/game');
const dailyBonusRoutes = require('./routes/dailyBonus');
const socialRoutes = require('./routes/social');
const leaderboardRoutes = require('./routes/leaderboard');
const prestigeRoutes = require('./routes/prestige');
const achievementRoutes = require('./routes/achievements');
const offlineProgressRoutes = require('./routes/offlineProgress');
// const eventRoutes = require('./routes/events');
const errorRoutes = require('./routes/errors');

app.use('/api/auth', authRoutes);
app.use('/api/upgrades', upgradeRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/daily-bonus', dailyBonusRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/prestige', prestigeRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/offline-progress', offlineProgressRoutes);
// app.use('/api/events', eventRoutes);
app.use('/api/errors', errorRoutes);

// Import socket handlers
const GameSocketHandler = require('./sockets/gameSocketHandler');
const { LeaderboardSocketHandler } = require('./sockets/leaderboardSocketHandler');
// const EventSocketHandler = require('./sockets/eventSocketHandler');
const { LeaderboardController } = require('./controllers/leaderboardController');

// Initialize socket handlers
const gameSocketHandler = new GameSocketHandler(io);
const leaderboardSocketHandler = new LeaderboardSocketHandler(io);
// const eventSocketHandler = new EventSocketHandler(io);
const leaderboardController = new LeaderboardController(io);

// Set Socket.io instance for leaderboard routes
app.locals.leaderboardController = leaderboardController;

// Socket.io connection handling
io.on('connection', (socket) => {
  gameSocketHandler.handleConnection(socket);
  leaderboardSocketHandler.handleConnection(socket);
  // eventSocketHandler.handleConnection(socket);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON payload',
      code: 'INVALID_JSON'
    });
  }
  
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    code: 'NOT_FOUND',
    path: req.originalUrl
  });
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Only start server if not in test environment and not being required as a module
if (process.env.NODE_ENV !== 'test' && require.main === module) {
  // Initialize connections
  async function startServer() {
    console.log('🚀 Starting Tap Empire server...');
    
    // Start server immediately for development
    server.listen(PORT, HOST, () => {
      console.log(`🚀 Tap Empire server running on http://${HOST}:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔌 Socket.io enabled for real-time features`);
      console.log(`⚠️  Running in development mode - install Docker for full functionality`);
    });
    
    // Try to connect to services in background
    setTimeout(async () => {
      try {
        const { Database } = require('./config/database');
        const db = new Database();
        await db.testConnection();
        console.log('✅ Database connected successfully');
      } catch (error) {
        console.log('⚠️  Database not available - using mock data');
      }
      
      try {
        await redisManager.connect();
        console.log('✅ Redis connected successfully');
        await redisManager.testConnection();
        console.log('� ️  Redis cache enabled for leaderboards');
      } catch (error) {
        console.log('⚠️  Redis not available - using in-memory cache');
      }
    }, 1000);
  }
  
  startServer();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    gracefulShutdown();
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    gracefulShutdown();
  });
  
  async function gracefulShutdown() {
    try {
      await redisManager.disconnect();
      console.log('Redis connection closed');
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
    
    server.close(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  }
}

// Error handling middleware (must be last)
app.use(ServerErrorHandler.errorMiddleware);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  ServerErrorHandler.handleShutdownError(reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  ServerErrorHandler.handleShutdownError(error);
});

module.exports = { app, server, io };