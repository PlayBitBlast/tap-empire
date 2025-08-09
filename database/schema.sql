-- Tap Empire Database Schema
-- PostgreSQL 15+ compatible

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table - Core user data and game state
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    coins BIGINT DEFAULT 0 CHECK (coins >= 0),
    total_coins_earned BIGINT DEFAULT 0 CHECK (total_coins_earned >= 0),
    coins_per_tap INTEGER DEFAULT 1 CHECK (coins_per_tap > 0),
    auto_clicker_rate INTEGER DEFAULT 0 CHECK (auto_clicker_rate >= 0),
    prestige_level INTEGER DEFAULT 0 CHECK (prestige_level >= 0),
    prestige_points INTEGER DEFAULT 0 CHECK (prestige_points >= 0),
    login_streak INTEGER DEFAULT 0 CHECK (login_streak >= 0),
    last_login TIMESTAMP WITH TIME ZONE,
    last_offline_calculation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    is_banned BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for users table
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_total_coins ON users(total_coins_earned DESC);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;
CREATE INDEX idx_users_last_login ON users(last_login);

-- User upgrades table
CREATE TABLE user_upgrades (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    upgrade_type VARCHAR(50) NOT NULL,
    level INTEGER DEFAULT 0 CHECK (level >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, upgrade_type)
);

CREATE INDEX idx_user_upgrades_user_id ON user_upgrades(user_id);

-- Achievements definition table
CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    requirement_type VARCHAR(50) NOT NULL,
    requirement_value BIGINT NOT NULL,
    reward_coins BIGINT DEFAULT 0 CHECK (reward_coins >= 0),
    reward_multiplier DECIMAL(10,4) DEFAULT 1.0000 CHECK (reward_multiplier >= 1.0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_achievements_category ON achievements(category);
CREATE INDEX idx_achievements_active ON achievements(is_active) WHERE is_active = true;

-- User achievements table
CREATE TABLE user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_unlocked_at ON user_achievements(unlocked_at);

-- Friendships table
CREATE TABLE friendships (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, friend_id),
    CHECK (user_id != friend_id)
);

CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);

-- Gifts table
CREATE TABLE gifts (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL CHECK (amount > 0),
    message TEXT,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'claimed', 'expired')),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    claimed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    
    CHECK (sender_id != receiver_id)
);

CREATE INDEX idx_gifts_sender_date ON gifts(sender_id, sent_at);
CREATE INDEX idx_gifts_receiver_status ON gifts(receiver_id, status);
CREATE INDEX idx_gifts_expires_at ON gifts(expires_at);

-- Events table for limited-time events
CREATE TABLE events (
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

CREATE INDEX idx_events_active_time ON events(is_active, start_time, end_time);

-- Game sessions table for anti-cheat tracking
CREATE TABLE game_sessions (
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

CREATE INDEX idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX idx_game_sessions_start_time ON game_sessions(start_time);
CREATE INDEX idx_game_sessions_suspicious ON game_sessions(suspicious_activity) WHERE suspicious_activity = true;

-- Tap events table for detailed anti-cheat analysis
CREATE TABLE tap_events (
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

-- Partition tap_events by month for better performance
CREATE INDEX idx_tap_events_user_timestamp ON tap_events(user_id, tap_timestamp);
CREATE INDEX idx_tap_events_session_id ON tap_events(session_id);

-- Daily login bonuses tracking
CREATE TABLE daily_bonuses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bonus_date DATE NOT NULL DEFAULT CURRENT_DATE,
    streak_day INTEGER NOT NULL CHECK (streak_day > 0),
    bonus_amount BIGINT NOT NULL CHECK (bonus_amount > 0),
    multiplier DECIMAL(10,4) NOT NULL CHECK (multiplier >= 1.0),
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, bonus_date)
);

CREATE INDEX idx_daily_bonuses_user_date ON daily_bonuses(user_id, bonus_date);

-- Functions and triggers for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_upgrades_updated_at BEFORE UPDATE ON user_upgrades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate offline earnings
CREATE OR REPLACE FUNCTION calculate_offline_earnings(
    p_user_id INTEGER,
    p_offline_hours DECIMAL DEFAULT 4.0
) RETURNS BIGINT AS $$
DECLARE
    v_auto_clicker_rate INTEGER;
    v_offline_seconds DECIMAL;
    v_max_offline_seconds DECIMAL := p_offline_hours * 3600;
    v_earnings BIGINT;
BEGIN
    -- Get user's auto-clicker rate
    SELECT auto_clicker_rate INTO v_auto_clicker_rate
    FROM users WHERE id = p_user_id;
    
    -- Calculate offline seconds (capped at max)
    v_offline_seconds := LEAST(
        EXTRACT(EPOCH FROM (NOW() - (SELECT last_offline_calculation FROM users WHERE id = p_user_id))),
        v_max_offline_seconds
    );
    
    -- Calculate earnings (auto-clicker rate per second * offline seconds)
    v_earnings := FLOOR(v_auto_clicker_rate * v_offline_seconds);
    
    RETURN GREATEST(v_earnings, 0);
END;
$$ LANGUAGE plpgsql;

-- Initial data setup will be handled by seed files