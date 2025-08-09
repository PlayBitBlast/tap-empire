-- Tap Empire Database Schema
-- MySQL 8.0+ compatible

-- Users table - Core user data and game state
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    coins BIGINT DEFAULT 0 CHECK (coins >= 0),
    total_coins_earned BIGINT DEFAULT 0 CHECK (total_coins_earned >= 0),
    coins_per_tap INT DEFAULT 1 CHECK (coins_per_tap > 0),
    auto_clicker_rate INT DEFAULT 0 CHECK (auto_clicker_rate >= 0),
    prestige_level INT DEFAULT 0 CHECK (prestige_level >= 0),
    prestige_points INT DEFAULT 0 CHECK (prestige_points >= 0),
    login_streak INT DEFAULT 0 CHECK (login_streak >= 0),
    last_login TIMESTAMP NULL,
    last_offline_calculation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    is_banned BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Indexes for users table
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_total_coins ON users(total_coins_earned DESC);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_last_login ON users(last_login);

-- User upgrades table
CREATE TABLE user_upgrades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    upgrade_type VARCHAR(50) NOT NULL,
    level INT DEFAULT 0 CHECK (level >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_user_upgrade (user_id, upgrade_type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_upgrades_user_id ON user_upgrades(user_id);

-- Achievements definition table
CREATE TABLE achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    requirement_type VARCHAR(50) NOT NULL,
    requirement_value BIGINT NOT NULL,
    reward_coins BIGINT DEFAULT 0 CHECK (reward_coins >= 0),
    reward_multiplier DECIMAL(10,4) DEFAULT 1.0000 CHECK (reward_multiplier >= 1.0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_achievements_category ON achievements(category);
CREATE INDEX idx_achievements_active ON achievements(is_active);

-- User achievements table
CREATE TABLE user_achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    achievement_id INT NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_user_achievement (user_id, achievement_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_unlocked_at ON user_achievements(unlocked_at);

-- Friendships table
CREATE TABLE friendships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    friend_id INT NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_friendship (user_id, friend_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (user_id != friend_id)
);

CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);

-- Gifts table
CREATE TABLE gifts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    message TEXT,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'claimed', 'expired')),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    claimed_at TIMESTAMP NULL,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 7 DAY),
    
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (sender_id != receiver_id)
);

CREATE INDEX idx_gifts_sender_date ON gifts(sender_id, sent_at);
CREATE INDEX idx_gifts_receiver_status ON gifts(receiver_id, status);
CREATE INDEX idx_gifts_expires_at ON gifts(expires_at);

-- Events table for limited-time events
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL,
    multiplier DECIMAL(10,4) DEFAULT 1.0000 CHECK (multiplier >= 1.0),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (end_time > start_time)
);

CREATE INDEX idx_events_active_time ON events(is_active, start_time, end_time);

-- Game sessions table for anti-cheat tracking
CREATE TABLE game_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(36) DEFAULT (UUID()),
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    total_taps INT DEFAULT 0 CHECK (total_taps >= 0),
    total_earnings BIGINT DEFAULT 0 CHECK (total_earnings >= 0),
    suspicious_activity BOOLEAN DEFAULT false,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX idx_game_sessions_start_time ON game_sessions(start_time);
CREATE INDEX idx_game_sessions_suspicious ON game_sessions(suspicious_activity);

-- Tap events table for detailed anti-cheat analysis
CREATE TABLE tap_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_id INT,
    tap_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    earnings BIGINT NOT NULL CHECK (earnings > 0),
    is_golden_tap BOOLEAN DEFAULT false,
    client_timestamp BIGINT,
    server_validation BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_tap_events_user_timestamp ON tap_events(user_id, tap_timestamp);
CREATE INDEX idx_tap_events_session_id ON tap_events(session_id);

-- Daily login bonuses tracking
CREATE TABLE daily_bonuses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    bonus_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    streak_day INT NOT NULL CHECK (streak_day > 0),
    bonus_amount BIGINT NOT NULL CHECK (bonus_amount > 0),
    multiplier DECIMAL(10,4) NOT NULL CHECK (multiplier >= 1.0),
    claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_user_bonus_date (user_id, bonus_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_daily_bonuses_user_date ON daily_bonuses(user_id, bonus_date);

-- Function to calculate offline earnings (MySQL stored function)
DELIMITER //
CREATE FUNCTION calculate_offline_earnings(
    p_user_id INT,
    p_offline_hours DECIMAL(10,2) DEFAULT 4.0
) RETURNS BIGINT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_auto_clicker_rate INT DEFAULT 0;
    DECLARE v_offline_seconds DECIMAL(10,2);
    DECLARE v_max_offline_seconds DECIMAL(10,2) DEFAULT p_offline_hours * 3600;
    DECLARE v_earnings BIGINT DEFAULT 0;
    DECLARE v_last_offline TIMESTAMP;
    
    -- Get user's auto-clicker rate and last offline calculation
    SELECT auto_clicker_rate, last_offline_calculation 
    INTO v_auto_clicker_rate, v_last_offline
    FROM users WHERE id = p_user_id;
    
    -- Calculate offline seconds (capped at max)
    SET v_offline_seconds = LEAST(
        TIMESTAMPDIFF(SECOND, v_last_offline, NOW()),
        v_max_offline_seconds
    );
    
    -- Calculate earnings (auto-clicker rate per second * offline seconds)
    SET v_earnings = FLOOR(v_auto_clicker_rate * v_offline_seconds);
    
    RETURN GREATEST(v_earnings, 0);
END //
DELIMITER ;