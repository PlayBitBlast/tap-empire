import React, { useState, useEffect } from 'react';
import './ResponsiveLayout.css';

const ResponsiveLayout = ({ 
  children, 
  navigation,
  showLoadingOverlay = false,
  loadingMessage = "Loading...",
  className = ""
}) => {
  const [screenSize, setScreenSize] = useState('desktop');
  const [orientation, setOrientation] = useState('portrait');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const updateScreenInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Determine screen size
      if (width <= 480) {
        setScreenSize('mobile');
      } else if (width <= 768) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
      
      // Determine orientation
      setOrientation(width > height ? 'landscape' : 'portrait');
      
      // Detect virtual keyboard on mobile (rough estimation)
      if (width <= 768) {
        const viewportHeight = window.visualViewport?.height || height;
        const isKeyboard = viewportHeight < height * 0.75;
        setIsKeyboardVisible(isKeyboard);
      }
    };

    updateScreenInfo();
    window.addEventListener('resize', updateScreenInfo);
    window.addEventListener('orientationchange', updateScreenInfo);
    
    // Visual viewport API for better keyboard detection
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateScreenInfo);
    }

    return () => {
      window.removeEventListener('resize', updateScreenInfo);
      window.removeEventListener('orientationchange', updateScreenInfo);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateScreenInfo);
      }
    };
  }, []);

  const layoutClasses = [
    'responsive-layout',
    `screen-${screenSize}`,
    `orientation-${orientation}`,
    isKeyboardVisible ? 'keyboard-visible' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={layoutClasses}>
      {navigation && (
        <div className="layout-navigation">
          {navigation}
        </div>
      )}
      
      <main className="layout-content">
        {children}
      </main>
      
      {showLoadingOverlay && (
        <div className="layout-loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner" role="progressbar" aria-label="Loading"></div>
            <p className="loading-message">{loadingMessage}</p>
          </div>
        </div>
      )}
      
      {/* Safe area indicators for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="safe-area-debug" data-testid="safe-area-debug">
          <div className="safe-area-indicator top"></div>
          <div className="safe-area-indicator bottom"></div>
          <div className="safe-area-indicator left"></div>
          <div className="safe-area-indicator right"></div>
        </div>
      )}
    </div>
  );
};

export default ResponsiveLayout;