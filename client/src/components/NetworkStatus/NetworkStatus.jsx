import React, { useState, useEffect } from 'react';
import './NetworkStatus.css';

const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsReconnecting(false);
      setShowStatus(true);
      
      // Hide status after 3 seconds when back online
      setTimeout(() => setShowStatus(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsReconnecting(false);
      setShowStatus(true);
    };

    // Custom event for reconnecting state
    const handleReconnecting = () => {
      setIsReconnecting(true);
      setShowStatus(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('reconnecting', handleReconnecting);

    // Show status initially if offline
    if (!navigator.onLine) {
      setShowStatus(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('reconnecting', handleReconnecting);
    };
  }, []);

  if (!showStatus) return null;

  const getStatusText = () => {
    if (isReconnecting) return 'Reconnecting...';
    if (isOnline) return 'Back Online';
    return 'Offline';
  };

  const getStatusClass = () => {
    if (isReconnecting) return 'reconnecting';
    if (isOnline) return 'online';
    return 'offline';
  };

  return (
    <div className={`network-status ${getStatusClass()}`}>
      {getStatusText()}
    </div>
  );
};

export default NetworkStatus;