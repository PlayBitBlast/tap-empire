import React, { useState, useEffect, useRef } from 'react';
import './CoinCounter.css';

const CoinCounter = ({ 
  coins = 0, 
  previousCoins = 0,
  className = '',
  showIncrease = true,
  animationDuration = 300 
}) => {
  const [displayCoins, setDisplayCoins] = useState(coins);
  const [isAnimating, setIsAnimating] = useState(false);
  const [increaseAmount, setIncreaseAmount] = useState(0);
  const animationRef = useRef(null);
  const previousCoinsRef = useRef(coins);

  // Format large numbers with appropriate suffixes
  const formatNumber = (num) => {
    if (num < 1000) return num.toLocaleString();
    if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
    if (num < 1000000000) return (num / 1000000).toFixed(1) + 'M';
    if (num < 1000000000000) return (num / 1000000000).toFixed(1) + 'B';
    return (num / 1000000000000).toFixed(1) + 'T';
  };

  // Animate counter when coins change
  useEffect(() => {
    if (coins === displayCoins) return;

    const difference = coins - previousCoinsRef.current;
    
    if (difference > 0 && showIncrease) {
      setIncreaseAmount(difference);
      
      // Hide increase indicator after animation
      setTimeout(() => {
        setIncreaseAmount(0);
      }, animationDuration + 500);
    }

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    setIsAnimating(true);
    
    const startValue = displayCoins;
    const endValue = coins;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = Math.floor(startValue + (endValue - startValue) * easeOut);
      setDisplayCoins(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayCoins(endValue);
        setIsAnimating(false);
        previousCoinsRef.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [coins, displayCoins, animationDuration, showIncrease]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className={`coin-counter ${isAnimating ? 'animating' : ''} ${className}`}>
      <div className="coin-display">
        <span className="coin-icon">💰</span>
        <span className="coin-amount" aria-live="polite">
          {formatNumber(displayCoins)}
        </span>
        <span className="coin-label">Coins</span>
      </div>
      
      {increaseAmount > 0 && (
        <div className="coin-increase">
          <span className="increase-icon">+</span>
          <span className="increase-amount">{formatNumber(increaseAmount)}</span>
        </div>
      )}
      
      {/* Pulse effect for large increases */}
      {isAnimating && coins - previousCoinsRef.current > displayCoins * 0.1 && (
        <div className="coin-pulse" />
      )}
    </div>
  );
};

export default CoinCounter;