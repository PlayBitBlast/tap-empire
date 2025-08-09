import React, { useState, useEffect } from 'react';
import useAchievements from '../../hooks/useAchievements';
import AchievementCelebration from '../AchievementCelebration/AchievementCelebration';
import './AchievementsPanel.css';

/**
 * Main achievements panel component
 */
const AchievementsPanel = ({ isVisible, onClose }) => {
  const {
    achievements,
    stats,
    newAchievements,
    loading,
    error,
    shareAchievement,
    dismissAchievement,
    getProgressDisplay,
    getCategoryIcon,
    getCompletionPercentage,
    getRecentAchievements,
    getNextAchievements
  } = useAchievements();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [celebrationAchievement, setCelebrationAchievement] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // Show celebration for new achievements
  useEffect(() => {
    if (newAchievements.length > 0 && !showCelebration) {
      setCelebrationAchievement(newAchievements[0]);
      setShowCelebration(true);
    }
  }, [newAchievements, showCelebration]);

  const handleCelebrationClose = () => {
    setShowCelebration(false);
    if (celebrationAchievement) {
      dismissAchievement(celebrationAchievement.id);
    }
    setCelebrationAchievement(null);
  };

  const handleShare = async (achievementId) => {
    try {
      await shareAchievement(achievementId);
    } catch (error) {
      console.error('Error sharing achievement:', error);
    }
  };

  const getFilteredAchievements = () => {
    if (selectedCategory === 'all') {
      return achievements;
    }
    
    if (selectedCategory === 'unlocked') {
      const filtered = {};
      Object.entries(achievements).forEach(([category, data]) => {
        const unlockedAchievements = data.achievements.filter(a => a.isUnlocked);
        if (unlockedAchievements.length > 0) {
          filtered[category] = {
            ...data,
            achievements: unlockedAchievements
          };
        }
      });
      return filtered;
    }
    
    if (selectedCategory === 'locked') {
      const filtered = {};
      Object.entries(achievements).forEach(([category, data]) => {
        const lockedAchievements = data.achievements.filter(a => !a.isUnlocked);
        if (lockedAchievements.length > 0) {
          filtered[category] = {
            ...data,
            achievements: lockedAchievements
          };
        }
      });
      return filtered;
    }
    
    return achievements[selectedCategory] ? { [selectedCategory]: achievements[selectedCategory] } : {};
  };

  const getRarityClass = (unlockPercentage) => {
    if (unlockPercentage >= 50) return 'common';
    if (unlockPercentage >= 20) return 'uncommon';
    if (unlockPercentage >= 5) return 'rare';
    if (unlockPercentage >= 1) return 'epic';
    return 'legendary';
  };

  if (!isVisible) return null;

  return (
    <>
      <div className="achievements-panel-overlay" onClick={onClose}>
        <div className="achievements-panel" onClick={e => e.stopPropagation()}>
          <div className="achievements-header">
            <h2>🏆 Achievements</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>

          {loading && (
            <div className="achievements-loading">
              <div className="loading-spinner"></div>
              <p>Loading achievements...</p>
            </div>
          )}

          {error && (
            <div className="achievements-error">
              <p>Error loading achievements: {error}</p>
              <button onClick={() => window.location.reload()}>Retry</button>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Stats Overview */}
              {stats && (
                <div className="achievements-stats">
                  <div className="stat-item">
                    <div className="stat-value">{stats.unlocked_achievements || 0}</div>
                    <div className="stat-label">Unlocked</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{stats.total_achievements || 0}</div>
                    <div className="stat-label">Total</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{getCompletionPercentage()}%</div>
                    <div className="stat-label">Complete</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{stats.total_reward_coins?.toLocaleString() || 0}</div>
                    <div className="stat-label">Coins Earned</div>
                  </div>
                </div>
              )}

              {/* Category Filter */}
              <div className="achievements-filters">
                <button 
                  className={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('all')}
                >
                  All
                </button>
                <button 
                  className={`filter-btn ${selectedCategory === 'unlocked' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('unlocked')}
                >
                  Unlocked
                </button>
                <button 
                  className={`filter-btn ${selectedCategory === 'locked' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('locked')}
                >
                  Locked
                </button>
                {Object.keys(achievements).map(category => (
                  <button
                    key={category}
                    className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {getCategoryIcon(category)} {achievements[category]?.name || category}
                  </button>
                ))}
              </div>

              {/* Quick Stats */}
              <div className="quick-stats">
                <div className="quick-stat-section">
                  <h4>🔥 Recent Achievements</h4>
                  <div className="recent-achievements">
                    {getRecentAchievements().map(achievement => (
                      <div key={achievement.id} className="recent-achievement">
                        <span className="achievement-icon">
                          {getCategoryIcon(achievement.category)}
                        </span>
                        <span className="achievement-name">{achievement.name}</span>
                      </div>
                    ))}
                    {getRecentAchievements().length === 0 && (
                      <p className="no-achievements">No achievements unlocked yet</p>
                    )}
                  </div>
                </div>

                <div className="quick-stat-section">
                  <h4>🎯 Next Goals</h4>
                  <div className="next-achievements">
                    {getNextAchievements().map(achievement => {
                      const progress = getProgressDisplay(achievement);
                      return (
                        <div key={achievement.id} className="next-achievement">
                          <span className="achievement-icon">
                            {getCategoryIcon(achievement.category)}
                          </span>
                          <div className="achievement-info">
                            <span className="achievement-name">{achievement.name}</span>
                            <div className="progress-bar">
                              <div 
                                className="progress-fill" 
                                style={{ width: `${progress.percentage}%` }}
                              ></div>
                            </div>
                            <span className="progress-text">
                              {progress.current} / {progress.required} ({progress.percentage}%)
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {getNextAchievements().length === 0 && (
                      <p className="no-achievements">All achievements unlocked!</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Achievements List */}
              <div className="achievements-content">
                {Object.entries(getFilteredAchievements()).map(([category, categoryData]) => (
                  <div key={category} className="achievement-category">
                    <div className="category-header">
                      <h3>
                        {getCategoryIcon(category)} {categoryData.name}
                      </h3>
                      <span className="category-count">
                        {categoryData.achievements.filter(a => a.isUnlocked).length} / {categoryData.achievements.length}
                      </span>
                    </div>
                    
                    <div className="achievements-grid">
                      {categoryData.achievements.map(achievement => {
                        const progress = getProgressDisplay(achievement);
                        const rarityClass = getRarityClass(achievement.unlock_percentage || 0);
                        
                        return (
                          <div 
                            key={achievement.id} 
                            className={`achievement-card ${achievement.isUnlocked ? 'unlocked' : 'locked'} ${rarityClass}`}
                          >
                            <div className="achievement-card-header">
                              <div className="achievement-icon">
                                {getCategoryIcon(achievement.category)}
                              </div>
                              {achievement.isUnlocked && (
                                <button 
                                  className="share-btn"
                                  onClick={() => handleShare(achievement.id)}
                                  title="Share achievement"
                                >
                                  📤
                                </button>
                              )}
                            </div>
                            
                            <div className="achievement-info">
                              <h4 className="achievement-title">{achievement.name}</h4>
                              <p className="achievement-desc">{achievement.description}</p>
                              
                              {!achievement.isUnlocked && (
                                <div className="achievement-progress">
                                  <div className="progress-bar">
                                    <div 
                                      className="progress-fill" 
                                      style={{ width: `${progress.percentage}%` }}
                                    ></div>
                                  </div>
                                  <div className="progress-text">
                                    {progress.current} / {progress.required}
                                  </div>
                                </div>
                              )}
                              
                              {achievement.isUnlocked && achievement.unlocked_at && (
                                <div className="unlock-date">
                                  Unlocked: {new Date(achievement.unlocked_at).toLocaleDateString()}
                                </div>
                              )}
                              
                              <div className="achievement-rewards">
                                {achievement.reward_coins > 0 && (
                                  <span className="reward">💰 {achievement.reward_coins.toLocaleString()}</span>
                                )}
                                {achievement.reward_multiplier > 1.0 && (
                                  <span className="reward">
                                    ⚡ +{((achievement.reward_multiplier - 1) * 100).toFixed(1)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                
                {Object.keys(getFilteredAchievements()).length === 0 && (
                  <div className="no-achievements-message">
                    <p>No achievements found for the selected filter.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Achievement Celebration Modal */}
      <AchievementCelebration
        achievement={celebrationAchievement}
        isVisible={showCelebration}
        onClose={handleCelebrationClose}
        onShare={handleShare}
      />
    </>
  );
};

export default AchievementsPanel;