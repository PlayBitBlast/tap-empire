import { useState, useEffect, useCallback, useRef } from 'react';
import AchievementService from '../services/achievementService';

/**
 * Custom hook for managing achievements
 */
const useAchievements = () => {
  const [achievements, setAchievements] = useState({});
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newAchievements, setNewAchievements] = useState([]);
  
  const achievementServiceRef = useRef(null);
  
  // Initialize achievement service
  useEffect(() => {
    if (!achievementServiceRef.current) {
      achievementServiceRef.current = new AchievementService();
    }
  }, []);

  /**
   * Load user achievements
   */
  const loadAchievements = useCallback(async () => {
    if (!achievementServiceRef.current) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const [achievementsData, statsData] = await Promise.all([
        achievementServiceRef.current.getUserAchievements(),
        achievementServiceRef.current.getUserAchievementStats()
      ]);
      
      setAchievements(achievementsData);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading achievements:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Track milestone and check for new achievements
   */
  const trackMilestone = useCallback(async (milestoneType, value = 1) => {
    if (!achievementServiceRef.current) return [];
    
    try {
      const newUnlocks = await achievementServiceRef.current.trackMilestone(milestoneType, value);
      
      if (newUnlocks.length > 0) {
        setNewAchievements(prev => [...prev, ...newUnlocks]);
        // Reload achievements to get updated progress
        await loadAchievements();
      }
      
      return newUnlocks;
    } catch (error) {
      console.error('Error tracking milestone:', error);
      return [];
    }
  }, [loadAchievements]);

  /**
   * Share achievement to Telegram
   */
  const shareAchievement = useCallback(async (achievementId) => {
    if (!achievementServiceRef.current) return null;
    
    try {
      return await achievementServiceRef.current.shareAchievement(achievementId);
    } catch (error) {
      console.error('Error sharing achievement:', error);
      throw error;
    }
  }, []);

  /**
   * Dismiss new achievement notification
   */
  const dismissAchievement = useCallback((achievementId) => {
    setNewAchievements(prev => 
      prev.filter(achievement => achievement.id !== achievementId)
    );
  }, []);

  /**
   * Clear all new achievement notifications
   */
  const clearNewAchievements = useCallback(() => {
    setNewAchievements([]);
  }, []);

  /**
   * Get achievement progress display data
   */
  const getProgressDisplay = useCallback((achievement) => {
    if (!achievementServiceRef.current) return null;
    return achievementServiceRef.current.getProgressDisplay(achievement);
  }, []);

  /**
   * Get category icon
   */
  const getCategoryIcon = useCallback((category) => {
    if (!achievementServiceRef.current) return '🏆';
    return achievementServiceRef.current.getCategoryIcon(category);
  }, []);

  /**
   * Get achievement rarity color
   */
  const getRarityColor = useCallback((unlockPercentage) => {
    if (!achievementServiceRef.current) return 'common';
    return achievementServiceRef.current.getRarityColor(unlockPercentage);
  }, []);

  /**
   * Get achievements by category
   */
  const getAchievementsByCategory = useCallback((category) => {
    return achievements[category]?.achievements || [];
  }, [achievements]);

  /**
   * Get unlocked achievements count
   */
  const getUnlockedCount = useCallback(() => {
    let count = 0;
    Object.values(achievements).forEach(category => {
      category.achievements.forEach(achievement => {
        if (achievement.isUnlocked) count++;
      });
    });
    return count;
  }, [achievements]);

  /**
   * Get total achievements count
   */
  const getTotalCount = useCallback(() => {
    let count = 0;
    Object.values(achievements).forEach(category => {
      count += category.achievements.length;
    });
    return count;
  }, [achievements]);

  /**
   * Get completion percentage
   */
  const getCompletionPercentage = useCallback(() => {
    const total = getTotalCount();
    const unlocked = getUnlockedCount();
    return total > 0 ? Math.round((unlocked / total) * 100) : 0;
  }, [getTotalCount, getUnlockedCount]);

  /**
   * Check if user has specific achievement
   */
  const hasAchievement = useCallback((achievementId) => {
    for (const category of Object.values(achievements)) {
      const achievement = category.achievements.find(a => a.id === achievementId);
      if (achievement && achievement.isUnlocked) {
        return true;
      }
    }
    return false;
  }, [achievements]);

  /**
   * Get recent achievements (last 5 unlocked)
   */
  const getRecentAchievements = useCallback(() => {
    const allAchievements = [];
    Object.values(achievements).forEach(category => {
      category.achievements.forEach(achievement => {
        if (achievement.isUnlocked && achievement.unlocked_at) {
          allAchievements.push(achievement);
        }
      });
    });
    
    return allAchievements
      .sort((a, b) => new Date(b.unlocked_at) - new Date(a.unlocked_at))
      .slice(0, 5);
  }, [achievements]);

  /**
   * Get next achievements to unlock (closest to completion)
   */
  const getNextAchievements = useCallback((limit = 3) => {
    const nextAchievements = [];
    
    Object.values(achievements).forEach(category => {
      category.achievements.forEach(achievement => {
        if (!achievement.isUnlocked && achievement.progressPercentage > 0) {
          nextAchievements.push(achievement);
        }
      });
    });
    
    return nextAchievements
      .sort((a, b) => b.progressPercentage - a.progressPercentage)
      .slice(0, limit);
  }, [achievements]);

  // Load achievements on mount
  useEffect(() => {
    loadAchievements();
  }, [loadAchievements]);

  // Set up achievement event listener
  useEffect(() => {
    if (!achievementServiceRef.current) return;
    
    const handleAchievementEvent = (eventType, data) => {
      if (eventType === 'achievement_unlocked') {
        setNewAchievements(prev => [...prev, ...data]);
        // Reload achievements to get updated data
        loadAchievements();
      }
    };
    
    achievementServiceRef.current.addAchievementListener(handleAchievementEvent);
    
    return () => {
      achievementServiceRef.current.removeAchievementListener(handleAchievementEvent);
    };
  }, [loadAchievements]);

  return {
    // Data
    achievements,
    stats,
    newAchievements,
    loading,
    error,
    
    // Actions
    loadAchievements,
    trackMilestone,
    shareAchievement,
    dismissAchievement,
    clearNewAchievements,
    
    // Utilities
    getProgressDisplay,
    getCategoryIcon,
    getRarityColor,
    getAchievementsByCategory,
    getUnlockedCount,
    getTotalCount,
    getCompletionPercentage,
    hasAchievement,
    getRecentAchievements,
    getNextAchievements
  };
};

export default useAchievements;