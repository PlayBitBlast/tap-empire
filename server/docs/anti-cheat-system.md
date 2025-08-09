# Anti-Cheat System Documentation

## Overview

The Tap Empire anti-cheat system provides comprehensive protection against various forms of cheating and exploitation. It implements server-side validation, rate limiting, suspicious activity detection, and automated account flagging.

## Core Components

### 1. GameService (`server/src/services/gameService.js`)

The main anti-cheat service that handles:
- Server-side tap validation
- Rate limiting enforcement
- Earnings calculation verification
- State synchronization and correction
- Suspicious activity detection

#### Key Features:

**Tap Rate Limiting:**
- Maximum 20 taps per second per user
- Sliding window validation
- Automatic flagging for excessive rates

**Server-Side Validation:**
- All earnings calculated server-side
- Client state verification
- Timestamp validation to prevent replay attacks
- Checksum validation for state integrity

**Suspicious Activity Detection:**
- Automatic flagging after 5 violations
- Multiple violation types tracked
- Evidence collection for admin review

### 2. Database Schema

#### Anti-Cheat Tables:

**suspicious_activities:**
```sql
- id: Primary key
- user_id: User who triggered the activity
- activity_type: Type of suspicious behavior
- details: JSON details of the incident
- severity: low/medium/high/critical
- resolved: Whether admin has reviewed
- created_at: When detected
```

**game_action_logs:**
```sql
- id: Primary key
- user_id: User performing action
- action_type: Type of game action
- action_data: JSON data about the action
- timestamp: When action occurred
- ip_address: User's IP address
- user_agent: Browser/client info
- session_id: Game session identifier
```

**User Flags:**
```sql
- is_flagged: Boolean flag for suspicious accounts
- flag_reason: Reason for flagging
- flag_timestamp: When account was flagged
- is_admin: Admin privileges flag
```

### 3. Validation Methods

#### Tap Validation:
```javascript
// Rate limiting
validateTapRate(userId, timestamp)

// Timestamp validation (prevents replay attacks)
validateTimestamp(timestamp)

// Earnings validation
validateEarnings(earnings, userState)
```

#### State Validation:
```javascript
// Compare client vs server state
validateAndCorrectState(userId, clientState)

// Generate checksums for integrity
generateGameStateChecksum(gameState)
```

## Anti-Cheat Measures

### 1. Rate Limiting

**Tap Rate Limiting:**
- Maximum 20 taps per second
- 1-second sliding window
- Automatic violation flagging

**API Rate Limiting:**
- 100 requests per minute for general API
- 50 game actions per minute
- 30 purchases per minute

### 2. Server-Side Authority

**All Critical Calculations Server-Side:**
- Coins per tap calculation
- Golden Tap probability and rewards
- Upgrade costs and effects
- Auto-clicker earnings

**State Synchronization:**
- Server state is authoritative
- Client state corrections when discrepancies found
- Automatic sync on suspicious differences

### 3. Timestamp Validation

**Prevents Replay Attacks:**
- Timestamps must be within 30 seconds of server time
- Cannot be more than 5 seconds in the future
- Prevents old request replay

### 4. Suspicious Activity Detection

**Automatic Detection:**
- Excessive tap rates
- Invalid timestamps
- Impossible earnings calculations
- State manipulation attempts

**Escalation System:**
- 1-4 violations: Logged and monitored
- 5+ violations: Account automatically flagged
- Critical violations: Immediate flagging

### 5. Account Flagging

**Automatic Flagging Triggers:**
- 5+ violations of same type
- Critical security violations
- Impossible game state changes

**Admin Review Process:**
- Flagged accounts require admin review
- Evidence collection and logging
- Resolution tracking

## API Endpoints

### Game Actions

**POST /api/game/tap**
- Processes tap with full validation
- Rate limiting applied
- Returns earnings and new state

**POST /api/game/sync**
- Validates and corrects client state
- Returns authoritative server state
- Flags discrepancies

### Admin Endpoints

**GET /api/game/anti-cheat/stats**
- Returns anti-cheat statistics
- Admin access required
- Shows active sessions and violations

**POST /api/game/anti-cheat/cleanup**
- Forces cleanup of old data
- Admin access required
- Maintenance endpoint

## Configuration

### Rate Limits (gameConfig.js):
```javascript
MAX_TAPS_PER_SECOND: 20
TAP_VALIDATION_WINDOW_MS: 1000
API_RATE_LIMIT_MAX_REQUESTS: 100
GAME_ACTION_RATE_LIMIT_MS: 50
```

### Validation Settings:
```javascript
// Timestamp validation
maxAge: 30000 // 30 seconds
maxFuture: 5000 // 5 seconds

// Auto-flagging threshold
violationThreshold: 5
```

## Monitoring and Logging

### Activity Logging:
- All game actions logged with metadata
- Suspicious activities tracked separately
- IP addresses and user agents recorded
- Session tracking for pattern analysis

### Statistics Available:
- Active tap sessions count
- Suspicious activities by type
- Flagged accounts count
- Violation patterns and trends

### Cleanup and Maintenance:
- Automatic cleanup every 5 minutes
- Old tap history removal (5 minutes)
- Old suspicious activities cleanup (24 hours)
- Game action logs cleanup (30 days)

## Security Best Practices

### Server-Side Validation:
- Never trust client data
- Validate all inputs
- Use authoritative server calculations
- Implement proper error handling

### Rate Limiting:
- Multiple layers of rate limiting
- Different limits for different actions
- Sliding window implementation
- Graceful degradation

### Logging and Monitoring:
- Comprehensive activity logging
- Suspicious pattern detection
- Admin notification system
- Evidence preservation

### Data Protection:
- Sanitize logged data
- Protect sensitive information
- Secure admin endpoints
- Proper access controls

## Testing

### Unit Tests:
- GameService validation methods
- Rate limiting functionality
- State synchronization
- Suspicious activity detection

### Integration Tests:
- End-to-end tap processing
- Client-server communication
- Database logging
- Admin functionality

### Performance Tests:
- Concurrent user simulation
- Rate limiting under load
- Memory usage monitoring
- Cleanup efficiency

## Deployment Considerations

### Production Settings:
- Enable all rate limiting
- Set up monitoring alerts
- Configure log retention
- Set up admin access

### Scaling:
- In-memory data structures scale per instance
- Database logging handles high volume
- Redis can be added for distributed rate limiting
- Horizontal scaling supported

### Monitoring:
- Track violation rates
- Monitor false positives
- Alert on critical violations
- Regular admin review of flagged accounts

## Future Enhancements

### Planned Features:
- Machine learning for pattern detection
- Behavioral analysis
- Device fingerprinting
- Advanced statistical analysis

### Potential Improvements:
- Distributed rate limiting with Redis
- Real-time admin notifications
- Automated ban/unban system
- Integration with external fraud detection