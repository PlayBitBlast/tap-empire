-- Add anti-cheat related columns to users table
-- Migration 007: Add anti-cheat columns

-- Add flagging columns for suspicious activity
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS flag_reason VARCHAR(100),
ADD COLUMN IF NOT EXISTS flag_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Add indexes for flagged users
CREATE INDEX IF NOT EXISTS idx_users_flagged ON users(is_flagged) WHERE is_flagged = true;
CREATE INDEX IF NOT EXISTS idx_users_admin ON users(is_admin) WHERE is_admin = true;

-- Create suspicious activity log table
CREATE TABLE IF NOT EXISTS suspicious_activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    details JSONB NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by INTEGER REFERENCES users(id)
);

-- Indexes for suspicious activities
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_user_id ON suspicious_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_type ON suspicious_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_severity ON suspicious_activities(severity);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_unresolved ON suspicious_activities(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_created_at ON suspicious_activities(created_at);

-- Create game action logs table for detailed tracking
CREATE TABLE IF NOT EXISTS game_action_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    action_data JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    session_id UUID
);

-- Indexes for game action logs
CREATE INDEX IF NOT EXISTS idx_game_action_logs_user_id ON game_action_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_game_action_logs_action_type ON game_action_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_game_action_logs_timestamp ON game_action_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_game_action_logs_session_id ON game_action_logs(session_id);

-- Partition game_action_logs by month for better performance (optional)
-- This would be implemented in production for better performance with large datasets

-- Add comments for documentation
COMMENT ON COLUMN users.is_flagged IS 'Whether the user account has been flagged for suspicious activity';
COMMENT ON COLUMN users.flag_reason IS 'Reason for flagging the account';
COMMENT ON COLUMN users.flag_timestamp IS 'When the account was flagged';
COMMENT ON COLUMN users.is_admin IS 'Whether the user has admin privileges';

COMMENT ON TABLE suspicious_activities IS 'Log of suspicious activities detected by anti-cheat system';
COMMENT ON TABLE game_action_logs IS 'Detailed log of all game actions for analysis and debugging';