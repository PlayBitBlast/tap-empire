# Production Deployment Checklist

Use this checklist to ensure all production deployment requirements are met.

## Pre-Deployment Checklist

### Infrastructure Setup
- [ ] Production server provisioned with adequate resources (4GB+ RAM, 2+ CPU cores, 50GB+ SSD)
- [ ] Docker and Docker Compose installed
- [ ] Git repository cloned to `/opt/tap-empire`
- [ ] Firewall configured (ports 80, 443, 22 open)
- [ ] SSL certificates obtained (if using HTTPS)
- [ ] Domain name configured and DNS pointing to server

### Environment Configuration
- [ ] `.env.prod` file created from `.env.prod.example`
- [ ] `POSTGRES_PASSWORD` set to strong password (16+ characters)
- [ ] `JWT_SECRET` set to secure random string (32+ characters)
- [ ] `TELEGRAM_BOT_TOKEN` configured with valid bot token
- [ ] `GRAFANA_PASSWORD` set for monitoring access
- [ ] All optional environment variables configured as needed

### Security Setup
- [ ] SSH key-based authentication configured
- [ ] Root login disabled
- [ ] Fail2ban installed and configured
- [ ] Regular security updates scheduled
- [ ] Backup encryption configured
- [ ] Network security groups/firewall rules applied

### Database Setup
- [ ] PostgreSQL configuration optimized for production workload
- [ ] Database backup strategy implemented
- [ ] Connection pooling configured
- [ ] Monitoring and alerting set up for database metrics

### Monitoring Setup
- [ ] Prometheus metrics collection configured
- [ ] Grafana dashboards imported and configured
- [ ] Log aggregation with Loki/Promtail set up
- [ ] Alert rules configured for critical metrics
- [ ] Notification channels configured (Slack, email, etc.)

## Deployment Checklist

### Code Quality
- [ ] All tests passing (unit, integration, e2e)
- [ ] Security audit completed with no high-severity issues
- [ ] Code review completed and approved
- [ ] Performance testing completed
- [ ] Load testing completed for expected user volume

### Build Process
- [ ] Client application builds successfully
- [ ] Docker images build without errors
- [ ] All dependencies properly locked with package-lock.json
- [ ] Production optimizations applied (minification, compression)

### Database Migration
- [ ] Database migrations tested in staging environment
- [ ] Migration rollback procedures tested
- [ ] Database backup created before migration
- [ ] Migration scripts reviewed for performance impact

### Deployment Execution
- [ ] Maintenance window scheduled and communicated
- [ ] Deployment script executed successfully
- [ ] All services started and healthy
- [ ] Health checks passing for all endpoints
- [ ] Load balancer distributing traffic correctly

## Post-Deployment Checklist

### Functional Testing
- [ ] User registration/login working
- [ ] Core game mechanics functioning (tapping, upgrades)
- [ ] Social features working (friends, gifts, leaderboards)
- [ ] Real-time features working (WebSocket connections)
- [ ] Achievement system functioning
- [ ] Daily bonus system working

### Performance Verification
- [ ] Response times within acceptable limits (<2s for 95th percentile)
- [ ] Error rate below 1%
- [ ] Database query performance acceptable
- [ ] Memory usage within normal ranges
- [ ] CPU usage within normal ranges

### Monitoring Verification
- [ ] All metrics being collected correctly
- [ ] Dashboards displaying data
- [ ] Alerts configured and tested
- [ ] Log aggregation working
- [ ] Backup processes running successfully

### Security Verification
- [ ] SSL/TLS certificates valid and properly configured
- [ ] Security headers present in HTTP responses
- [ ] Rate limiting working correctly
- [ ] Authentication and authorization working
- [ ] No sensitive data exposed in logs or responses

## Rollback Checklist

### Rollback Triggers
- [ ] Error rate exceeds 5% for more than 5 minutes
- [ ] Response time exceeds 5 seconds for 95th percentile
- [ ] Critical functionality broken
- [ ] Security vulnerability discovered
- [ ] Data corruption detected

### Rollback Process
- [ ] Rollback decision made and communicated
- [ ] Database backup verified before rollback
- [ ] Rollback script executed
- [ ] Previous version health checks passing
- [ ] Functionality verified after rollback
- [ ] Incident post-mortem scheduled

## Maintenance Checklist

### Daily Tasks
- [ ] Monitor system health via Grafana dashboards
- [ ] Check error logs for any critical issues
- [ ] Verify backup completion
- [ ] Review security alerts
- [ ] Check resource usage trends

### Weekly Tasks
- [ ] Review performance metrics and trends
- [ ] Update security patches if available
- [ ] Clean up old log files and backups
- [ ] Review and rotate access logs
- [ ] Test backup restoration process

### Monthly Tasks
- [ ] Perform database maintenance (VACUUM, ANALYZE)
- [ ] Security audit and vulnerability scan
- [ ] Capacity planning review
- [ ] Update dependencies and Docker images
- [ ] Review and update monitoring alerts

## Emergency Procedures

### Service Outage
1. [ ] Check service status via monitoring dashboards
2. [ ] Review recent deployments and changes
3. [ ] Check system resources and logs
4. [ ] Attempt service restart if safe
5. [ ] Escalate to on-call engineer if needed
6. [ ] Communicate status to stakeholders

### Database Issues
1. [ ] Check database connectivity and status
2. [ ] Review database logs for errors
3. [ ] Check disk space and memory usage
4. [ ] Attempt database restart if safe
5. [ ] Consider rollback if data corruption suspected
6. [ ] Contact database administrator if needed

### Security Incident
1. [ ] Isolate affected systems immediately
2. [ ] Preserve logs and evidence
3. [ ] Assess scope and impact
4. [ ] Implement containment measures
5. [ ] Notify security team and stakeholders
6. [ ] Document incident for post-mortem

## Contact Information

### Emergency Contacts
- **On-call Engineer**: [Phone/Email]
- **System Administrator**: [Phone/Email]
- **Database Administrator**: [Phone/Email]
- **Security Team**: [Phone/Email]

### Service Information
- **Production URL**: [Your production URL]
- **Monitoring Dashboard**: [Grafana URL]
- **Status Page**: [Status page URL if available]
- **Documentation**: [Link to this documentation]

## Sign-off

### Deployment Team Sign-off
- [ ] **Developer**: _________________ Date: _________
- [ ] **DevOps Engineer**: _________________ Date: _________
- [ ] **QA Engineer**: _________________ Date: _________
- [ ] **Product Manager**: _________________ Date: _________

### Production Readiness Approval
- [ ] **Technical Lead**: _________________ Date: _________
- [ ] **Operations Manager**: _________________ Date: _________

---

**Deployment Date**: _______________
**Deployment Version**: _______________
**Deployed By**: _______________