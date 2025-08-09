#!/bin/bash

# Tap Empire Backup Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"

echo -e "${GREEN}💾 Starting Tap Empire backup...${NC}"

# Create backup directory
mkdir -p $BACKUP_DIR

# Check if services are running
if ! docker-compose -f $COMPOSE_FILE ps | grep -q "Up"; then
    echo -e "${RED}❌ Services are not running. Cannot create backup.${NC}"
    exit 1
fi

echo -e "${YELLOW}📁 Creating backup directory: $BACKUP_DIR${NC}"

# Backup PostgreSQL database
echo -e "${YELLOW}🗄️  Backing up PostgreSQL database...${NC}"
if docker-compose -f $COMPOSE_FILE exec -T postgres pg_dump -U tap_empire_user tap_empire > $BACKUP_DIR/database_backup.sql; then
    echo -e "${GREEN}✅ Database backup completed${NC}"
else
    echo -e "${RED}❌ Database backup failed${NC}"
    exit 1
fi

# Backup Redis data
echo -e "${YELLOW}📊 Backing up Redis data...${NC}"
if docker-compose -f $COMPOSE_FILE exec -T redis redis-cli BGSAVE; then
    sleep 5  # Wait for background save to complete
    if docker cp $(docker-compose -f $COMPOSE_FILE ps -q redis):/data/dump.rdb $BACKUP_DIR/redis_backup.rdb; then
        echo -e "${GREEN}✅ Redis backup completed${NC}"
    else
        echo -e "${RED}❌ Redis backup failed${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Redis BGSAVE failed${NC}"
    exit 1
fi

# Backup configuration files
echo -e "${YELLOW}⚙️  Backing up configuration files...${NC}"
cp .env.prod $BACKUP_DIR/ 2>/dev/null || echo "No .env.prod file found"
cp -r nginx/ $BACKUP_DIR/ 2>/dev/null || echo "No nginx config found"
cp -r monitoring/ $BACKUP_DIR/ 2>/dev/null || echo "No monitoring config found"

# Create backup metadata
echo -e "${YELLOW}📋 Creating backup metadata...${NC}"
cat > $BACKUP_DIR/backup_info.txt << EOF
Tap Empire Backup Information
=============================
Backup Date: $(date)
Backup Directory: $BACKUP_DIR
Server Hostname: $(hostname)
Docker Compose File: $COMPOSE_FILE

Services Status at Backup Time:
$(docker-compose -f $COMPOSE_FILE ps)

Database Size:
$(docker-compose -f $COMPOSE_FILE exec -T postgres psql -U tap_empire_user -d tap_empire -c "SELECT pg_size_pretty(pg_database_size('tap_empire'));" -t | xargs)

Redis Memory Usage:
$(docker-compose -f $COMPOSE_FILE exec -T redis redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')

Backup Files:
$(ls -la $BACKUP_DIR/)
EOF

# Calculate backup size
BACKUP_SIZE=$(du -sh $BACKUP_DIR | cut -f1)

echo -e "${GREEN}✅ Backup completed successfully!${NC}"
echo -e "${GREEN}📦 Backup location: $BACKUP_DIR${NC}"
echo -e "${GREEN}📏 Backup size: $BACKUP_SIZE${NC}"

# Clean up old backups (keep last 30 days)
echo -e "${YELLOW}🧹 Cleaning up old backups...${NC}"
find backups/ -type d -name "20*" -mtime +30 -exec rm -rf {} \; 2>/dev/null || true

REMAINING_BACKUPS=$(find backups/ -type d -name "20*" | wc -l)
echo -e "${GREEN}📚 Remaining backups: $REMAINING_BACKUPS${NC}"

echo -e "${GREEN}🎉 Backup process completed!${NC}"