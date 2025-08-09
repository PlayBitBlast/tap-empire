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