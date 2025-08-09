-- Migration: Create events and game sessions tables
-- Description: Limited-time events and anti-cheat tracking

-- Events table for limited-time events
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL,
    multiplier DECIMAL(10,4) DEFAULT 1.0000 CHECK (multiplier >= 1.0),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CHECK (end_time > start_time)
);

-- Indexes for events table
CREATE INDEX IF NOT EXISTS idx_events_active_time ON events(is_active, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_end_time ON events(end_time);

-- Game sessions table for anti-cheat tracking
CREATE TABLE IF NOT EXISTS game_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token UUID DEFAULT uuid_generate_v4(),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    total_taps INTEGER DEFAULT 0 CHECK (total_taps >= 0),
    total_earnings BIGINT DEFAULT 0 CHECK (total_earnings >= 0),
    suspicious_activity BOOLEAN DEFAULT false,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for game_sessions table
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_start_time ON game_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_game_sessions_suspicious ON game_sessions(suspicious_activity) WHERE suspicious_activity = true;
CREATE INDEX IF NOT EXISTS idx_game_sessions_token ON game_sessions(session_token);

-- Tap events table for detailed anti-cheat analysis
CREATE TABLE IF NOT EXISTS tap_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES game_sessions(id) ON DELETE CASCADE,
    tap_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    earnings BIGINT NOT NULL CHECK (earnings > 0),
    is_golden_tap BOOLEAN DEFAULT false,
    client_timestamp BIGINT,
    server_validation BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for tap_events table
CREATE INDEX IF NOT EXISTS idx_tap_events_user_timestamp ON tap_events(user_id, tap_timestamp);
CREATE INDEX IF NOT EXISTS idx_tap_events_session_id ON tap_events(session_id);
CREATE INDEX IF NOT EXISTS idx_tap_events_timestamp ON tap_events(tap_timestamp);

-- Daily login bonuses tracking
CREATE TABLE IF NOT EXISTS daily_bonuses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bonus_date DATE NOT NULL DEFAULT CURRENT_DATE,
    streak_day INTEGER NOT NULL CHECK (streak_day > 0),
    bonus_amount BIGINT NOT NULL CHECK (bonus_amount > 0),
    multiplier DECIMAL(10,4) NOT NULL CHECK (multiplier >= 1.0),
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, bonus_date)
);

-- Indexes for daily_bonuses table
CREATE INDEX IF NOT EXISTS idx_daily_bonuses_user_date ON daily_bonuses(user_id, bonus_date);
CREATE INDEX IF NOT EXISTS idx_daily_bonuses_date ON daily_bonuses(bonus_date);