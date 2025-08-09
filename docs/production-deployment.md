# Production Deployment Guide

This guide covers the production deployment of Tap Empire, including infrastructure setup, monitoring, and maintenance procedures.

## Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04 LTS or newer
- **RAM**: Minimum 4GB, Recommended 8GB+
- **CPU**: Minimum 2 cores, Recommended 4+ cores
- **Storage**: Minimum 50GB SSD
- **Network**: Stable internet connection with public IP

### Software Requirements
- Docker 24.0+
- Docker Compose 2.0+
- Git
- curl
- Basic shell utilities

## Initial Server Setup

### 1. Install Docker and Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 2. Clone Repository

```bash
cd /opt
sudo git clone https://github.com/your-org/tap-empire.git
sudo chown -R $USER:$USER tap-empire
cd tap-empire
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.prod.example .env.prod

# Edit environment variables
nano .env.prod
```

Required environment variables:
- `POSTGRES_PASSWORD`: Strong password for PostgreSQL
- `JWT_SECRET`: 32+ character secret for JWT tokens
- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token
- `GRAFANA_PASSWORD`: Password for Grafana admin user

## Deployment

### Automated Deployment

Use the deployment script for automated deployment:

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh production
```

### Manual Deployment

If you prefer manual control:

```bash
# Build client
cd client && npm ci && npm run build && cd ..

# Run tests
npm run test:unit

# Deploy with Docker Compose
docker-compose -f docker-compose.prod.yml up -d --build
```

## Architecture Overview

### Services

1. **nginx**: Load balancer and reverse proxy
2. **server1/server2**: Application server instances
3. **postgres**: PostgreSQL database
4. **redis**: Redis cache and session store
5. **prometheus**: Metrics collection
6. **grafana**: Monitoring dashboards
7. **loki**: Log aggregation
8. **promtail**: Log collection agent

### Network Architecture

```
Internet → Nginx (Load Balancer) → App Servers → Database/Cache
                ↓
            Monitoring Stack
```

### Scaling Configuration

The production setup includes:
- **2 application server instances** for high availability
- **Load balancing** with health checks
- **Resource limits** to prevent resource exhaustion
- **Automatic restarts** on failure

## Monitoring and Alerting

### Grafana Dashboards

Access Grafana at `http://your-server:3000`
- Username: `admin`
- Password: Set in `GRAFANA_PASSWORD` environment variable

Key metrics monitored:
- Active users
- Taps per second
- Response times
- Error rates
- Database connections
- Redis memory usage

### Prometheus Metrics

Access Prometheus at `http://your-server:9090`

Custom application metrics:
- `tap_empire_active_users`: Current active users
- `tap_empire_taps_total`: Total taps counter
- `http_request_duration_seconds`: Request latency
- `http_requests_total`: HTTP request counter

### Log Management

Logs are collected by Promtail and stored in Loki:
- Application logs
- Nginx access/error logs
- System logs
- Docker container logs

## Backup and Recovery

### Automated Backups

The deployment script automatically creates backups before deployment:
- Database dump
- Redis data snapshot

### Manual Backup

```bash
# Database backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U tap_empire_user tap_empire > backup_$(date +%Y%m%d_%H%M%S).sql

# Redis backup
docker-compose -f docker-compose.prod.yml exec redis redis-cli BGSAVE
docker cp $(docker-compose -f docker-compose.prod.yml ps -q redis):/data/dump.rdb redis_backup_$(date +%Y%m%d_%H%M%S).rdb
```

### Rollback

Use the rollback script to revert to a previous version:

```bash
# Rollback to most recent backup
./scripts/rollback.sh

# Rollback to specific backup
./scripts/rollback.sh backups/20240101_120000
```

## Security Considerations

### Network Security
- All services run in isolated Docker network
- Only necessary ports exposed to host
- Rate limiting on API endpoints
- Security headers configured in Nginx

### Application Security
- JWT tokens for authentication
- Input validation and sanitization
- SQL injection prevention
- Anti-cheat mechanisms

### Database Security
- Strong passwords
- Connection encryption (when SSL enabled)
- Regular security updates

## Performance Optimization

### Database Optimization
- Connection pooling
- Query optimization
- Proper indexing
- Regular VACUUM operations

### Redis Optimization
- Memory usage monitoring
- Key expiration policies
- Connection pooling

### Application Optimization
- Response caching
- Static asset optimization
- Gzip compression
- CDN integration (optional)

## Maintenance Procedures

### Regular Maintenance

**Daily:**
- Monitor system health via Grafana
- Check error logs
- Verify backup completion

**Weekly:**
- Review performance metrics
- Update security patches
- Clean up old logs and backups

**Monthly:**
- Database maintenance (VACUUM, ANALYZE)
- Security audit
- Capacity planning review

### Updates and Patches

1. Test updates in staging environment
2. Create backup before applying updates
3. Apply updates during maintenance window
4. Verify system health after updates
5. Monitor for issues post-update

### Troubleshooting

#### Common Issues

**Service won't start:**
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs service_name

# Check resource usage
docker stats

# Restart service
docker-compose -f docker-compose.prod.yml restart service_name
```

**Database connection issues:**
```bash
# Check database status
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U tap_empire_user

# Check connections
docker-compose -f docker-compose.prod.yml exec postgres psql -U tap_empire_user -c "SELECT count(*) FROM pg_stat_activity;"
```

**High memory usage:**
```bash
# Check container resource usage
docker stats

# Check Redis memory
docker-compose -f docker-compose.prod.yml exec redis redis-cli info memory
```

## CI/CD Pipeline

The project includes GitHub Actions workflow for automated deployment:

1. **Test Stage**: Runs all tests
2. **Security Scan**: Checks for vulnerabilities
3. **Build Stage**: Builds Docker images
4. **Deploy Stage**: Deploys to production server

### Required Secrets

Configure these secrets in GitHub repository settings:
- `DOCKER_USERNAME`: Docker Hub username
- `DOCKER_PASSWORD`: Docker Hub password
- `PRODUCTION_HOST`: Production server IP/hostname
- `PRODUCTION_USER`: SSH username
- `PRODUCTION_SSH_KEY`: SSH private key
- `POSTGRES_PASSWORD`: Database password
- `JWT_SECRET`: JWT secret key
- `TELEGRAM_BOT_TOKEN`: Telegram bot token
- `GRAFANA_PASSWORD`: Grafana admin password
- `SLACK_WEBHOOK_URL`: Slack notifications (optional)

## Support and Monitoring

### Health Checks

- Application: `http://your-server/health`
- API: `http://your-server/api/health`
- Load Balancer: `http://your-server/health`

### Key URLs

- **Application**: `http://your-server`
- **Grafana**: `http://your-server:3000`
- **Prometheus**: `http://your-server:9090`

### Emergency Contacts

Document your emergency procedures and contacts here:
- On-call engineer
- System administrator
- Database administrator

## Disaster Recovery

### Recovery Procedures

1. **Complete System Failure**:
   - Restore from latest backup
   - Redeploy application
   - Verify data integrity

2. **Database Corruption**:
   - Stop application servers
   - Restore database from backup
   - Restart services
   - Verify functionality

3. **Data Center Outage**:
   - Activate backup infrastructure
   - Redirect traffic
   - Restore from backups
   - Monitor performance

### Recovery Time Objectives

- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 1 hour
- **Data Backup Frequency**: Every 6 hours
- **Backup Retention**: 30 days