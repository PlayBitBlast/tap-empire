#!/usr/bin/env node

// Production Configuration Test Script
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Tap Empire Production Configuration...\n');

const tests = [];
let passed = 0;
let failed = 0;

// Test function
function test(name, testFn) {
  try {
    testFn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    failed++;
  }
}

// Check if file exists
function fileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
}

// Check if file contains content
function fileContains(filePath, content) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  if (!fileContent.includes(content)) {
    throw new Error(`File ${filePath} doesn't contain: ${content}`);
  }
}

// Test environment file
test('Environment file exists', () => {
  fileExists('.env.prod');
});

test('Environment file has required variables', () => {
  const envContent = fs.readFileSync('.env.prod', 'utf8');
  const requiredVars = ['POSTGRES_PASSWORD', 'JWT_SECRET', 'TELEGRAM_BOT_TOKEN', 'GRAFANA_PASSWORD'];
  
  requiredVars.forEach(varName => {
    if (!envContent.includes(varName)) {
      throw new Error(`Missing required variable: ${varName}`);
    }
  });
});

// Test Docker Compose files
test('Production Docker Compose file exists', () => {
  fileExists('docker-compose.prod.yml');
});

test('Production Docker Compose has all services', () => {
  const requiredServices = ['nginx', 'server1', 'server2', 'postgres', 'redis', 'prometheus', 'grafana'];
  
  requiredServices.forEach(service => {
    fileContains('docker-compose.prod.yml', service);
  });
});

// Test Nginx configuration
test('Nginx configuration exists', () => {
  fileExists('nginx/nginx.conf');
  fileExists('nginx/conf.d/default.conf');
});

test('Nginx has load balancing configuration', () => {
  fileContains('nginx/nginx.conf', 'upstream backend');
  fileContains('nginx/conf.d/default.conf', 'proxy_pass http://backend');
});

// Test database configuration
test('PostgreSQL configuration exists', () => {
  fileExists('postgresql/postgresql.conf');
});

test('Redis configuration exists', () => {
  fileExists('redis/redis.conf');
});

// Test monitoring configuration
test('Prometheus configuration exists', () => {
  fileExists('monitoring/prometheus.yml');
});

test('Grafana configuration exists', () => {
  fileExists('monitoring/grafana/datasources/datasources.yml');
  fileExists('monitoring/grafana/dashboards/tap-empire-dashboard.json');
});

// Test deployment scripts
test('Deployment scripts exist', () => {
  fileExists('scripts/deploy.sh');
  fileExists('scripts/rollback.sh');
  fileExists('scripts/backup.sh');
  fileExists('scripts/health-check.sh');
});

// Test production Dockerfile
test('Production Dockerfile exists', () => {
  fileExists('server/Dockerfile.prod');
});

test('Production Dockerfile has security features', () => {
  fileContains('server/Dockerfile.prod', 'dumb-init');
  fileContains('server/Dockerfile.prod', 'USER tapempire');
  fileContains('server/Dockerfile.prod', 'HEALTHCHECK');
});

// Test CI/CD pipeline
test('GitHub Actions workflow exists', () => {
  fileExists('.github/workflows/deploy.yml');
});

test('CI/CD pipeline has all stages', () => {
  const requiredStages = ['test', 'security-scan', 'build-and-push', 'deploy'];
  
  requiredStages.forEach(stage => {
    fileContains('.github/workflows/deploy.yml', stage);
  });
});

// Test documentation
test('Production documentation exists', () => {
  fileExists('docs/production-deployment.md');
  fileExists('docs/production-checklist.md');
});

// Test package.json scripts
test('Production scripts in package.json', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredScripts = ['docker:prod:up', 'docker:prod:down', 'deploy:prod'];
  
  requiredScripts.forEach(script => {
    if (!packageJson.scripts[script]) {
      throw new Error(`Missing script: ${script}`);
    }
  });
});

// Test client build directory (if exists)
test('Client can be built', () => {
  // Check if client directory exists and has package.json
  fileExists('client/package.json');
  
  // Check if build script exists
  const clientPackageJson = JSON.parse(fs.readFileSync('client/package.json', 'utf8'));
  if (!clientPackageJson.scripts || !clientPackageJson.scripts.build) {
    throw new Error('Client build script not found');
  }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All production configuration tests passed!');
  console.log('\n📋 Next Steps:');
  console.log('1. Install Docker Desktop to test the full production environment');
  console.log('2. Run: npm run docker:prod:up');
  console.log('3. Access: http://localhost (app), http://localhost:3000 (monitoring)');
} else {
  console.log('❌ Some tests failed. Please fix the issues above.');
  process.exit(1);
}