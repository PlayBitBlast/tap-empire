# Project Structure

## Root Directory Layout
```
tap-empire/
├── client/                 # React frontend application
├── server/                 # Node.js backend application
├── shared/                 # Shared utilities and types
├── database/               # Database migrations and seeds
├── docker/                 # Docker configuration files
├── docs/                   # Project documentation
├── .kiro/                  # Kiro AI assistant configuration
├── docker-compose.yml      # Development environment setup
├── package.json            # Root package.json for scripts
└── README.md              # Project overview and setup
```

## Client Structure (React Frontend)
```
client/
├── public/                 # Static assets and Telegram Web App manifest
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── TapButton/      # Main tap button with animations
│   │   ├── UpgradePanel/   # Upgrade purchase interface
│   │   ├── Leaderboard/    # Real-time rankings display
│   │   └── common/         # Shared UI components
│   ├── pages/              # Main game screens
│   │   ├── GameScreen/     # Primary gameplay interface
│   │   ├── FriendsScreen/  # Social features and friend list
│   │   └── ProfileScreen/  # User stats and achievements
│   ├── services/           # API and WebSocket clients
│   │   ├── gameEngine.js   # Core game logic and state
│   │   ├── syncManager.js  # Client-server synchronization
│   │   └── telegramApi.js  # Telegram Web App integration
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Helper functions and constants
│   ├── styles/             # CSS files and animations
│   └── App.js              # Main application component
├── package.json
└── webpack.config.js       # Build configuration
```

## Server Structure (Node.js Backend)
```
server/
├── src/
│   ├── controllers/        # HTTP request handlers
│   │   ├── gameController.js    # Game actions (tap, upgrade)
│   │   ├── socialController.js  # Friend and gift management
│   │   └── authController.js    # Authentication endpoints
│   ├── services/           # Business logic layer
│   │   ├── gameService.js       # Core game mechanics
│   │   ├── socialService.js     # Social features
│   │   ├── leaderboardService.js # Rankings management
│   │   └── achievementService.js # Achievement system
│   ├── models/             # Database models and schemas
│   │   ├── User.js         # User data model
│   │   ├── Upgrade.js      # Upgrade configurations
│   │   └── Achievement.js  # Achievement definitions
│   ├── middleware/         # Express middleware
│   │   ├── auth.js         # JWT authentication
│   │   ├── rateLimit.js    # Anti-cheat rate limiting
│   │   └── validation.js   # Request validation
│   ├── routes/             # API route definitions
│   ├── sockets/            # WebSocket event handlers
│   ├── utils/              # Helper functions
│   └── app.js              # Express application setup
├── package.json
└── Dockerfile
```

## Database Structure
```
database/
├── migrations/             # Database schema changes
│   ├── 001_create_users.sql
│   ├── 002_create_upgrades.sql
│   ├── 003_create_achievements.sql
│   └── 004_create_social_tables.sql
├── seeds/                  # Development data
│   ├── achievements.sql    # Achievement definitions
│   └── upgrades.sql        # Upgrade configurations
└── schema.sql              # Complete database schema
```

## Shared Directory
```
shared/
├── types/                  # TypeScript type definitions
├── constants/              # Game constants and configurations
│   ├── gameConfig.js       # Upgrade costs, multipliers
│   ├── achievements.js     # Achievement definitions
│   └── events.js           # WebSocket event names
└── utils/                  # Cross-platform utilities
    ├── calculations.js     # Game math functions
    └── validation.js       # Shared validation logic
```

## Key File Naming Conventions
- **Components**: PascalCase (e.g., `TapButton.jsx`)
- **Services**: camelCase (e.g., `gameService.js`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `GAME_CONFIG`)
- **Database**: snake_case (e.g., `user_achievements`)
- **CSS Classes**: kebab-case (e.g., `.tap-button`)

## Import Path Conventions
- Use absolute imports from `src/` directory
- Group imports: external libraries, internal services, components
- Shared utilities imported from `../shared/`

## Configuration Files Location
- Environment variables in `.env` files at root
- Game balance configs in `shared/constants/`
- Database connection in `server/src/config/`
- Build configs at respective package roots