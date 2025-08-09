# Technology Stack

## Frontend
- **React 18** with hooks for state management
- **CSS3** with animations and transitions for smooth visual feedback
- **Telegram Web App SDK** for platform integration and authentication
- **Socket.io Client** for real-time features (leaderboards, friend updates)
- **LocalStorage** for offline persistence and game state caching

## Backend
- **Node.js 18+** with Express framework
- **Socket.io** for WebSocket connections and real-time communication
- **PostgreSQL 15** for persistent data storage
- **Redis 7** for caching, sessions, and leaderboard management
- **JWT** for secure authentication tokens
- **Docker** for containerization and deployment

## Development Environment
- **Docker Compose** for local development setup
- **Jest** for unit and integration testing
- **ESLint** and **Prettier** for code quality
- **Git** for version control

## Common Commands

### Development Setup
```bash
# Start development environment
docker-compose up -d

# Install dependencies
npm install

# Start frontend development server
npm run dev:client

# Start backend development server
npm run dev:server

# Run database migrations
npm run db:migrate

# Seed development data
npm run db:seed
```

### Testing
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:e2e
```

### Production
```bash
# Build for production
npm run build

# Start production server
npm start

# Run database migrations in production
npm run db:migrate:prod
```

## Architecture Patterns
- **Client-Server Architecture** with optimistic updates
- **Event-Driven Design** for real-time features
- **Repository Pattern** for data access layer
- **Service Layer** for business logic separation
- **Anti-Cheat Validation** with server-side authority