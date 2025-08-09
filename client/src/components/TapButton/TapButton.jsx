import React, { useState, useCallback, useRef, useEffect } from 'react';
import GoldenTapCelebration from '../GoldenTapCelebration/GoldenTapCelebration';
import soundManager from '../../utils/soundManager';
import { TouchHandler, ViewportUtils, PerformanceUtils } from '../../utils/touchOptimization';
import './TapButton.css';

const TapButton = ({ 
  onTap, 
  isGoldenTap = false, 
  disabled = false,
  coinsPerTap = 1,
  className = '' 
}) => {
  const [animations, setAnimations] = useState([]);
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState([]);
  const [showGoldenCelebration, setShowGoldenCelebration] = useState(false);
  const [lastGoldenTapEarnings, setLastGoldenTapEarnings] = useState(0);
  const [isMobile, setIsMobile] = useState(ViewportUtils.isMobile());
  const buttonRef = useRef(null);
  const animationIdRef = useRef(0);
  const touchHandlerRef = useRef(null);
  const lastTapTimeRef = useRef(0);

  // Throttled tap handler to prevent excessive tapping
  const handleTap = useCallback(PerformanceUtils.throttle((tapData) => {
    if (disabled) return;

    const now = Date.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;
    
    // Prevent too rapid tapping (max 20 taps per second)
    if (timeSinceLastTap < 50) return;
    
    lastTapTimeRef.current = now;

    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calculate tap position relative to button center
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const x = tapData.x || centerX;
    const y = tapData.y || centerY;

    // Create ripple effect with performance optimization
    if (!PerformanceUtils.prefersReducedMotion()) {
      const rippleId = Date.now() + Math.random();
      const newRipple = {
        id: rippleId,
        x: x,
        y: y,
        startTime: Date.now()
      };
      
      setRipples(prev => [...prev, newRipple]);
      
      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== rippleId));
      }, 600);
    }

    // Create floating coin animation
    const animationId = ++animationIdRef.current;
    const floatingCoin = {
      id: animationId,
      x: x - centerX, // Relative to center
      y: y - centerY, // Relative to center
      value: coinsPerTap,
      isGolden: isGoldenTap,
      startTime: Date.now(),
      duration: isMobile ? 1200 : 1500 // Shorter on mobile
    };

    setAnimations(prev => [...prev, floatingCoin]);

    // Remove animation after duration
    setTimeout(() => {
      setAnimations(prev => prev.filter(anim => anim.id !== animationId));
    }, floatingCoin.duration);

    // Call the tap handler with position data
    if (onTap) {
      const tapResult = onTap({
        position: { x, y },
        centerOffset: { x: x - centerX, y: y - centerY },
        timestamp: now
      });

      // Handle golden tap celebration and sound effects
      if (tapResult && tapResult.isGoldenTap) {
        setLastGoldenTapEarnings(tapResult.earnings);
        setShowGoldenCelebration(true);
        soundManager.playGoldenTapSound();
      } else {
        soundManager.playNormalTapSound();
      }
    }
  }, 50), [disabled, onTap, coinsPerTap, isGoldenTap, isMobile]);

  // Initialize touch handler for mobile optimization
  useEffect(() => {
    if (!buttonRef.current) return;

    // Update mobile state
    const cleanup = ViewportUtils.onViewportChange((viewport) => {
      setIsMobile(viewport.width <= 768);
    });

    // Initialize touch handler for mobile devices
    if (ViewportUtils.isMobile()) {
      touchHandlerRef.current = new TouchHandler(buttonRef.current, {
        tapThreshold: 15,
        longPressDelay: 600,
        doubleTapDelay: 300,
        preventContextMenu: true,
        enableHapticFeedback: true
      });

      // Handle tap events
      touchHandlerRef.current.on('tap', (tapData) => {
        if (!disabled) {
          setIsPressed(true);
          handleTap(tapData);
          setTimeout(() => setIsPressed(false), 100);
        }
      });

      // Handle long press for potential future features
      touchHandlerRef.current.on('longpress', (tapData) => {
        if (!disabled) {
          // Could trigger special effects or menu
          console.debug('Long press detected on tap button');
        }
      });
    }

    return () => {
      cleanup();
      if (touchHandlerRef.current) {
        touchHandlerRef.current.destroy();
        touchHandlerRef.current = null;
      }
    };
  }, [disabled, handleTap]);

  // Fallback mouse/touch handlers for non-mobile or when touch handler fails
  const handleMouseDown = useCallback((event) => {
    if (ViewportUtils.isMobile()) return; // Let touch handler handle it
    
    event.preventDefault();
    setIsPressed(true);
    
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      handleTap({ x, y });
    }
  }, [handleTap]);

  const handleMouseUp = useCallback(() => {
    if (ViewportUtils.isMobile()) return;
    setIsPressed(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (ViewportUtils.isMobile()) return;
    setIsPressed(false);
  }, []);

  // Prevent context menu
  const handleContextMenu = useCallback((event) => {
    event.preventDefault();
  }, []);

  // Handle golden tap celebration completion
  const handleGoldenCelebrationComplete = useCallback(() => {
    setShowGoldenCelebration(false);
    setLastGoldenTapEarnings(0);
  }, []);

  // Clean up animations on unmount
  useEffect(() => {
    return () => {
      setAnimations([]);
      setRipples([]);
    };
  }, []);

  return (
    <>
      <div className="tap-button-container">
        <button
          ref={buttonRef}
          className={`tap-button ${isGoldenTap ? 'golden' : ''} ${isPressed ? 'pressed' : ''} ${disabled ? 'disabled' : ''} ${isMobile ? 'mobile' : ''} ${className}`}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onContextMenu={handleContextMenu}
          disabled={disabled}
          aria-label={`Tap to earn ${coinsPerTap} coins${isGoldenTap ? ' - Golden Tap!' : ''}`}
          style={{
            touchAction: 'manipulation',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          {/* Main button content */}
          <div className="tap-button-content">
            <span className="tap-emoji">
              {isGoldenTap ? '✨' : '💎'}
            </span>
            <span className="tap-text">TAP!</span>
          </div>

          {/* Ripple effects */}
          {ripples.map(ripple => (
            <div
              key={ripple.id}
              className="tap-ripple"
              style={{
                left: ripple.x,
                top: ripple.y,
              }}
            />
          ))}

          {/* Floating coin animations */}
          {animations.map(animation => (
            <FloatingCoin
              key={animation.id}
              {...animation}
            />
          ))}
        </button>
      </div>

      {/* Golden Tap Celebration */}
      <GoldenTapCelebration
        isVisible={showGoldenCelebration}
        earnings={lastGoldenTapEarnings}
        onComplete={handleGoldenCelebrationComplete}
      />
    </>
  );
};

// Floating coin animation component
const FloatingCoin = ({ x, y, value, isGolden, startTime, duration }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(elapsed / duration, 1);
      setProgress(newProgress);

      if (newProgress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [startTime, duration]);

  // Easing function for smooth animation
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easedProgress = easeOut(progress);

  // Calculate animation properties
  const translateY = -100 * easedProgress; // Move up
  const opacity = Math.max(0, 1 - progress * 1.5); // Fade out faster
  const scale = 0.8 + (0.4 * (1 - progress)); // Start bigger, shrink

  return (
    <div
      className={`floating-coin ${isGolden ? 'golden' : ''}`}
      style={{
        left: x,
        top: y,
        transform: `translate(-50%, -50%) translateY(${translateY}px) scale(${scale})`,
        opacity: opacity,
        pointerEvents: 'none'
      }}
    >
      <span className="coin-icon">{isGolden ? '🪙' : '💰'}</span>
      <span className="coin-value">+{value.toLocaleString()}</span>
    </div>
  );
};

export default TapButton;