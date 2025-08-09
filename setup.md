# Tap Empire Setup Guide

## Prerequisites

Before running Tap Empire, ensure you have the following installed:

1. **Node.js 18+** - Download from [nodejs.org](https://nodejs.org/)
2. **Docker & Docker Compose** - Download from [docker.com](https://www.docker.com/get-started)
3. **Git** - For version control

## Quick Setup

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client && npm install

# Install server dependencies
cd ../server && npm install
```

### 2. Start Database Services

```bash
# Start PostgreSQL and Redis using Docker
docker compose up -d

# Wait for services to be ready (about 30 seconds)
```

### 3. Run Database Migrations

```bash
# Run database migrations and seeds
npm run db:migrate
```

### 4. Start Development Servers

Open two terminal windows:

**Terminal 1 - Backend Server:**
```bash
npm run dev:server
```

**Terminal 2 - Frontend Client:**
```bash
npm run dev:client
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Database Admin**: http://localhost:8080 (Adminer)

## Environment Configuration

Copy the example environment file and configure:

```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your configuration:

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://tap_empire_user:tap_empire_password@localhost:5432/tap_empire
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

## Testing

Run tests for both client and server:

```bash
# Run all tests
npm test

# Run client tests only
npm run test:client

# Run server tests only
npm run test:server

# Run tests with coverage
npm run test:coverage
```

## Development Commands

```bash
# Start development environment
npm run docker:up

# Stop development environment
npm run docker:down

# Run database migrations
npm run db:migrate

# Seed development data
npm run db:seed

# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
tap-empire/
├── client/                 # React frontend
├── server/                 # Node.js backend
├── shared/                 # Shared utilities
├── database/               # Database schema and seeds
├── docker-compose.yml      # Development services
└── package.json           # Root scripts
```

## Troubleshooting

### Database Connection Issues

1. Ensure Docker containers are running: `docker compose ps`
2. Check database logs: `docker compose logs postgres`
3. Verify connection string in `.env` file

### Port Conflicts

If ports 3000, 3001, 5432, or 6379 are in use:

1. Stop conflicting services
2. Update port numbers in configuration files
3. Restart the application

### Permission Issues

On Linux/Mac, you may need to adjust file permissions:

```bash
chmod +x server/scripts/*.js
```

## Next Steps

1. Configure Telegram Bot Token in `.env`
2. Set up production database
3. Configure deployment pipeline
4. Add monitoring and logging

For more detailed information, see the individual README files in each directory.