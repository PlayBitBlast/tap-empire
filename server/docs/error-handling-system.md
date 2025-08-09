# Error Handling System Documentation

## Overview

The Tap Empire error handling system provides comprehensive error management across both client and server sides, ensuring graceful degradation, user-friendly error messages, and proper error recovery mechanisms.

## Architecture

### Client-Side Error Handling

#### ErrorHandler Utility (`client/src/utils/errorHandler.js`)

The centralized error handler manages all client-side errors with the following features:

- **Error Classification**: Categorizes errors by type (SYNC_FAILED, NETWORK_ERROR, VALIDATION_ERROR, etc.)
- **Retry Logic**: Implements exponential backoff for network errors
- **User-Friendly Messages**: Converts technical errors into understandable messages
- **Error Frequency Tracking**: Monitors error patterns to identify critical issues
- **Graceful Degradation**: Switches to offline mode when necessary

#### Error Types Handled

1. **SYNC_FAILED**: Server synchronization failures
   - Shows retry dialog
   - Switches to offline mode after max retries
   - Preserves game state

2. **NETWORK_ERROR**: Connection issues
   - Implements exponential backoff retry
   - Shows network status indicator
   - Handles offline/online transitions

3. **VALIDATION_ERROR**: Invalid data or actions
   - Resets to last valid state
   - Shows warning messages
   - Prevents invalid operations

4. **RATE_LIMITED**: Anti-cheat rate limiting
   - Shows cooldown timer
   - Prevents further actions during cooldown
   - Educates users about limits

5. **AUTH_ERROR**: Authentication failures
   - Clears stored credentials
   - Redirects to login
   - Shows appropriate messages

6. **INVALID_STATE**: Game state mismatches
   - Applies server corrections
   - Notifies user of changes
   - Maintains game continuity

#### Error Boundaries

React Error Boundaries wrap critical components:

- **App-level boundary**: Catches all unhandled React errors
- **Game container boundary**: Isolates game interface errors
- **Component-specific boundaries**: Protect individual features

#### Network Status Component

Real-time network status indicator:
- Shows online/offline/reconnecting states
- Provides visual feedback to users
- Automatically hides when stable

### Server-Side Error Handling

#### ServerErrorHandler Middleware (`server/src/middleware/errorHandler.js`)

Centralized Express middleware for error handling:

- **Error Classification**: Categorizes server errors by type
- **HTTP Status Mapping**: Maps error types to appropriate HTTP status codes
- **User-Friendly Responses**: Provides consistent error response format
- **Error Logging**: Logs errors with context for monitoring
- **Security**: Prevents sensitive information leakage

#### Error Types Handled

1. **ValidationError** (400): Invalid request data
2. **AuthenticationError** (401): Authentication required
3. **AuthorizationError** (403): Access denied
4. **RateLimitError** (429): Too many requests
5. **GameStateError** (409): Invalid game state
6. **DatabaseError** (503): Database connection issues
7. **NetworkError** (502): Network operation failures

#### Database Error Handling

Specific handling for PostgreSQL errors:
- **Connection errors**: ECONNREFUSED, ETIMEDOUT
- **Constraint violations**: Unique, foreign key, not null
- **Query errors**: Syntax, permission issues

#### Redis Error Handling

Graceful Redis error handling:
- **Connection failures**: Continue without cache
- **Timeout errors**: Fallback to database
- **Memory issues**: Clear cache and continue

#### WebSocket Error Handling

Socket.io error management:
- **Connection errors**: Attempt reconnection
- **Message errors**: Validate and sanitize
- **Authentication errors**: Disconnect and require re-auth

## Error Response Format

### Client-Side Error Format

```javascript
{
  type: 'ERROR_TYPE',
  code: 'SPECIFIC_CODE',
  message: 'User-friendly message',
  originalError: Error, // Original error object
  context: {}, // Additional context
  timestamp: 1234567890
}
```

### Server-Side Error Response

```json
{
  "success": false,
  "error": "User-friendly error message",
  "code": "ERROR_CODE",
  "details": "Additional details (optional)",
  "correction": {} // For game state corrections
}
```

## Error Logging and Monitoring

### Client-Side Logging

- **Critical errors**: Sent to server for monitoring
- **Error frequency**: Tracked to identify patterns
- **Context preservation**: Includes user actions and state
- **Privacy protection**: Excludes sensitive information

### Server-Side Logging

- **Structured logging**: JSON format with timestamps
- **Error severity**: Critical, high, medium classification
- **Context inclusion**: Request details, user ID, stack traces
- **File rotation**: Daily log files with retention policy

### Monitoring Integration

Ready for integration with monitoring services:
- **Error aggregation**: Collects similar errors
- **Alert thresholds**: Configurable error rate alerts
- **Performance impact**: Tracks error handling overhead
- **Trend analysis**: Historical error pattern analysis

## Usage Examples

### Client-Side Error Handling

```javascript
import ErrorHandler from '../utils/errorHandler';

// Handle a sync error
try {
  await syncToServer();
} catch (error) {
  ErrorHandler.handleGameError({
    type: 'SYNC_FAILED',
    code: 'NETWORK_TIMEOUT',
    message: 'Failed to sync with server',
    originalError: error
  }, {
    gameEngine: this.gameEngine,
    retryCallback: () => this.retrySync()
  });
}

// Handle validation error with state reset
ErrorHandler.handleGameError({
  type: 'VALIDATION_ERROR',
  code: 'INVALID_COINS',
  message: 'Invalid coin amount'
}, {
  gameEngine: this.gameEngine,
  lastValidState: this.lastKnownGoodState
});
```

### Server-Side Error Handling

```javascript
const ServerErrorHandler = require('../middleware/errorHandler');

// In a controller
app.post('/api/game/tap', ServerErrorHandler.asyncHandler(async (req, res) => {
  const { userId } = req.user;
  
  if (!userId) {
    throw ServerErrorHandler.authError('User ID required');
  }
  
  try {
    const result = await gameService.processTap(userId, req.body);
    res.json(result);
  } catch (error) {
    if (error.code === 'RATE_LIMITED') {
      throw ServerErrorHandler.rateLimitError('Tapping too fast', 5000);
    }
    throw error;
  }
}));

// Database error handling
try {
  await db.query('SELECT * FROM users WHERE id = $1', [userId]);
} catch (error) {
  ServerErrorHandler.handleDatabaseError(error, 'user lookup');
}
```

## Configuration

### Environment Variables

```bash
# Error logging
LOG_LEVEL=info
LOG_RETENTION_DAYS=30

# Error monitoring
MONITORING_ENDPOINT=https://monitoring.example.com/errors
MONITORING_API_KEY=your-api-key

# Error thresholds
MAX_ERROR_RATE=100
CRITICAL_ERROR_THRESHOLD=10
```

### Client Configuration

```javascript
// Error handler configuration
ErrorHandler.configure({
  maxRetries: 3,
  retryDelay: 1000,
  maxRetryDelay: 30000,
  enableLogging: true,
  logCriticalOnly: false
});
```

## Testing

### Unit Tests

- **Error handler methods**: Test all error type handling
- **Retry logic**: Verify exponential backoff
- **State management**: Test error state transitions
- **Message formatting**: Verify user-friendly messages

### Integration Tests

- **End-to-end error flows**: Test complete error scenarios
- **API error responses**: Verify consistent error format
- **Database error handling**: Test connection failures
- **WebSocket error handling**: Test connection issues

### Error Simulation

```javascript
// Simulate network errors for testing
if (process.env.NODE_ENV === 'test') {
  ErrorHandler.simulateError('NETWORK_ERROR', 0.1); // 10% chance
}
```

## Best Practices

### Client-Side

1. **Always handle errors gracefully**: Never let errors crash the app
2. **Provide user feedback**: Show meaningful error messages
3. **Preserve game state**: Don't lose user progress
4. **Implement retry logic**: Handle transient failures
5. **Use error boundaries**: Isolate error impact

### Server-Side

1. **Validate all inputs**: Prevent invalid data processing
2. **Use proper HTTP status codes**: Follow REST conventions
3. **Log errors with context**: Include relevant information
4. **Don't expose sensitive data**: Sanitize error responses
5. **Handle database errors**: Graceful degradation

### General

1. **Monitor error rates**: Set up alerts for unusual patterns
2. **Test error scenarios**: Include error cases in testing
3. **Document error codes**: Maintain error code registry
4. **Review error logs**: Regular analysis for improvements
5. **Update error messages**: Keep them user-friendly and current

## Troubleshooting

### Common Issues

1. **High error rates**: Check network connectivity and server health
2. **Authentication errors**: Verify token validity and refresh logic
3. **Database errors**: Check connection pool and query performance
4. **Memory leaks**: Monitor error handler memory usage
5. **Infinite retry loops**: Verify retry limit enforcement

### Debug Mode

Enable debug logging for detailed error information:

```javascript
// Client-side
localStorage.setItem('debug', 'error-handler');

// Server-side
process.env.DEBUG = 'error-handler';
```

## Future Enhancements

1. **Machine learning**: Predict and prevent errors
2. **Advanced monitoring**: Real-time error dashboards
3. **User behavior analysis**: Understand error impact
4. **Automated recovery**: Self-healing error scenarios
5. **Performance optimization**: Reduce error handling overhead