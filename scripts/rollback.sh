#!/bin/bash

# Tap Empire Rollback Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR=${1:-""}

echo -e "${YELLOW}🔄 Starting rollback process...${NC}"

if [ -z "$BACKUP_DIR" ]; then
    # Find the most recent backup
    BACKUP_DIR=$(ls -1t backups/ | head -n 1)
    if [ -z "$BACKUP_DIR" ]; then
        echo -e "${RED}❌ No backup directory found!${NC}"
        exit 1
    fi
    BACKUP_DIR="backups/$BACKUP_DIR"
fi

if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}❌ Backup directory $BACKUP_DIR not found!${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Using backup from: $BACKUP_DIR${NC}"

# Stop current services
echo -e "${YELLOW}🛑 Stopping current services...${NC}"
docker-compose -f $COMPOSE_FILE down

# Restore database
if [ -f "$BACKUP_DIR/database_backup.sql" ]; then
    echo -e "${YELLOW}🗄️  Restoring database...${NC}"
    docker-compose -f $COMPOSE_FILE up -d postgres
    
    # Wait for database
    timeout=60
    while ! docker-compose -f $COMPOSE_FILE exec -T postgres pg_isready -U tap_empire_user -d tap_empire; do
        sleep 2
        timeout=$((timeout - 2))
        if [ $timeout -le 0 ]; then
            echo -e "${RED}❌ Database failed to start${NC}"
            exit 1
        fi
    done
    
    # Drop and recreate database
    docker-compose -f $COMPOSE_FILE exec -T postgres psql -U tap_empire_user -c "DROP DATABASE IF EXISTS tap_empire;"
    docker-compose -f $COMPOSE_FILE exec -T postgres psql -U tap_empire_user -c "CREATE DATABASE tap_empire;"
    
    # Restore from backup
    docker-compose -f $COMPOSE_FILE exec -T postgres psql -U tap_empire_user tap_empire < $BACKUP_DIR/database_backup.sql
    
    echo -e "${GREEN}✅ Database restored${NC}"
fi

# Restore Redis
if [ -f "$BACKUP_DIR/redis_backup.rdb" ]; then
    echo -e "${YELLOW}📊 Restoring Redis data...${NC}"
    docker-compose -f $COMPOSE_FILE up -d redis
    sleep 5
    docker cp $BACKUP_DIR/redis_backup.rdb $(docker-compose -f $COMPOSE_FILE ps -q redis):/data/dump.rdb
    docker-compose -f $COMPOSE_FILE restart redis
    echo -e "${GREEN}✅ Redis data restored${NC}"
fi

# Start all services
echo -e "${YELLOW}🚀 Starting services...${NC}"
docker-compose -f $COMPOSE_FILE up -d

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
sleep 30

# Health checks
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Rollback completed successfully!${NC}"
else
    echo -e "${RED}❌ Rollback may have failed - services not responding${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Rollback completed successfully!${NC}"
docker-compose -f $COMPOSE_FILE ps