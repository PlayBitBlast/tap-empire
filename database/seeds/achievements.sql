-- Achievement definitions for Tap Empire
-- These will be loaded during database seeding

INSERT INTO achievements (name, description, category, requirement_type, requirement_value, reward_coins, reward_multiplier) VALUES
-- Tapping achievements
('First Tap', 'Make your first tap!', 'tapping', 'total_taps', 1, 10, 1.0000),
('Tap Novice', 'Make 100 taps', 'tapping', 'total_taps', 100, 100, 1.0100),
('Tap Enthusiast', 'Make 1,000 taps', 'tapping', 'total_taps', 1000, 500, 1.0200),
('Tap Master', 'Make 10,000 taps', 'tapping', 'total_taps', 10000, 2000, 1.0500),
('Tap Legend', 'Make 100,000 taps', 'tapping', 'total_taps', 100000, 10000, 1.1000),

-- Coin earning achievements
('First Coin', 'Earn your first coin!', 'earnings', 'total_coins_earned', 1, 5, 1.0000),
('Coin Collector', 'Earn 1,000 coins', 'earnings', 'total_coins_earned', 1000, 100, 1.0100),
('Coin Hoarder', 'Earn 10,000 coins', 'earnings', 'total_coins_earned', 10000, 500, 1.0200),
('Coin Magnate', 'Earn 100,000 coins', 'earnings', 'total_coins_earned', 100000, 2500, 1.0300),
('Coin Emperor', 'Earn 1,000,000 coins', 'earnings', 'total_coins_earned', 1000000, 15000, 1.0500),
('Coin God', 'Earn 10,000,000 coins', 'earnings', 'total_coins_earned', 10000000, 100000, 1.1000),

-- Upgrade achievements
('First Upgrade', 'Purchase your first upgrade', 'upgrades', 'total_upgrades', 1, 50, 1.0100),
('Upgrade Seeker', 'Purchase 10 upgrades', 'upgrades', 'total_upgrades', 10, 200, 1.0200),
('Upgrade Master', 'Purchase 50 upgrades', 'upgrades', 'total_upgrades', 50, 1000, 1.0300),
('Upgrade Legend', 'Purchase 100 upgrades', 'upgrades', 'total_upgrades', 100, 5000, 1.0500),

-- Golden tap achievements
('Golden Touch', 'Get your first Golden Tap', 'golden_taps', 'golden_taps_count', 1, 100, 1.0100),
('Golden Streak', 'Get 10 Golden Taps', 'golden_taps', 'golden_taps_count', 10, 500, 1.0200),
('Golden Master', 'Get 100 Golden Taps', 'golden_taps', 'golden_taps_count', 100, 2500, 1.0300),

-- Social achievements
('Social Butterfly', 'Add your first friend', 'social', 'friends_count', 1, 100, 1.0100),
('Friend Collector', 'Add 10 friends', 'social', 'friends_count', 10, 500, 1.0200),
('Popular Player', 'Add 25 friends', 'social', 'friends_count', 25, 1500, 1.0300),

-- Gift achievements
('Generous Soul', 'Send your first gift', 'gifts', 'gifts_sent', 1, 50, 1.0100),
('Gift Giver', 'Send 10 gifts', 'gifts', 'gifts_sent', 10, 300, 1.0200),
('Santa Claus', 'Send 100 gifts', 'gifts', 'gifts_sent', 100, 2000, 1.0300),

-- Streak achievements
('Consistent Player', 'Maintain a 3-day login streak', 'streaks', 'max_login_streak', 3, 200, 1.0100),
('Dedicated Player', 'Maintain a 7-day login streak', 'streaks', 'max_login_streak', 7, 500, 1.0200),
('Loyal Player', 'Maintain a 30-day login streak', 'streaks', 'max_login_streak', 30, 3000, 1.0500),
('Devoted Player', 'Maintain a 100-day login streak', 'streaks', 'max_login_streak', 100, 15000, 1.1000),

-- Prestige achievements
('Prestige Pioneer', 'Reach your first prestige', 'prestige', 'prestige_level', 1, 5000, 1.1000),
('Prestige Master', 'Reach prestige level 5', 'prestige', 'prestige_level', 5, 25000, 1.2000),
('Prestige Legend', 'Reach prestige level 10', 'prestige', 'prestige_level', 10, 100000, 1.5000),

-- Speed achievements
('Speed Tapper', 'Tap 10 times in 1 second', 'speed', 'max_taps_per_second', 10, 500, 1.0200),
('Lightning Fingers', 'Tap 15 times in 1 second', 'speed', 'max_taps_per_second', 15, 1000, 1.0300),
('Superhuman Tapper', 'Tap 20 times in 1 second', 'speed', 'max_taps_per_second', 20, 2500, 1.0500),

-- Time-based achievements
('Early Bird', 'Play during morning hours (6-10 AM)', 'time', 'morning_sessions', 1, 200, 1.0100),
('Night Owl', 'Play during late hours (10 PM - 2 AM)', 'time', 'night_sessions', 1, 200, 1.0100),
('Weekend Warrior', 'Play during weekend events', 'time', 'weekend_events_participated', 1, 300, 1.0200),

-- Milestone achievements
('The Journey Begins', 'Complete the tutorial', 'milestones', 'tutorial_completed', 1, 100, 1.0100),
('Halfway There', 'Reach 50% of prestige requirement', 'milestones', 'prestige_progress', 500000, 2500, 1.0300),
('Almost There', 'Reach 90% of prestige requirement', 'milestones', 'prestige_progress', 900000, 5000, 1.0500);

-- Update the sequence to ensure proper ID generation
SELECT setval('achievements_id_seq', (SELECT MAX(id) FROM achievements));