-- Create user_stats table for tracking achievement milestones
CREATE TABLE IF NOT EXISTS user_stats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Tapping statistics
  total_taps BIGINT DEFAULT 0,
  golden_taps_count INTEGER DEFAULT 0,
  max_taps_per_second INTEGER DEFAULT 0,
  
  -- Social statistics
  gifts_sent INTEGER DEFAULT 0,
  friends_invited INTEGER DEFAULT 0,
  
  -- Streak statistics
  max_login_streak INTEGER DEFAULT 0,
  current_login_streak INTEGER DEFAULT 0,
  
  -- Progress milestones
  tutorial_completed INTEGER DEFAULT 0,
  first_upgrade_purchased BOOLEAN DEFAULT FALSE,
  first_prestige_reached BOOLEAN DEFAULT FALSE,
  
  -- Time-based statistics
  morning_sessions INTEGER DEFAULT 0,
  night_sessions INTEGER DEFAULT 0,
  weekend_events_participated INTEGER DEFAULT 0,
  
  -- Performance statistics
  highest_coins_per_second DECIMAL(15,2) DEFAULT 0,
  fastest_million_coins_time INTEGER DEFAULT NULL, -- seconds to reach 1M coins
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_total_taps ON user_stats(total_taps);
CREATE INDEX IF NOT EXISTS idx_user_stats_golden_taps ON user_stats(golden_taps_count);
CREATE INDEX IF NOT EXISTS idx_user_stats_max_streak ON user_stats(max_login_streak);

-- Add achievement_multiplier column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS achievement_multiplier DECIMAL(10,4) DEFAULT 1.0000;

-- Create index for achievement multiplier
CREATE INDEX IF NOT EXISTS idx_users_achievement_multiplier ON users(achievement_multiplier);

-- Create function to automatically create user_stats record when user is created
CREATE OR REPLACE FUNCTION create_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create user_stats record
DROP TRIGGER IF EXISTS trigger_create_user_stats ON users;
CREATE TRIGGER trigger_create_user_stats
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_stats();

-- Create function to update user_stats updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_stats_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update timestamp
DROP TRIGGER IF EXISTS trigger_update_user_stats_timestamp ON user_stats;
CREATE TRIGGER trigger_update_user_stats_timestamp
  BEFORE UPDATE ON user_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_timestamp();

-- Populate user_stats for existing users
INSERT INTO user_stats (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM user_stats)
ON CONFLICT (user_id) DO NOTHING;