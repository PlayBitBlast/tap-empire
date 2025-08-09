#!/bin/bash

# Tap Empire Production Health Check Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

COMPOSE_FILE="docker-compose.prod.yml"
FAILED_CHECKS=0

echo -e "${YELLOW}🏥 Tap Empire Health Check Report${NC}"
echo "=================================="
echo "Timestamp: $(date)"
echo ""

# Function to check service health
check_service_health() {
    local service_name=$1
    local health_url=$2
    local expected_status=${3:-200}
    
    echo -n "Checking $service_name... "
    
    if curl -s -o /dev/null -w "%{http_code}" "$health_url" | grep -q "$expected_status"; then
        echo -e "${GREEN}✅ Healthy${NC}"
        return 0
    else
        echo -e "${RED}❌ Unhealthy${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# Function to check Docker service status
check_docker_service() {
    local service_name=$1
    
    echo -n "Checking Docker service $service_name... "
    
    if docker-compose -f $COMPOSE_FILE ps $service_name | grep -q "Up"; then
        echo -e "${GREEN}✅ Running${NC}"
        return 0
    else
        echo -e "${RED}❌ Not running${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# Function to check resource usage
check_resource_usage() {
    echo -e "${YELLOW}📊 Resource Usage:${NC}"
    
    # Memory usage
    local memory_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    echo "Memory Usage: ${memory_usage}%"
    
    if (( $(echo "$memory_usage > 90" | bc -l) )); then
        echo -e "${RED}⚠️  High memory usage detected!${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
    
    # Disk usage
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    echo "Disk Usage: ${disk_usage}%"
    
    if [ "$disk_usage" -gt 85 ]; then
        echo -e "${RED}⚠️  High disk usage detected!${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
    
    # Load average
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    echo "Load Average (1min): $load_avg"
    
    echo ""
}

# Function to check database connectivity
check_database() {
    echo -n "Checking PostgreSQL connectivity... "
    
    if docker-compose -f $COMPOSE_FILE exec -T postgres pg_isready -U tap_empire_user -d tap_empire > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Connected${NC}"
        
        # Check active connections
        local connections=$(docker-compose -f $COMPOSE_FILE exec -T postgres psql -U tap_empire_user -d tap_empire -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | xargs)
        echo "Active DB connections: $connections"
        
        if [ "$connections" -gt 150 ]; then
            echo -e "${YELLOW}⚠️  High number of database connections${NC}"
        fi
    else
        echo -e "${RED}❌ Connection failed${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
}

# Function to check Redis connectivity
check_redis() {
    echo -n "Checking Redis connectivity... "
    
    if docker-compose -f $COMPOSE_FILE exec -T redis redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Connected${NC}"
        
        # Check memory usage
        local redis_memory=$(docker-compose -f $COMPOSE_FILE exec -T redis redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
        echo "Redis memory usage: $redis_memory"
    else
        echo -e "${RED}❌ Connection failed${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
}

# Function to check application metrics
check_app_metrics() {
    echo -e "${YELLOW}📈 Application Metrics:${NC}"
    
    # Try to get metrics from Prometheus
    if curl -s http://localhost:9090/api/v1/query?query=up > /dev/null 2>&1; then
        # Get active users (if metric exists)
        local active_users=$(curl -s "http://localhost:9090/api/v1/query?query=tap_empire_active_users" | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "N/A")
        echo "Active users: $active_users"
        
        # Get request rate
        local request_rate=$(curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total[5m])" | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "N/A")
        echo "Request rate (5min): $request_rate req/s"
    else
        echo "Prometheus not accessible - metrics unavailable"
    fi
    
    echo ""
}

# Main health checks
echo -e "${YELLOW}🐳 Docker Services:${NC}"
check_docker_service "nginx"
check_docker_service "server1"
check_docker_service "server2"
check_docker_service "postgres"
check_docker_service "redis"
check_docker_service "prometheus"
check_docker_service "grafana"

echo ""
echo -e "${YELLOW}🌐 HTTP Health Checks:${NC}"
check_service_health "Load Balancer" "http://localhost/health"
check_service_health "API Endpoint" "http://localhost/api/health"
check_service_health "Grafana" "http://localhost:3000/api/health"
check_service_health "Prometheus" "http://localhost:9090/-/healthy"

echo ""
echo -e "${YELLOW}💾 Database & Cache:${NC}"
check_database
check_redis

echo ""
check_resource_usage
check_app_metrics

# Summary
echo "=================================="
if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}🎉 All health checks passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ $FAILED_CHECKS health check(s) failed!${NC}"
    echo -e "${YELLOW}Please investigate the failed checks above.${NC}"
    exit 1
fi