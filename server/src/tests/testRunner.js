#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Tap Empire
 * 
 * This script runs different types of tests based on command line arguments:
 * - Unit tests
 * - Integration tests
 * - Performance tests
 * - End-to-end tests
 * - Anti-cheat tests
 * - All tests
 */

const { spawn } = require('child_process');
const path = require('path');

const TEST_TYPES = {
  unit: {
    pattern: '**/*.test.js',
    exclude: ['**/tests/integration/**', '**/tests/performance/**', '**/tests/e2e/**'],
    description: 'Unit tests for individual components and services'
  },
  integration: {
    pattern: '**/tests/integration/**/*.test.js',
    description: 'Integration tests for client-server communication'
  },
  performance: {
    pattern: '**/tests/performance/**/*.test.js',
    description: 'Performance tests for concurrent users and load testing'
  },
  e2e: {
    pattern: '**/tests/e2e/**/*.test.js',
    description: 'End-to-end tests for complete user workflows'
  },
  anticheat: {
    pattern: '**/tests/integration/antiCheat.test.js',
    description: 'Anti-cheat system validation tests'
  },
  all: {
    pattern: '**/*.test.js',
    description: 'All tests'
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
  console.log('  --bail         Stop on first test failure');
  console.log('  --parallel     Run tests in parallel');
  console.log('');
  console.log('Examples:');
  console.log('  node testRunner.js unit --coverage');
  console.log('  node testRunner.js integration --watch');
  console.log('  node testRunner.js performance --verbose');
  console.log('  node testRunner.js all --coverage --bail');
}

function runTests(testType, options = {}) {
  const testConfig = TEST_TYPES[testType];
  
  if (!testConfig) {
    console.error(`Unknown test type: ${testType}`);
    printUsage();
    process.exit(1);
  }

  console.log(`\n🧪 Running ${testType} tests: ${testConfig.description}\n`);

  const jestArgs = [];

  // Test pattern
  if (testConfig.pattern) {
    jestArgs.push(testConfig.pattern);
  }

  // Exclude patterns
  if (testConfig.exclude) {
    testConfig.exclude.forEach(pattern => {
      jestArgs.push('--testPathIgnorePatterns', pattern);
    });
  }

  // Options
  if (options.coverage) {
    jestArgs.push('--coverage');
  }

  if (options.watch) {
    jestArgs.push('--watch');
  } else {
    jestArgs.push('--watchAll=false');
  }

  if (options.verbose) {
    jestArgs.push('--verbose');
  }

  if (options.bail) {
    jestArgs.push('--bail');
  }

  if (options.parallel) {
    jestArgs.push('--maxWorkers=4');
  } else {
    jestArgs.push('--runInBand'); // Run serially for more stable results
  }

  // Always force exit and detect open handles
  jestArgs.push('--forceExit', '--detectOpenHandles');

  // Set timeout for performance tests
  if (testType === 'performance' || testType === 'e2e') {
    jestArgs.push('--testTimeout=30000');
  }

  console.log(`Running: jest ${jestArgs.join(' ')}\n`);

  const jest = spawn('npx', ['jest', ...jestArgs], {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  jest.on('close', (code) => {
    if (code === 0) {
      console.log(`\n✅ ${testType} tests completed successfully!`);
    } else {
      console.log(`\n❌ ${testType} tests failed with exit code ${code}`);
    }
    process.exit(code);
  });

  jest.on('error', (error) => {
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
  if (args.includes('--bail')) options.bail = true;
  if (args.includes('--parallel')) options.parallel = true;

  return { testType, options };
}

// Main execution
if (require.main === module) {
  const { testType, options } = parseArgs();
  runTests(testType, options);
}

module.exports = { runTests, TEST_TYPES };