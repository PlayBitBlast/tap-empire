import React, { useState, useEffect } from 'react';
import './GoldenTapCelebration.css';

const GoldenTapCelebration = ({ 
  isVisible, 
  earnings, 
  onComplete,
  duration = 3000 
}) => {
  const [animationPhase, setAnimationPhase] = useState('enter');

  useEffect(() => {
    if (!isVisible) {
      setAnimationPhase('exit');
      return;
    }

    setAnimationPhase('enter');

    // Transition to main phase after enter animation
    const enterTimer = setTimeout(() => {
      setAnimationPhase('main');
    }, 500);

    // Start exit animation before completion
    const exitTimer = setTimeout(() => {
      setAnimationPhase('exit');
    }, duration - 500);

    // Complete the celebration
    const completeTimer = setTimeout(() => {
      if (onComplete) onComplete();
    }, duration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [isVisible, duration, onComplete]);

  if (!isVisible && animationPhase === 'exit') {
    return null;
  }

  return (
    <div className={`golden-tap-celebration ${animationPhase}`}>
      {/* Screen flash overlay */}
      <div className="screen-flash" />
      
      {/* Particle effects */}
      <div className="particles-container">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              '--delay': `${i * 0.1}s`,
              '--angle': `${(i * 18) + Math.random() * 36}deg`,
              '--distance': `${100 + Math.random() * 100}px`,
              '--size': `${4 + Math.random() * 8}px`
            }}
          />
        ))}
      </div>

      {/* Golden rays */}
      <div className="golden-rays">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="ray"
            style={{
              '--rotation': `${i * 45}deg`
            }}
          />
        ))}
      </div>

      {/* Main celebration content */}
      <div className="celebration-content">
        <div className="golden-tap-icon">✨</div>
        <div className="celebration-title">GOLDEN TAP!</div>
        <div className="earnings-display">
          <span className="earnings-amount">+{earnings.toLocaleString()}</span>
          <span className="earnings-label">COINS</span>
        </div>
        <div className="multiplier-badge">10x MULTIPLIER</div>
      </div>

      {/* Floating golden coins */}
      <div className="floating-coins">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="floating-coin"
            style={{
              '--delay': `${i * 0.15}s`,
              '--start-angle': `${i * 30}deg`,
              '--end-angle': `${(i * 30) + 180}deg`
            }}
          >
            🪙
          </div>
        ))}
      </div>
    </div>
  );
};

export default GoldenTapCelebration;