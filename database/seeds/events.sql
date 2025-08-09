-- Seed data for events system
-- This creates sample events for testing and demonstration

-- Weekend multiplier event (recurring)
INSERT INTO events (name, description, type, start_time, end_time, multiplier, config) VALUES
(
  'Weekend Boost',
  'Double coins for the entire weekend! Tap away and earn twice as much.',
  'weekend_multiplier',
  DATE_TRUNC('week', NOW()) + INTERVAL '5 days' + INTERVAL '18 hours', -- Next Friday 6 PM
  DATE_TRUNC('week', NOW()) + INTERVAL '7 days' + INTERVAL '23 hours 59 minutes', -- Sunday 11:59 PM
  2.0,
  '{"recurring": true, "recurrence_pattern": "weekly", "auto_create": true}'
);

-- Special holiday event
INSERT INTO events (name, description, type, start_time, end_time, multiplier, config) VALUES
(
  'Holiday Celebration',
  'Special holiday event with exclusive upgrades and 3x coin multiplier!',
  'global_multiplier',
  NOW() + INTERVAL '1 hour', -- Starts in 1 hour
  NOW() + INTERVAL '3 days', -- Lasts 3 days
  3.0,
  '{"theme": "holiday", "special_effects": true}'
);

-- Exclusive upgrade event
INSERT INTO events (name, description, type, start_time, end_time, multiplier, config) VALUES
(
  'Power-Up Paradise',
  'Exclusive upgrades available for a limited time! Get them before they disappear.',
  'exclusive_upgrade',
  NOW() + INTERVAL '2 hours', -- Starts in 2 hours
  NOW() + INTERVAL '2 days', -- Lasts 2 days
  1.0,
  '{"exclusive_upgrades": true, "max_purchases": 5}'
);

-- Sample event upgrades for the exclusive upgrade event
INSERT INTO event_upgrades (event_id, name, description, type, cost, benefit, max_level) VALUES
(
  (SELECT id FROM events WHERE name = 'Power-Up Paradise'),
  'Mega Tap Booster',
  'Increases tap earnings by 50% for the duration of the event',
  'tap_multiplier',
  50000,
  0.5,
  3
),
(
  (SELECT id FROM events WHERE name = 'Power-Up Paradise'),
  'Auto-Clicker Overdrive',
  'Boosts auto-clicker earnings by 100%',
  'auto_clicker_multiplier',
  100000,
  1.0,
  2
),
(
  (SELECT id FROM events WHERE name = 'Power-Up Paradise'),
  'Golden Touch',
  'Increases Golden Tap chance by 1%',
  'special_bonus',
  200000,
  0.01,
  1
);

-- Sample event upgrades for holiday event
INSERT INTO event_upgrades (event_id, name, description, type, cost, benefit, max_level) VALUES
(
  (SELECT id FROM events WHERE name = 'Holiday Celebration'),
  'Holiday Spirit',
  'Special holiday multiplier that stacks with event bonus',
  'tap_multiplier',
  75000,
  0.25,
  5
),
(
  (SELECT id FROM events WHERE name = 'Holiday Celebration'),
  'Festive Auto-Clicker',
  'Holiday-themed auto-clicker with bonus earnings',
  'auto_clicker',
  150000,
  10,
  3
);

-- Future event for testing upcoming events
INSERT INTO events (name, description, type, start_time, end_time, multiplier, config) VALUES
(
  'Mega Monday',
  'Start your week right with 4x coins every Monday!',
  'global_multiplier',
  DATE_TRUNC('week', NOW()) + INTERVAL '1 week' + INTERVAL '1 day', -- Next Monday
  DATE_TRUNC('week', NOW()) + INTERVAL '1 week' + INTERVAL '1 day' + INTERVAL '23 hours 59 minutes', -- End of Monday
  4.0,
  '{"recurring": true, "recurrence_pattern": "weekly", "day_of_week": 1}'
);