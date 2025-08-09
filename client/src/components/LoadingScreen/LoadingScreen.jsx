import React from 'react';
import './LoadingScreen.css';

/**
 * Loading screen component for authentication and app initialization
 */
const LoadingScreen = ({ message = 'Loading...', error = null, onRetry = null }) => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-logo">
          <div className="tap-button-loading">
            <div className="loading-pulse"></div>
          </div>
        </div>
        
        <h1 className="loading-title">Tap Empire</h1>
        
        {error ? (
          <div className="loading-error">
            <p className="error-message">{error}</p>
            {onRetry && (
              <button className="retry-button" onClick={onRetry}>
                Try Again
              </button>
            )}
          </div>
        ) : (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p className="loading-message">{message}</p>
          </div>
        )}
        
        <div className="loading-footer">
          <p>Connecting to Telegram...</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;