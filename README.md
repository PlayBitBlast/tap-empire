# Tap Empire

A highly addictive social clicker game designed as a Telegram Mini App. Players tap to earn coins, purchase upgrades, compete with friends on leaderboards, and participate in limited-time events.

## Features

- **Core Clicker Mechanics**: Tap to earn coins with immediate visual feedback
- **Golden Tap System**: 2% chance for 10x bonus rewards with special effects
- **Upgrade System**: Purchase tap multipliers and auto-clickers
- **Social Features**: Friend system with gifting and competition
- **Real-time Leaderboards**: Daily, weekly, and all-time rankings
- **Prestige System**: Reset progress for permanent bonuses
- **Daily Streaks**: Login bonuses with multipliers up to 7x
- **Achievement System**: Milestone-based rewards and progression
- **Limited-time Events**: Weekend multipliers and exclusive content
- **Offline Progress**: Auto-clickers continue earning for up to 4 hours

## Technology Stack

### Frontend
- React 18 with hooks
- CSS3 with animations
- Telegram Web App SDK
- Socket.io Client
- LocalStorage for offline persistence

### Backend
- Node.js 18+ with Express
- Socket.io for real-time features
- PostgreSQL 15 for data storage
- Redis 7 for caching and sessions
- JWT for authentication
- Docker for containerization

## Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- Git

### Development Setup

1. Clone the repository and install dependencies:
```bash
git clone <repository-url>
cd tap-empire
npm run install:all
```

2. Start the development environment:
```bash
npm run docker:up
```

3. Start the development servers:
```bash
# Terminal 1 - Start backend
npm run dev:server

# Terminal 2 - Start frontend
npm run dev:client
```

4. Open your browser and navigate to `http://localhost:3000`

### Available Scripts

- `npm run dev:client` - Start frontend development server
- `npm run dev:server` - Start backend development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run all tests
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed development data

## Project Structure

```
tap-empire/
├── client/                 # React frontend application
├── server/                 # Node.js backend application
├── shared/                 # Shared utilities and types
├── database/               # Database migrations and seeds
├── docker/                 # Docker configuration files
├── docker-compose.yml      # Development environment setup
└── package.json           # Root package.json for scripts
```

## Development

The project uses a client-server architecture with:
- **Frontend**: React app optimized for Telegram Mini Apps
- **Backend**: Express.js API with Socket.io for real-time features
- **Database**: PostgreSQL for persistent data, Redis for caching
- **Development**: Docker Compose for local environment

## Production Deployment

### Quick Production Setup

1. **Server Requirements**: Ubuntu 20.04+, 4GB+ RAM, 2+ CPU cores, 50GB+ SSD
2. **Install Docker**: `curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh`
3. **Clone and Configure**:
```bash
git clone <repository-url> /opt/tap-empire
cd /opt/tap-empire
cp .env.prod.example .env.prod
# Edit .env.prod with your production values
```

4. **Deploy**:
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh production
```

### Production Architecture

- **Load Balancer**: Nginx with SSL termination and rate limiting
- **Application**: 2 Node.js instances for high availability
- **Database**: PostgreSQL with production optimizations
- **Cache**: Redis for sessions and real-time data
- **Monitoring**: Prometheus + Grafana + Loki stack

### Monitoring & Health Checks

```bash
# Check system health
./scripts/health-check.sh

# Access monitoring
# Grafana: http://your-server:3000
# Prometheus: http://your-server:9090
```

### CI/CD Pipeline

The project includes GitHub Actions for automated deployment:
- Automated testing on pull requests
- Security scanning with Snyk
- Docker image building and pushing
- Automated deployment to production server

For detailed production setup, see [Production Deployment Guide](docs/production-deployment.md)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details