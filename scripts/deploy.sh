#!/bin/bash

# Tap Empire Production Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"

echo -e "${GREEN}🚀 Starting Tap Empire deployment for ${ENVIRONMENT}...${NC}"

# Check if required files exist
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Environment file $ENV_FILE not found!${NC}"
    echo "Please create $ENV_FILE with required environment variables."
    exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}❌ Docker Compose file $COMPOSE_FILE not found!${NC}"
    exit 1
fi

# Load environment variables
export $(cat $ENV_FILE | grep -v '^#' | xargs)

echo -e "${YELLOW}📋 Pre-deployment checks...${NC}"

# Check Docker and Docker Compose
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed!${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed!${NC}"
    exit 1
fi

# Check if required environment variables are set
required_vars=("POSTGRES_PASSWORD" "JWT_SECRET" "TELEGRAM_BOT_TOKEN" "GRAFANA_PASSWORD")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Required environment variable $var is not set!${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ Pre-deployment checks passed${NC}"

# Build client application
echo -e "${YELLOW}🏗️  Building client application...${NC}"
cd client
npm ci
npm run build
cd ..

echo -e "${GREEN}✅ Client build completed${NC}"

# Run tests
echo -e "${YELLOW}🧪 Running tests...${NC}"
npm run test:unit
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Tests failed! Deployment aborted.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Tests passed${NC}"

# Create backup of current deployment (if exists)
if docker-compose -f $COMPOSE_FILE ps | grep -q "Up"; then
    echo -e "${YELLOW}💾 Creating backup of current deployment...${NC}"
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p $BACKUP_DIR
    
    # Backup database
    docker-compose -f $COMPOSE_FILE exec -T postgres pg_dump -U tap_empire_user tap_empire > $BACKUP_DIR/database_backup.sql
    
    # Backup Redis data
    docker-compose -f $COMPOSE_FILE exec -T redis redis-cli BGSAVE
    docker cp $(docker-compose -f $COMPOSE_FILE ps -q redis):/data/dump.rdb $BACKUP_DIR/redis_backup.rdb
    
    echo -e "${GREEN}✅ Backup created in $BACKUP_DIR${NC}"
fi

# Deploy new version
echo -e "${YELLOW}🚀 Deploying new version...${NC}"

# Pull latest images
docker-compose -f $COMPOSE_FILE pull

# Build application images
docker-compose -f $COMPOSE_FILE build --no-cache

# Start services with rolling update
echo -e "${YELLOW}🔄 Starting services...${NC}"

# Start infrastructure services first
docker-compose -f $COMPOSE_FILE up -d postgres redis

# Wait for database to be ready
echo -e "${YELLOW}⏳ Waiting for database to be ready...${NC}"
timeout=60
while ! docker-compose -f $COMPOSE_FILE exec -T postgres pg_isready -U tap_empire_user -d tap_empire; do
    sleep 2
    timeout=$((timeout - 2))
    if [ $timeout -le 0 ]; then
        echo -e "${RED}❌ Database failed to start within 60 seconds${NC}"
        exit 1
    fi
done

# Run database migrations
echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
docker-compose -f $COMPOSE_FILE run --rm server1 npm run db:migrate:prod

# Start application servers
docker-compose -f $COMPOSE_FILE up -d server1 server2

# Wait for servers to be healthy
echo -e "${YELLOW}⏳ Waiting for application servers to be healthy...${NC}"
timeout=120
for server in server1 server2; do
    while ! docker-compose -f $COMPOSE_FILE exec -T $server node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"; do
        sleep 5
        timeout=$((timeout - 5))
        if [ $timeout -le 0 ]; then
            echo -e "${RED}❌ Server $server failed to become healthy within 120 seconds${NC}"
            exit 1
        fi
    done
    echo -e "${GREEN}✅ Server $server is healthy${NC}"
done

# Start load balancer and monitoring
docker-compose -f $COMPOSE_FILE up -d nginx prometheus grafana loki promtail

# Final health check
echo -e "${YELLOW}🏥 Performing final health checks...${NC}"
sleep 10

# Check if nginx is responding
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Load balancer is healthy${NC}"
else
    echo -e "${RED}❌ Load balancer health check failed${NC}"
    exit 1
fi

# Check if API is responding
if curl -f http://localhost/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API is healthy${NC}"
else
    echo -e "${RED}❌ API health check failed${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${GREEN}📊 Monitoring dashboard: http://localhost:3000${NC}"
echo -e "${GREEN}📈 Metrics: http://localhost:9090${NC}"
echo -e "${GREEN}🌐 Application: http://localhost${NC}"

# Show running services
echo -e "${YELLOW}📋 Running services:${NC}"
docker-compose -f $COMPOSE_FILE ps