# Tap Empire - Comprehensive Testing Guide

This document describes the comprehensive test suite for the Tap Empire social clicker game, covering all aspects from unit tests to end-to-end workflows.

## Test Structure Overview

The test suite is organized into several categories to ensure complete coverage of the application:

### 1. Unit Tests
- **Client-side**: React components, services, hooks, and utilities
- **Server-side**: Controllers, services, repositories, and middleware
- **Shared**: Calculation functions and validation utilities

### 2. Integration Tests
- Client-server communication via HTTP API
- WebSocket real-time features
- Database operations and transactions
- Anti-cheat system validation

### 3. Performance Tests
- Concurrent user simulation (up to 100 users)
- Response time under load
- Memory usage monitoring
- Database connection pool efficiency
- WebSocket performance

### 4. End-to-End Tests
- Complete user workflows from registration to advanced gameplay
- Social interaction flows
- Achievement and progression systems
- Event participation
- Error recovery scenarios

## Running Tests

### Quick Start
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:performance
npm run test:e2e
```

### Client Tests
```bash
# All client tests
npm run test:client

# Specific client test types
npm run test:client:components
npm run test:client:services
npm run test:client:hooks
npm run test:client:utils
```

### Server Tests
```bash
# All server tests
npm run test:server

# Specific server test types
npm run test:server:unit
npm run test:integration
npm run test:performance
npm run test:e2e
npm run test:anticheat
```

### Using Test Runners
```bash
# Server test runner with options
cd server && node src/tests/testRunner.js [type] [options]

# Client test runner with options
cd client && node src/tests/testRunner.js [type] [options]

# Available options:
# --coverage    Generate coverage report
# --watch       Run in watch mode
# --verbose     Detailed output
# --bail        Stop on first failure
# --parallel    Run tests in parallel
```

## Test Categories Detail

### Unit Tests

#### GameEngine Tests (`client/src/services/gameEngine.test.js`)
- Core game mechanics (tap handling, coin calculations)
- Golden Tap system (2% chance, 10x multiplier)
- Offline progress calculation
- State synchronization
- Event system
- Session statistics

#### Game Service Tests (`server/src/services/gameService.test.js`)
- Server-side tap validation
- Anti-cheat mechanisms
- Rate limiting (max 20 taps/second)
- Timestamp validation
- Earnings validation
- State correction

#### Component Tests
- TapButton: Touch handling, animations, visual feedback
- CoinCounter: Number formatting, smooth transitions
- UpgradePanel: Purchase validation, cost calculations
- Leaderboard: Real-time updates, ranking display
- Achievement components: Unlock notifications, progress tracking

### Integration Tests

#### Client-Server Communication (`server/src/tests/integration/clientServerCommunication.test.js`)
- HTTP API integration
- WebSocket real-time features
- Hybrid HTTP + WebSocket workflows
- Error recovery and resilience
- State consistency between protocols

#### Anti-Cheat System (`server/src/tests/integration/antiCheat.test.js`)
- Rate limiting validation
- Timestamp validation
- State validation and correction
- Suspicious activity detection
- Earnings validation
- Session integrity

### Performance Tests

#### Concurrent Users (`server/src/tests/performance/concurrentUsers.test.js`)
- 100 concurrent tap requests
- Response time under load (avg < 200ms, max < 1s)
- Memory usage monitoring (< 50% increase)
- Database connection pool efficiency
- WebSocket performance with multiple connections

**Performance Benchmarks:**
- Concurrent taps: 100 users, < 5 seconds total time
- Success rate: > 80% (accounting for rate limiting)
- Memory increase: < 50% during sustained load
- Database operations: < 10 seconds for 50 concurrent operations

### End-to-End Tests

#### Complete User Workflows (`server/src/tests/e2e/completeUserWorkflows.test.js`)
- **New User Onboarding**: Registration → First tap → Leaderboard → Achievements
- **Daily Active User**: Login → Daily bonus → Offline progress → Active play → Upgrades
- **Social Interaction**: Friends list → Gift sending → Gift receiving → Social stats
- **Progression**: Achievement unlocking → Prestige eligibility → Event participation
- **Real-time Features**: WebSocket connections → Live updates → Sync workflows
- **Error Recovery**: Network issues → State desync → Normal gameplay recovery

## Test Coverage Requirements

### Minimum Coverage Targets
- **Unit Tests**: 90% line coverage, 85% branch coverage
- **Integration Tests**: All API endpoints and WebSocket events
- **Performance Tests**: All critical user paths under load
- **E2E Tests**: All major user workflows

### Critical Areas (100% Coverage Required)
- Anti-cheat validation logic
- Coin calculation and state management
- User authentication and authorization
- Database transaction handling
- Real-time synchronization

## Anti-Cheat Testing

The anti-cheat system is thoroughly tested to ensure fair gameplay:

### Rate Limiting Tests
- Validates max 20 taps per second per user
- Tests cooldown periods and recovery
- Verifies per-user isolation (one user's rate limiting doesn't affect others)

### Timestamp Validation Tests
- Rejects taps with timestamps > 30 seconds old
- Rejects future timestamps
- Accepts valid timestamps within window

### State Validation Tests
- Detects impossible coin amounts
- Validates upgrade levels against spending
- Corrects inconsistent total earnings
- Flags suspicious activity patterns

### Earnings Validation Tests
- Validates tap earnings against user state
- Ensures Golden Tap multipliers are correct
- Rejects impossible earnings amounts

## Performance Benchmarks

### Response Time Targets
- Tap processing: < 100ms average
- Leaderboard updates: < 200ms
- State synchronization: < 150ms
- Database queries: < 50ms average

### Concurrency Targets
- Support 100+ concurrent users
- Maintain < 200ms average response time under load
- Handle 1000+ taps per minute across all users
- Process real-time updates for 50+ connected WebSocket clients

### Memory Usage Targets
- Server memory increase < 50% during peak load
- No memory leaks during sustained operation
- Efficient cleanup of user session data
- Database connection pool optimization

## Test Data Management

### Test Database
- Separate test database with clean state for each test run
- Automated migration and seeding for consistent test environment
- Transaction rollback for isolated test execution

### Mock Data
- Realistic user profiles and game states
- Various upgrade levels and achievement states
- Different event types and configurations
- Edge cases and boundary conditions

### Test Users
- Multiple test user accounts with different progression levels
- Admin users for testing administrative features
- Flagged users for testing anti-cheat responses

## Continuous Integration

### Pre-commit Hooks
- Run unit tests before allowing commits
- Validate code coverage thresholds
- Check for test file presence with new features

### CI Pipeline
1. **Unit Tests**: Fast feedback on individual components
2. **Integration Tests**: Validate component interactions
3. **Performance Tests**: Ensure no performance regressions
4. **E2E Tests**: Validate complete user workflows
5. **Coverage Report**: Generate and publish coverage metrics

### Test Environment
- Automated setup of test database and Redis
- Docker containers for consistent test environment
- Parallel test execution for faster feedback

## Debugging Tests

### Common Issues
- **Database Connection**: Ensure test database is running
- **Redis Connection**: Verify Redis is available for caching tests
- **Port Conflicts**: Use different ports for test servers
- **Async Operations**: Proper handling of promises and timeouts

### Debug Commands
```bash
# Run tests with verbose output
npm run test:server:unit -- --verbose

# Run specific test file
npx jest server/src/services/gameService.test.js --verbose

# Debug WebSocket tests
DEBUG=socket.io* npm run test:integration

# Run performance tests with detailed output
npm run test:performance -- --verbose
```

### Test Utilities
- `authHelper.js`: Generate test JWT tokens
- Mock services for external dependencies
- Test data factories for consistent test objects
- Custom matchers for game-specific assertions

## Best Practices

### Writing Tests
1. **Arrange-Act-Assert**: Clear test structure
2. **Descriptive Names**: Test names should explain the scenario
3. **Single Responsibility**: One assertion per test when possible
4. **Mock External Dependencies**: Isolate units under test
5. **Clean Up**: Proper teardown to prevent test interference

### Performance Testing
1. **Realistic Load**: Test with realistic user behavior patterns
2. **Gradual Ramp-up**: Increase load gradually to identify breaking points
3. **Monitor Resources**: Track CPU, memory, and database performance
4. **Baseline Measurements**: Establish performance baselines for comparison

### E2E Testing
1. **User-Centric Scenarios**: Test from user perspective
2. **Error Scenarios**: Include failure and recovery paths
3. **Data Validation**: Verify data consistency across operations
4. **Real-time Features**: Test WebSocket and live update functionality

## Maintenance

### Regular Tasks
- Update test data to reflect game balance changes
- Review and update performance benchmarks
- Add tests for new features and bug fixes
- Monitor test execution time and optimize slow tests

### Test Review Process
- All new features must include comprehensive tests
- Performance impact assessment for new functionality
- Anti-cheat validation for any game mechanics changes
- E2E test updates for UI/UX changes

This comprehensive test suite ensures the reliability, performance, and security of the Tap Empire game while providing confidence for continuous development and deployment.