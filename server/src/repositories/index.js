// Repository exports for easy importing
const BaseRepository = require('./BaseRepository');
const UserRepository = require('./UserRepository');
const UpgradeRepository = require('./UpgradeRepository');
const AchievementRepository = require('./AchievementRepository');
const SocialRepository = require('./SocialRepository');
const GameSessionRepository = require('./GameSessionRepository');
const EventRepository = require('./EventRepository');

// Create singleton instances
const repositories = {
  users: new UserRepository(),
  upgrades: new UpgradeRepository(),
  achievements: new AchievementRepository(),
  social: new SocialRepository(),
  gameSessions: new GameSessionRepository(),
  events: new EventRepository()
};

module.exports = {
  // Repository classes
  BaseRepository,
  UserRepository,
  UpgradeRepository,
  AchievementRepository,
  SocialRepository,
  GameSessionRepository,
  EventRepository,
  
  // Singleton instances
  repositories,
  
  // Individual repository instances for direct access
  userRepository: repositories.users,
  upgradeRepository: repositories.upgrades,
  achievementRepository: repositories.achievements,
  socialRepository: repositories.social,
  gameSessionRepository: repositories.gameSessions,
  eventRepository: repositories.events
};