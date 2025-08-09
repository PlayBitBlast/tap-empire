import React, { useState } from 'react';
import './Navigation.css';

const Navigation = ({ 
  currentScreen = 'game', 
  onScreenChange, 
  userCoins = 0,
  isCompact = false 
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigationItems = [
    {
      id: 'game',
      label: 'Game',
      icon: '🎮',
      description: 'Main game screen'
    },
    {
      id: 'upgrades',
      label: 'Upgrades',
      icon: '⚡',
      description: 'Purchase upgrades'
    },
    {
      id: 'friends',
      label: 'Friends',
      icon: '👥',
      description: 'Social features'
    },
    {
      id: 'leaderboard',
      label: 'Rankings',
      icon: '🏆',
      description: 'Leaderboards'
    },
    {
      id: 'achievements',
      label: 'Achievements',
      icon: '🏅',
      description: 'Your progress'
    },
    {
      id: 'prestige',
      label: 'Prestige',
      icon: '⭐',
      description: 'Reset for bonuses'
    }
  ];

  const handleNavClick = (screenId) => {
    onScreenChange?.(screenId);
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  if (isCompact) {
    return (
      <nav className="navigation navigation-compact">
        <div className="nav-header">
          <div className="nav-coins">
            <span className="coin-icon">🪙</span>
            <span className="coin-amount">{userCoins.toLocaleString()}</span>
          </div>
          <button 
            className={`nav-toggle ${isMenuOpen ? 'active' : ''}`}
            onClick={toggleMenu}
            aria-label="Toggle navigation menu"
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
        </div>
        
        <div className={`nav-menu ${isMenuOpen ? 'open' : ''}`}>
          {navigationItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${currentScreen === item.id ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
              title={item.description}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav className="navigation navigation-full">
      <div className="nav-header">
        <h1 className="nav-title">🏆 Tap Empire</h1>
        <div className="nav-coins">
          <span className="coin-icon">🪙</span>
          <span className="coin-amount">{userCoins.toLocaleString()}</span>
        </div>
      </div>
      
      <div className="nav-tabs">
        {navigationItems.map(item => (
          <button
            key={item.id}
            className={`nav-tab ${currentScreen === item.id ? 'active' : ''}`}
            onClick={() => handleNavClick(item.id)}
            title={item.description}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;