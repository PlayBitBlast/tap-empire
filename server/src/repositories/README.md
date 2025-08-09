# Database Schema and Repository Layer

This directory contains the database schema implementation and data access layer for the Tap Empire social clicker game.

## Overview

The database layer follows the Repository pattern to provide a clean abstraction over database operations. All repositories extend a base repository class that provides common CRUD operations, while specific repositories add domain-specific methods.

## Architecture

### Database Connection
- **PostgreSQL 15+** as the primary database
- **Connection pooling** with configurable pool size and timeouts
- **Transaction support** with automatic rollback on errors
- **Error handling** with detailed logging and graceful degradation

### Repository Pattern
- **BaseRepository**: Provides common CRUD operations for all entities
- **Specific Repositories**: Add domain-specific business logic
- **Singleton instances**: Pre-configured repository instances for easy use
- **Type safety**: Consistent interfaces across all repositories

## Database Schema

### Core Tables

#### Users (`users`)
Stores user account information and game state:
- Basic Telegram user info (ID, username, name)
- Game progress (coins, total earned, prestige level)
- Upgrade state (coins per tap, auto-clicker rate)
- Login tracking (streak, last login)
- Account status (active, banned)

#### User Upgrades (`user_upgrades`)
Tracks user's purchased upgrades:
- Upgrade type and current level
- Supports multiple upgrade categories
- Unique constraint per user/upgrade type

#### Achievements (`achievements`)
Defines available achievements:
- Achievement metadata (name, description, category)
- Unlock requirements (type and threshold value)
- Rewards (coins and multiplier bonuses)

#### User Achievements (`user_achievements`)
Tracks unlocked achievements per user:
- Links users to their unlocked achievements
- Timestamp of when achievement was unlocked

### Social Features

#### Friendships (`friendships`)
Manages friend relationships:
- User-to-friend mappings
- Friendship status (active, blocked)
- Prevents self-friendship

#### Gifts (`gifts`)
Handles gift system between friends:
- Gift amount and optional message
- Status tracking (sent, claimed, expired)
- Automatic expiration after 7 days
- Daily gift limits enforcement

### Game Systems

#### Events (`events`)
Limited-time events and multipliers:
- Event metadata and timing
- Multiplier values for bonuses
- Event type categorization
- Active/inactive status

#### Game Sessions (`game_sessions`)
Anti-cheat and session tracking:
- Session duration and statistics
- IP address and user agent logging
- Suspicious activity flagging
- Tap count and earnings tracking

#### Tap Events (`tap_events`)
Detailed tap logging for anti-cheat:
- Individual tap timestamps
- Earnings per tap
- Golden tap detection
- Client/server timestamp comparison

#### Daily Bonuses (`daily_bonuses`)
Login streak and daily bonus tracking:
- Daily bonus amounts and multipliers
- Streak day tracking
- Unique constraint per user/date

## Repository Classes

### BaseRepository
Provides common database operations:

```javascript
// CRUD operations
findById(id)
findAll(conditions, options)
findOne(conditions)
create(data)
update(id, data)
delete(id)

// Utility methods
count(conditions)
exists(conditions)
paginate(page, limit, conditions, orderBy)
bulkCreate(records)
transaction(callback)
```

### UserRepository
User-specific operations:

```javascript
// User management
findByTelegramId(telegramId)
createFromTelegram(telegramUser)
addCoins(userId, amount)
deductCoins(userId, amount)
updateLoginStreak(userId, streak)

// Leaderboards
getTopUsers(limit)
getUserRank(userId)
getUsersAroundRank(userId, context)

// Game mechanics
prestige(userId, prestigeLevel, prestigePoints)
calculateOfflineEarnings(userId, maxHours)
```

### UpgradeRepository
Upgrade system operations:

```javascript
// Upgrade management
getUserUpgrades(userId)
getUpgradeLevel(userId, upgradeType)
setUpgradeLevel(userId, upgradeType, level)
incrementUpgrade(userId, upgradeType)
resetUserUpgrades(userId) // For prestige

// Statistics
getUserUpgradeStats(userId)
getUpgradeDistribution()
```

### AchievementRepository
Achievement system operations:

```javascript
// Achievement queries
getActiveAchievements()
getAchievementsByCategory(category)
getUserAchievements(userId)
getUserAchievementProgress(userId)

// Achievement unlocking
unlockAchievement(userId, achievementId)
getUnlockableAchievements(userId, userStats)
bulkUnlockAchievements(userId, achievementIds)

// Statistics
getAchievementStatistics()
getMostPopularAchievements(limit)
getRarestAchievements(limit)
```

### SocialRepository
Social features operations:

```javascript
// Friend management
getUserFriends(userId)
addFriend(userId, friendId)
removeFriend(userId, friendId)
areFriends(userId, friendId)
getMutualFriends(userId1, userId2)

// Gift system
sendGift(senderId, receiverId, amount, message)
getReceivedGifts(userId, status)
claimGift(giftId, userId)
getDailyGiftCount(userId)

// Social features
getFriendActivityFeed(userId, limit)
getFriendSuggestions(userId, limit)
```

### GameSessionRepository
Session and anti-cheat operations:

```javascript
// Session management
startSession(userId, ipAddress, userAgent)
endSession(sessionId)
updateSessionStats(sessionId, taps, earnings)

// Anti-cheat
recordTapEvent(userId, sessionId, earnings, isGoldenTap)
getRecentTaps(userId, seconds)
detectBotBehavior(userId, hours)
markSuspicious(sessionId, reason)

// Analytics
getUserSessionStats(userId, days)
getGlobalStats()
```

### EventRepository
Event system operations:

```javascript
// Event queries
getActiveEvents()
getUpcomingEvents(days)
getEventsByType(eventType)
getActiveEventByType(eventType)

// Event management
createEvent(eventData)
createWeekendEvent(multiplier, startTime, endTime)
scheduleWeekendEvents(weeksAhead, multiplier)

// Event lifecycle
getEventsToStart() // For cron jobs
getEventsToEnd()   // For cron jobs
```

## Database Functions

The schema includes several PostgreSQL functions for complex calculations:

### `calculate_offline_earnings(user_id, max_hours)`
Calculates offline earnings based on auto-clicker rate and time offline (capped at max hours).

### `get_user_multiplier(user_id)`
Calculates total multiplier from unlocked achievements.

### `calculate_prestige_points(total_coins)`
Calculates prestige points earned based on total coins (diminishing returns).

### `calculate_upgrade_cost(base_cost, current_level, scaling_factor)`
Calculates upgrade cost with exponential scaling.

### `validate_tap_rate(user_id, session_id, max_taps_per_second)`
Validates tap rate for anti-cheat (default max 20 taps/second).

### `cleanup_expired_gifts()`
Marks expired gifts as expired (for cleanup jobs).

### `get_user_leaderboard_rank(user_id)`
Gets user's current rank on the leaderboard.

## Usage Examples

### Basic CRUD Operations
```javascript
const { repositories } = require('./repositories');

// Create a user
const user = await repositories.users.createFromTelegram({
  id: 123456789,
  username: 'player1',
  first_name: 'John',
  last_name: 'Doe'
});

// Add coins
await repositories.users.addCoins(user.id, 100);

// Get user upgrades
const upgrades = await repositories.upgrades.getUserUpgrades(user.id);
```

### Transaction Example
```javascript
// Purchase upgrade with transaction
await repositories.users.transaction(async (client) => {
  // Deduct coins
  const user = await repositories.users.deductCoins(userId, upgradeCost);
  if (!user) {
    throw new Error('Insufficient coins');
  }
  
  // Apply upgrade
  await repositories.upgrades.incrementUpgrade(userId, 'tap_multiplier');
  
  // Update user stats
  await repositories.users.update(userId, {
    coins_per_tap: newCoinsPerTap
  });
});
```

### Complex Queries
```javascript
// Get leaderboard with user context
const topUsers = await repositories.users.getTopUsers(100);
const userRank = await repositories.users.getUserRank(userId);
const nearbyUsers = await repositories.users.getUsersAroundRank(userId, 5);

// Check for unlockable achievements
const userStats = await repositories.users.getUserSessionStats(userId);
const unlockable = await repositories.achievements.getUnlockableAchievements(userId, userStats);
```

## Migration and Seeding

### Running Migrations
```bash
# Run all migrations
node server/scripts/migrate.js

# Run seeds (development only)
node server/scripts/seed.js
```

### Migration Files
Located in `database/migrations/`, numbered for proper execution order:
1. `001_create_users.sql` - User accounts and basic game state
2. `002_create_upgrades.sql` - Upgrade system
3. `003_create_achievements.sql` - Achievement system
4. `004_create_social_tables.sql` - Friends and gifts
5. `005_create_events_and_sessions.sql` - Events and anti-cheat
6. `006_create_functions.sql` - Database functions

### Seed Files
Located in `database/seeds/`:
- `achievements.sql` - Pre-defined achievements
- `upgrades.sql` - Upgrade configuration reference

## Testing

### Unit Tests
- Repository structure validation
- Method availability checks
- Database connection testing

### Integration Tests
- Full CRUD operations (requires database)
- Transaction handling
- Complex query validation

### Running Tests
```bash
# Structure tests (no database required)
npm test -- server/src/repositories/structure.test.js

# Database tests (requires PostgreSQL)
npm test -- server/src/repositories/repositories.test.js
```

## Performance Considerations

### Indexing Strategy
- Primary keys on all tables
- Foreign key indexes for joins
- Composite indexes for common query patterns
- Partial indexes for filtered queries

### Connection Pooling
- Configurable pool size (default: 20 connections)
- Connection timeout and idle timeout settings
- Connection reuse limits to prevent memory leaks

### Query Optimization
- Prepared statements for repeated queries
- Batch operations for bulk inserts
- Pagination for large result sets
- Efficient leaderboard queries with window functions

## Security Features

### Anti-Cheat Measures
- Tap rate validation (max 20 taps/second)
- Session tracking with IP and user agent
- Suspicious activity flagging
- Server-side validation of all game state changes

### Data Protection
- Input validation and sanitization
- SQL injection prevention through parameterized queries
- User data isolation through proper access controls
- Audit trails for sensitive operations

## Monitoring and Maintenance

### Database Health
- Connection pool monitoring
- Query performance logging
- Error tracking and alerting
- Automated cleanup of old data

### Data Cleanup
- Expired gift cleanup
- Old session data removal
- Inactive user identification
- Performance metric collection

This database layer provides a robust foundation for the Tap Empire game, with proper separation of concerns, comprehensive error handling, and scalable architecture patterns.