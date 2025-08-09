-- Migration: Create database functions
-- Description: Utility functions for game calculations

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
    v_last_calculation TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get user's auto-clicker rate and last calculation time
    SELECT auto_clicker_rate, last_offline_calculation 
    INTO v_auto_clicker_rate, v_last_calculation
    FROM users WHERE id = p_user_id;
    
    -- If no user found, return 0
    IF v_auto_clicker_rate IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Calculate offline seconds (capped at max)
    v_offline_seconds := LEAST(
        EXTRACT(EPOCH FROM (NOW() - v_last_calculation)),
        v_max_offline_seconds
    );
    
    -- Calculate earnings (auto-clicker rate per second * offline seconds)
    v_earnings := FLOOR(v_auto_clicker_rate * v_offline_seconds);
    
    RETURN GREATEST(v_earnings, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get user's current multipliers from achievements
CREATE OR REPLACE FUNCTION get_user_multiplier(p_user_id INTEGER) 
RETURNS DECIMAL(10,4) AS $$
DECLARE
    v_multiplier DECIMAL(10,4) := 1.0000;
BEGIN
    -- Calculate total multiplier from unlocked achievements
    SELECT COALESCE(EXP(SUM(LN(a.reward_multiplier))), 1.0000)
    INTO v_multiplier
    FROM user_achievements ua
    JOIN achievements a ON ua.achievement_id = a.id
    WHERE ua.user_id = p_user_id AND a.reward_multiplier > 1.0;
    
    RETURN v_multiplier;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate prestige points from total coins
CREATE OR REPLACE FUNCTION calculate_prestige_points(p_total_coins BIGINT) 
RETURNS INTEGER AS $$
BEGIN
    -- Prestige points = sqrt(total_coins / 1000000) * 10
    -- This gives diminishing returns for higher coin amounts
    RETURN FLOOR(SQRT(GREATEST(p_total_coins, 0) / 1000000.0) * 10);
END;
$$ LANGUAGE plpgsql;

-- Function to get upgrade cost with exponential scaling
CREATE OR REPLACE FUNCTION calculate_upgrade_cost(
    p_base_cost BIGINT,
    p_current_level INTEGER,
    p_scaling_factor DECIMAL DEFAULT 1.15
) RETURNS BIGINT AS $$
BEGIN
    -- Cost = base_cost * (scaling_factor ^ current_level)
    RETURN FLOOR(p_base_cost * POWER(p_scaling_factor, p_current_level));
END;
$$ LANGUAGE plpgsql;

-- Function to validate tap rate for anti-cheat
CREATE OR REPLACE FUNCTION validate_tap_rate(
    p_user_id INTEGER,
    p_session_id INTEGER,
    p_max_taps_per_second INTEGER DEFAULT 20
) RETURNS BOOLEAN AS $$
DECLARE
    v_recent_taps INTEGER;
BEGIN
    -- Count taps in the last second
    SELECT COUNT(*)
    INTO v_recent_taps
    FROM tap_events
    WHERE user_id = p_user_id
      AND session_id = p_session_id
      AND tap_timestamp >= NOW() - INTERVAL '1 second';
    
    RETURN v_recent_taps <= p_max_taps_per_second;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired gifts
CREATE OR REPLACE FUNCTION cleanup_expired_gifts() 
RETURNS INTEGER AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    -- Mark expired gifts
    UPDATE gifts
    SET status = 'expired'
    WHERE status = 'sent' 
      AND expires_at <= NOW();
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get leaderboard rank for a user
CREATE OR REPLACE FUNCTION get_user_leaderboard_rank(p_user_id INTEGER) 
RETURNS INTEGER AS $$
DECLARE
    v_rank INTEGER;
BEGIN
    SELECT rank INTO v_rank
    FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY total_coins_earned DESC) as rank
        FROM users 
        WHERE is_active = true AND is_banned = false
    ) ranked_users
    WHERE id = p_user_id;
    
    RETURN COALESCE(v_rank, 0);
END;
$$ LANGUAGE plpgsql;