# Windows Testing Guide for Production Deployment

This guide helps you test the Tap Empire production deployment on Windows.

## ✅ Configuration Test (Already Passed!)

You've already run the configuration test successfully:
```powershell
node scripts\test-production-config.js
```

All 18 tests passed, which means your production configuration is correctly set up!

## 🐳 Option 1: Full Docker Testing (Recommended)

### Install Docker Desktop

1. **Download Docker Desktop**:
   - Visit: https://www.docker.com/products/docker-desktop/
   - Download "Docker Desktop for Windows"
   - Install and restart your computer

2. **Verify Docker Installation**:
```powershell
docker --version
docker-compose --version
```

3. **Test Production Environment**:
```powershell
# Build client application
cd client
npm ci
npm run build
cd ..

# Start production environment
npm run docker:prod:up

# Check running services
docker-compose -f docker-compose.prod.yml ps

# Test health endpoints
curl http://localhost/health
curl http://localhost/api/health
```

4. **Access Services**:
   - **Application**: http://localhost
   - **Grafana Monitoring**: http://localhost:3000 (admin/admin123)
   - **Prometheus Metrics**: http://localhost:9090

5. **Test Health Check Script**:
```powershell
# Note: This requires bash, so use Git Bash or WSL
bash scripts/health-check.sh
```

## 🔧 Option 2: Component Testing Without Docker

### Test Individual Components

1. **Test Development Environment**:
```powershell
# Start development environment
npm run docker:up

# In separate terminals:
npm run dev:server
npm run dev:client

# Access at http://localhost:3000
```

2. **Test Build Process**:
```powershell
# Test client build
cd client
npm run build
cd ..

# Check if build folder was created
ls client/build
```

3. **Test Server Configuration**:
```powershell
# Test server can start
cd server
npm start
# Should start on port 3001
```

## 🧪 Option 3: Simulate Production with Node.js

Let me create a production simulation script:

### Production Simulation Test

```powershell
# Test production configuration validation
node scripts\test-production-config.js

# Test environment variables
node -e "
require('dotenv').config({ path: '.env.prod' });
console.log('Environment loaded successfully');
console.log('Database URL would be:', process.env.DATABASE_URL || 'Not set');
console.log('JWT Secret length:', (process.env.JWT_SECRET || '').length);
"
```

## 🌐 Option 4: Cloud Testing

### Test on a Cloud Provider

1. **DigitalOcean Droplet** (Cheapest option):
   - Create a $5/month Ubuntu droplet
   - Follow the production deployment guide
   - Test for a few hours, then destroy

2. **AWS EC2 Free Tier**:
   - Launch a t2.micro instance
   - Install Docker and test deployment
   - Use for 12 months free

3. **Google Cloud Platform**:
   - Use $300 free credit
   - Create a small VM instance
   - Test production deployment

## 📊 What Each Test Validates

### Configuration Test ✅ (Already Passed)
- All required files exist
- Environment variables are configured
- Docker Compose services are defined
- Nginx load balancing is configured
- Monitoring stack is set up
- Deployment scripts are ready
- CI/CD pipeline is configured

### Docker Test (If you install Docker)
- Services start correctly
- Load balancer distributes traffic
- Database connections work
- Redis caching functions
- Monitoring collects metrics
- Health checks pass

### Development Test
- Application runs in development mode
- All features work correctly
- Tests pass
- Build process works

## 🚀 Quick Start Commands

Once you have Docker installed:

```powershell
# Quick production test
npm run docker:prod:up

# Check everything is running
docker-compose -f docker-compose.prod.yml ps

# Test the application
start http://localhost

# View monitoring
start http://localhost:3000

# Stop everything
npm run docker:prod:down
```

## 🔍 Troubleshooting

### Common Windows Issues

1. **Docker not starting**:
   - Enable Hyper-V in Windows Features
   - Enable WSL 2 if prompted
   - Restart computer

2. **Port conflicts**:
   - Check if ports 80, 3000, 9090 are in use
   - Use `netstat -an | findstr :80` to check

3. **Permission issues**:
   - Run PowerShell as Administrator
   - Check Docker Desktop is running

4. **Build failures**:
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and reinstall

## 📈 Performance Testing

### Load Testing (Optional)

If you want to test performance:

```powershell
# Install artillery for load testing
npm install -g artillery

# Create a simple load test
echo '@echo off
artillery quick --count 10 --num 100 http://localhost/api/health
' > test-load.bat

# Run load test
test-load.bat
```

## 🎯 Success Criteria

Your production setup is working correctly if:

- ✅ Configuration test passes (already done!)
- ✅ All Docker services start without errors
- ✅ Health endpoints return 200 OK
- ✅ Grafana dashboard shows metrics
- ✅ Application loads in browser
- ✅ No error logs in Docker containers

## 📞 Next Steps

1. **Install Docker Desktop** for full testing
2. **Run the production environment** locally
3. **Test all features** work correctly
4. **Review monitoring dashboards**
5. **Try the deployment scripts**

The production configuration is already validated and ready to deploy!