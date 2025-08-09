#!/usr/bin/env node

/**
 * Client-side Test Runner for Tap Empire
 * 
 * This script runs React component tests and client-side unit tests
 */

const { spawn } = require('child_process');

const TEST_TYPES = {
  components: {
    pattern: 'src/components/**/*.test.jsx',
    description: 'React component tests'
  },
  services: {
    pattern: 'src/services/**/*.test.js',
    description: 'Client service tests'
  },
  hooks: {
    pattern: 'src/hooks/**/*.test.js',
    description: 'React hooks tests'
  },
  utils: {
    pattern: 'src/utils/**/*.test.js',
    description: 'Utility function tests'
  },
  integration: {
    pattern: 'src/**/*.integration.test.js',
    description: 'Client integration tests'
  },
  all: {
    pattern: 'src/**/*.test.{js,jsx}',
    description: 'All client tests'
  }
};

function printUsage() {
  console.log('Usage: node testRunner.js [test-type] [options]');
  console.log('');
  console.log('Test Types:');
  Object.entries(TEST_TYPES).forEach(([type, config]) => {
    console.log(`  ${type.padEnd(12)} - ${config.description}`);
  });
  console.log('');
  console.log('Options:');
  console.log('  --coverage     Generate coverage report');
  console.log('  --watch        Run tests in watch mode');
  console.log('  --verbose      Verbose output');
  console.log('  --update       Update snapshots');
  console.log('');
  console.log('Examples:');
  console.log('  node testRunner.js components --coverage');
  console.log('  node testRunner.js services --watch');
  console.log('  node testRunner.js all --coverage --verbose');
}

function runTests(testType, options = {}) {
  const testConfig = TEST_TYPES[testType];
  
  if (!testConfig) {
    console.error(`Unknown test type: ${testType}`);
    printUsage();
    process.exit(1);
  }

  console.log(`\n🧪 Running ${testType} tests: ${testConfig.description}\n`);

  const reactScriptsArgs = ['test'];

  // Test pattern
  if (testConfig.pattern) {
    reactScriptsArgs.push('--testPathPattern', testConfig.pattern);
  }

  // Options
  if (options.coverage) {
    reactScriptsArgs.push('--coverage', '--coverageDirectory=coverage');
  }

  if (options.watch) {
    // react-scripts test runs in watch mode by default
  } else {
    reactScriptsArgs.push('--watchAll=false');
  }

  if (options.verbose) {
    reactScriptsArgs.push('--verbose');
  }

  if (options.update) {
    reactScriptsArgs.push('--updateSnapshot');
  }

  console.log(`Running: react-scripts ${reactScriptsArgs.join(' ')}\n`);

  const reactScripts = spawn('npx', ['react-scripts', ...reactScriptsArgs], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: {
      ...process.env,
      CI: options.watch ? 'false' : 'true' // Disable watch mode in CI
    }
  });

  reactScripts.on('close', (code) => {
    if (code === 0) {
      console.log(`\n✅ ${testType} tests completed successfully!`);
    } else {
      console.log(`\n❌ ${testType} tests failed with exit code ${code}`);
    }
    process.exit(code);
  });

  reactScripts.on('error', (error) => {
    console.error(`Failed to start test runner: ${error.message}`);
    process.exit(1);
  });
}

function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const testType = args[0];
  const options = {};

  // Parse options
  if (args.includes('--coverage')) options.coverage = true;
  if (args.includes('--watch')) options.watch = true;
  if (args.includes('--verbose')) options.verbose = true;
  if (args.includes('--update')) options.update = true;

  return { testType, options };
}

// Main execution
if (require.main === module) {
  const { testType, options } = parseArgs();
  runTests(testType, options);
}

module.exports = { runTests, TEST_TYPES };