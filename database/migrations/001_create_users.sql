-- Migration: Create users table
-- Description: Core user data and game state

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table - Core user data and game state
CREATE TABLE IF NOT EXISTS users (
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
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_total_coins ON users(total_coins_earned DESC);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- Function for automatic updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();