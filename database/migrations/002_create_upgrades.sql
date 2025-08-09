-- Migration: Create user upgrades table
-- Description: User upgrade levels and progression

-- User upgrades table
CREATE TABLE IF NOT EXISTS user_upgrades (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    upgrade_type VARCHAR(50) NOT NULL,
    level INTEGER DEFAULT 0 CHECK (level >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, upgrade_type)
);

-- Indexes for user_upgrades table
CREATE INDEX IF NOT EXISTS idx_user_upgrades_user_id ON user_upgrades(user_id);
CREATE INDEX IF NOT EXISTS idx_user_upgrades_type ON user_upgrades(upgrade_type);

-- Trigger for user_upgrades table
DROP TRIGGER IF EXISTS update_user_upgrades_updated_at ON user_upgrades;
CREATE TRIGGER update_user_upgrades_updated_at 
    BEFORE UPDATE ON user_upgrades
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();