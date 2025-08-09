CREATE OR REPLACE FUNCTION get_active_events()
RETURNS TABLE(
  id INTEGER,
  name VARCHAR(255),
  description TEXT,
  event_type VARCHAR(50),
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  multiplier NUMERIC(10,4),
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT e.id, e.name, e.description, e.event_type, e.start_time, e.end_time, e.multiplier, e.is_active
  FROM events e
  WHERE e.is_active = true
    AND NOW() >= e.start_time
    AND NOW() <= e.end_time
  ORDER BY e.start_time;
END;
$$ LANGUAGE plpgsql;