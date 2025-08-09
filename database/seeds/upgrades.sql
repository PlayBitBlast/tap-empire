-- Upgrade configurations seed data
-- This data defines the available upgrade types and their base costs

-- Note: This is reference data for the application
-- The actual upgrade costs are calculated dynamically using the formula:
-- cost = base_cost * (scaling_factor ^ current_level)

-- Tap Multiplier Upgrades (increase coins per tap)
-- Base costs and scaling factors are defined in shared/constants/gameConfig.js

-- Auto-Clicker Upgrades (generate coins automatically)
-- Base costs and scaling factors are defined in shared/constants/gameConfig.js

-- This file serves as documentation for the upgrade system
-- The actual upgrade logic is handled in the application code

-- Example upgrade types that will be used:
-- 'tap_multiplier' - Increases coins earned per tap
-- 'auto_clicker_basic' - Basic auto-clicker (1 coin per second)
-- 'auto_clicker_advanced' - Advanced auto-clicker (5 coins per second)
-- 'auto_clicker_elite' - Elite auto-clicker (25 coins per second)
-- 'auto_clicker_master' - Master auto-clicker (100 coins per second)
-- 'auto_clicker_legendary' - Legendary auto-clicker (500 coins per second)

-- Prestige upgrades (permanent multipliers)
-- 'prestige_multiplier_2x' - 2x coin multiplier (costs prestige points)
-- 'prestige_multiplier_5x' - 5x coin multiplier (costs prestige points)
-- 'prestige_multiplier_10x' - 10x coin multiplier (costs prestige points)

-- The upgrade system is flexible and new upgrade types can be added
-- by updating the gameConfig.js file and the upgrade purchase logic