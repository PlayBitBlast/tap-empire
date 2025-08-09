import React, { useState, useEffect } from 'react';
import './OfflineProgressModal.css';

/**
 * Modal component for displaying and collecting offline progress
 */
const OfflineProgressModal = ({ 
  isOpen, 
  onClose, 
  offlineData, 
  onCollect,
  isLoading = false 
}) => {
  const [isCollecting, setIsCollecting] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleCollect = async () => {
    if (isCollecting || !offlineData) return;

    setIsCollecting(true);
    try {
      await onCollect();
      onClose();
    } catch (error) {
      console.error('Error collecting offline progress:', error);
      // Error handling is done in parent component
    } finally {
      setIsCollecting(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !offlineData || !offlineData.shouldShow) {
    return null;
  }

  const { 
    title, 
    subtitle, 
    earnings, 
    formattedEarnings, 
    breakdown, 
    cappedMessage 
  } = offlineData;

  return (
    <div className="offline-progress-modal-overlay" onClick={handleBackdropClick}>
      <div className="offline-progress-modal">
        <div className="offline-progress-header">
          <h2 className="offline-progress-title">{title}</h2>
          <p className="offline-progress-subtitle">{subtitle}</p>
          <button 
            className="offline-progress-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="offline-progress-content">
          <div className="offline-progress-earnings">
            <div className="earnings-icon">💰</div>
            <div className="earnings-amount">
              <span className="earnings-number">{formattedEarnings}</span>
              <span className="earnings-label">Coins Earned</span>
            </div>
          </div>

          {cappedMessage && (
            <div className="offline-progress-capped">
              <span className="capped-icon">⏰</span>
              <span className="capped-text">{cappedMessage}</span>
            </div>
          )}

          <div className="offline-progress-breakdown">
            <button 
              className="breakdown-toggle"
              onClick={() => setShowBreakdown(!showBreakdown)}
            >
              <span>View Details</span>
              <span className={`breakdown-arrow ${showBreakdown ? 'expanded' : ''}`}>
                ▼
              </span>
            </button>

            {showBreakdown && (
              <div className="breakdown-details">
                <div className="breakdown-item">
                  <span className="breakdown-label">Time Away:</span>
                  <span className="breakdown-value">{breakdown.timeAway}</span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-label">Auto-Clicker Rate:</span>
                  <span className="breakdown-value">{breakdown.autoClickerRate}/sec</span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-label">Per Minute:</span>
                  <span className="breakdown-value">{breakdown.earningsPerMinute.toLocaleString()}</span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-label">Per Hour:</span>
                  <span className="breakdown-value">{breakdown.earningsPerHour.toLocaleString()}</span>
                </div>
                {breakdown.cappedAt && (
                  <div className="breakdown-item breakdown-cap">
                    <span className="breakdown-label">Max Offline Time:</span>
                    <span className="breakdown-value">{breakdown.maxOfflineHours}h</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="offline-progress-actions">
          <button 
            className="collect-button"
            onClick={handleCollect}
            disabled={isCollecting || isLoading}
          >
            {isCollecting ? (
              <>
                <span className="loading-spinner"></span>
                Collecting...
              </>
            ) : (
              <>
                <span className="collect-icon">💰</span>
                Collect {formattedEarnings}
              </>
            )}
          </button>
        </div>

        <div className="offline-progress-tip">
          <span className="tip-icon">💡</span>
          <span className="tip-text">
            Upgrade your Auto-Clickers to earn more while away!
          </span>
        </div>
      </div>
    </div>
  );
};

export default OfflineProgressModal;