import React from 'react';
import './ProgressIndicator.css';

const ProgressIndicator = ({
  type = 'circular', // 'circular', 'linear', 'dots'
  progress = 0, // 0-100
  size = 'medium', // 'small', 'medium', 'large'
  color = 'primary', // 'primary', 'secondary', 'success', 'warning', 'error'
  showPercentage = false,
  label = '',
  animated = true,
  className = ''
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  
  const baseClasses = [
    'progress-indicator',
    `progress-${type}`,
    `progress-${size}`,
    `progress-${color}`,
    animated ? 'animated' : '',
    className
  ].filter(Boolean).join(' ');

  const renderCircularProgress = () => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

    return (
      <div className={baseClasses}>
        <svg className="progress-circle" viewBox="0 0 100 100">
          <circle
            className="progress-track"
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="8"
          />
          <circle
            className="progress-fill"
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div className="progress-content">
          {showPercentage && (
            <span className="progress-percentage">{Math.round(clampedProgress)}%</span>
          )}
          {label && <span className="progress-label">{label}</span>}
        </div>
      </div>
    );
  };

  const renderLinearProgress = () => {
    return (
      <div className={baseClasses}>
        {label && <div className="progress-label">{label}</div>}
        <div className="progress-track">
          <div 
            className="progress-fill"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
        {showPercentage && (
          <div className="progress-percentage">{Math.round(clampedProgress)}%</div>
        )}
      </div>
    );
  };

  const renderDotsProgress = () => {
    const totalDots = 8;
    const activeDots = Math.round((clampedProgress / 100) * totalDots);

    return (
      <div className={baseClasses}>
        {label && <div className="progress-label">{label}</div>}
        <div className="progress-dots">
          {Array.from({ length: totalDots }, (_, index) => (
            <div
              key={index}
              className={`progress-dot ${index < activeDots ? 'active' : ''}`}
              style={{
                animationDelay: animated ? `${index * 0.1}s` : '0s'
              }}
            />
          ))}
        </div>
        {showPercentage && (
          <div className="progress-percentage">{Math.round(clampedProgress)}%</div>
        )}
      </div>
    );
  };

  switch (type) {
    case 'linear':
      return renderLinearProgress();
    case 'dots':
      return renderDotsProgress();
    case 'circular':
    default:
      return renderCircularProgress();
  }
};

// Skeleton loader component for loading states
export const SkeletonLoader = ({ 
  type = 'text', // 'text', 'circle', 'rectangle'
  width = '100%',
  height = '1rem',
  className = ''
}) => {
  const skeletonClasses = [
    'skeleton-loader',
    `skeleton-${type}`,
    className
  ].filter(Boolean).join(' ');

  const style = {
    width,
    height: type === 'circle' ? width : height
  };

  return <div className={skeletonClasses} style={style} />;
};

// Pulse loader for simple loading states
export const PulseLoader = ({ 
  size = 'medium',
  color = 'primary',
  className = ''
}) => {
  const pulseClasses = [
    'pulse-loader',
    `pulse-${size}`,
    `pulse-${color}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={pulseClasses}>
      <div className="pulse-dot"></div>
      <div className="pulse-dot"></div>
      <div className="pulse-dot"></div>
    </div>
  );
};

export default ProgressIndicator;