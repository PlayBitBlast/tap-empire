-- Create events table for limited-time events
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- 'weekend_multiplier', 'exclusive_upgrade', etc.
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  multiplier DECIMAL(10,2) DEFAULT 1.0,
  config JSONB DEFAULT '{}', -- Additional event configuration
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create event_upgrades table for exclusive upgrades during events
CREATE TABLE event_upgrades (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- 'tap_multiplier', 'auto_clicker', etc.
  cost BIGINT NOT NULL,
  benefit DECIMAL(10,2) NOT NULL,
  max_level INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create user_event_upgrades table to track user purchases
CREATE TABLE user_event_upgrades (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  event_upgrade_id INTEGER REFERENCES event_upgrades(id) ON DELETE CASCADE,
  level INTEGER DEFAULT 1,
  purchased_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, event_upgrade_id)
);

-- Create indexes for performance
CREATE INDEX idx_events_active_time ON events(is_active, start_time, end_time);
CREATE INDEX idx_event_upgrades_event_id ON event_upgrades(event_id);
CREATE INDEX idx_user_event_upgrades_user_id ON user_event_upgrades(user_id);
CREATE INDEX idx_user_event_upgrades_event_upgrade_id ON user_event_upgrades(event_upgrade_id);

-- Function to check if an event is currently active
CREATE OR REPLACE FUNCTION is_event_active(event_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  event_record RECORD;
BEGIN
  SELECT start_time, end_time, is_active 
  INTO event_record 
  FROM events 
  WHERE id = event_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  RETURN event_record.is_active 
    AND NOW() >= event_record.start_time 
    AND NOW() <= event_record.end_time;
END;
$$ LANGUAGE plpgsql;

-- Function to get active events
CREATE OR REPLACE FUNCTION get_active_events()
RETURNS TABLE(
  id INTEGER,
  name VARCHAR(255),
  description TEXT,
  type VARCHAR(50),
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  multiplier DECIMAL(10,2),
  config JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT e.id, e.name, e.description, e.type, e.start_time, e.end_time, e.multiplier, e.config
  FROM events e
  WHERE e.is_active = true
    AND NOW() >= e.start_time
    AND NOW() <= e.end_time
  ORDER BY e.start_time;
END;
$$ LANGUAGE plpgsql;