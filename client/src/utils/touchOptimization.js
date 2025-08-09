/**
 * Touch Optimization Utilities for Mobile Devices
 * Provides utilities for better touch interactions and mobile UX
 */

// Touch event handler with debouncing and gesture recognition
export class TouchHandler {
  constructor(element, options = {}) {
    this.element = element;
    this.options = {
      tapThreshold: 10, // Maximum movement for tap
      longPressDelay: 500, // Long press delay in ms
      doubleTapDelay: 300, // Double tap delay in ms
      preventContextMenu: true,
      enableHapticFeedback: true,
      ...options
    };
    
    this.touchState = {
      startX: 0,
      startY: 0,
      startTime: 0,
      lastTap: 0,
      tapCount: 0,
      isLongPress: false,
      longPressTimer: null
    };
    
    this.callbacks = {};
    this.init();
  }
  
  init() {
    if (!this.element) return;
    
    // Prevent default touch behaviors
    this.element.style.touchAction = 'manipulation';
    this.element.style.userSelect = 'none';
    this.element.style.webkitUserSelect = 'none';
    this.element.style.webkitTouchCallout = 'none';
    this.element.style.webkitTapHighlightColor = 'transparent';
    
    // Add event listeners
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });
    
    if (this.options.preventContextMenu) {
      this.element.addEventListener('contextmenu', (e) => e.preventDefault());
    }
  }
  
  handleTouchStart(event) {
    const touch = event.touches[0];
    this.touchState.startX = touch.clientX;
    this.touchState.startY = touch.clientY;
    this.touchState.startTime = Date.now();
    this.touchState.isLongPress = false;
    
    // Clear any existing long press timer
    if (this.touchState.longPressTimer) {
      clearTimeout(this.touchState.longPressTimer);
    }
    
    // Set up long press detection
    this.touchState.longPressTimer = setTimeout(() => {
      this.touchState.isLongPress = true;
      this.triggerCallback('longpress', {
        x: this.touchState.startX,
        y: this.touchState.startY,
        originalEvent: event
      });
      
      // Haptic feedback for long press
      this.triggerHapticFeedback('medium');
    }, this.options.longPressDelay);
    
    this.triggerCallback('touchstart', {
      x: touch.clientX,
      y: touch.clientY,
      originalEvent: event
    });
  }
  
  handleTouchMove(event) {
    const touch = event.touches[0];
    const deltaX = Math.abs(touch.clientX - this.touchState.startX);
    const deltaY = Math.abs(touch.clientY - this.touchState.startY);
    
    // Cancel long press if moved too much
    if (deltaX > this.options.tapThreshold || deltaY > this.options.tapThreshold) {
      if (this.touchState.longPressTimer) {
        clearTimeout(this.touchState.longPressTimer);
        this.touchState.longPressTimer = null;
      }
    }
    
    this.triggerCallback('touchmove', {
      x: touch.clientX,
      y: touch.clientY,
      deltaX: touch.clientX - this.touchState.startX,
      deltaY: touch.clientY - this.touchState.startY,
      originalEvent: event
    });
  }
  
  handleTouchEnd(event) {
    const touch = event.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - this.touchState.startX);
    const deltaY = Math.abs(touch.clientY - this.touchState.startY);
    const duration = Date.now() - this.touchState.startTime;
    
    // Clear long press timer
    if (this.touchState.longPressTimer) {
      clearTimeout(this.touchState.longPressTimer);
      this.touchState.longPressTimer = null;
    }
    
    // Check if it's a tap (small movement, short duration, not long press)
    if (deltaX <= this.options.tapThreshold && 
        deltaY <= this.options.tapThreshold && 
        duration < this.options.longPressDelay &&
        !this.touchState.isLongPress) {
      
      const now = Date.now();
      const timeSinceLastTap = now - this.touchState.lastTap;
      
      if (timeSinceLastTap < this.options.doubleTapDelay) {
        this.touchState.tapCount++;
      } else {
        this.touchState.tapCount = 1;
      }
      
      this.touchState.lastTap = now;
      
      // Handle double tap
      if (this.touchState.tapCount === 2) {
        this.triggerCallback('doubletap', {
          x: touch.clientX,
          y: touch.clientY,
          originalEvent: event
        });
        this.touchState.tapCount = 0;
        this.triggerHapticFeedback('light');
      } else {
        // Single tap (with delay to check for double tap)
        setTimeout(() => {
          if (this.touchState.tapCount === 1) {
            this.triggerCallback('tap', {
              x: touch.clientX,
              y: touch.clientY,
              originalEvent: event
            });
            this.triggerHapticFeedback('light');
          }
          this.touchState.tapCount = 0;
        }, this.options.doubleTapDelay);
      }
    }
    
    this.triggerCallback('touchend', {
      x: touch.clientX,
      y: touch.clientY,
      duration,
      originalEvent: event
    });
  }
  
  handleTouchCancel(event) {
    // Clear long press timer
    if (this.touchState.longPressTimer) {
      clearTimeout(this.touchState.longPressTimer);
      this.touchState.longPressTimer = null;
    }
    
    this.triggerCallback('touchcancel', {
      originalEvent: event
    });
  }
  
  on(eventType, callback) {
    if (!this.callbacks[eventType]) {
      this.callbacks[eventType] = [];
    }
    this.callbacks[eventType].push(callback);
  }
  
  off(eventType, callback) {
    if (this.callbacks[eventType]) {
      this.callbacks[eventType] = this.callbacks[eventType].filter(cb => cb !== callback);
    }
  }
  
  triggerCallback(eventType, data) {
    if (this.callbacks[eventType]) {
      this.callbacks[eventType].forEach(callback => callback(data));
    }
  }
  
  triggerHapticFeedback(type = 'light') {
    if (!this.options.enableHapticFeedback) return;
    
    try {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        // Telegram Web App haptic feedback
        switch (type) {
          case 'light':
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
            break;
          case 'medium':
            window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
            break;
          case 'heavy':
            window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
            break;
          default:
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
      } else if (navigator.vibrate) {
        // Fallback to vibration API
        const patterns = {
          light: [10],
          medium: [20],
          heavy: [30]
        };
        navigator.vibrate(patterns[type] || patterns.light);
      }
    } catch (error) {
      console.debug('Haptic feedback not available:', error);
    }
  }
  
  destroy() {
    if (this.touchState.longPressTimer) {
      clearTimeout(this.touchState.longPressTimer);
    }
    
    if (this.element) {
      this.element.removeEventListener('touchstart', this.handleTouchStart);
      this.element.removeEventListener('touchmove', this.handleTouchMove);
      this.element.removeEventListener('touchend', this.handleTouchEnd);
      this.element.removeEventListener('touchcancel', this.handleTouchCancel);
      this.element.removeEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    this.callbacks = {};
  }
}

// Viewport utilities for responsive design
export const ViewportUtils = {
  // Get current viewport dimensions
  getViewportSize() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      availableHeight: window.visualViewport?.height || window.innerHeight
    };
  },
  
  // Check if device is mobile
  isMobile() {
    return window.innerWidth <= 768;
  },
  
  // Check if device is tablet
  isTablet() {
    return window.innerWidth > 768 && window.innerWidth <= 1024;
  },
  
  // Check if device is desktop
  isDesktop() {
    return window.innerWidth > 1024;
  },
  
  // Check if device is in landscape mode
  isLandscape() {
    return window.innerWidth > window.innerHeight;
  },
  
  // Check if virtual keyboard is likely visible
  isKeyboardVisible() {
    if (!window.visualViewport) return false;
    const heightDifference = window.innerHeight - window.visualViewport.height;
    return heightDifference > 150; // Threshold for keyboard detection
  },
  
  // Get safe area insets
  getSafeAreaInsets() {
    const style = getComputedStyle(document.documentElement);
    return {
      top: parseInt(style.getPropertyValue('env(safe-area-inset-top)')) || 0,
      right: parseInt(style.getPropertyValue('env(safe-area-inset-right)')) || 0,
      bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)')) || 0,
      left: parseInt(style.getPropertyValue('env(safe-area-inset-left)')) || 0
    };
  },
  
  // Add viewport change listener
  onViewportChange(callback) {
    const handler = () => callback(this.getViewportSize());
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handler);
    }
    
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handler);
      }
    };
  }
};

// Performance optimization utilities
export const PerformanceUtils = {
  // Throttle function calls
  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },
  
  // Debounce function calls
  debounce(func, delay) {
    let timeoutId;
    return function() {
      const args = arguments;
      const context = this;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(context, args), delay);
    };
  },
  
  // Request animation frame with fallback
  requestAnimationFrame(callback) {
    return (window.requestAnimationFrame || 
            window.webkitRequestAnimationFrame || 
            window.mozRequestAnimationFrame || 
            function(callback) { setTimeout(callback, 16); })(callback);
  },
  
  // Check if reduced motion is preferred
  prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },
  
  // Optimize images for current device
  getOptimizedImageSrc(baseSrc, sizes = {}) {
    const pixelRatio = window.devicePixelRatio || 1;
    const viewport = ViewportUtils.getViewportSize();
    
    let targetSize = 'medium';
    if (viewport.width <= 480) targetSize = 'small';
    else if (viewport.width >= 1200) targetSize = 'large';
    
    const size = sizes[targetSize] || sizes.medium || baseSrc;
    
    // Add pixel ratio suffix if available
    if (pixelRatio > 1 && sizes[`${targetSize}@2x`]) {
      return sizes[`${targetSize}@2x`];
    }
    
    return size;
  }
};

// Accessibility utilities
export const AccessibilityUtils = {
  // Announce text to screen readers
  announce(text, priority = 'polite') {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `;
    
    document.body.appendChild(announcer);
    announcer.textContent = text;
    
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  },
  
  // Check if user prefers high contrast
  prefersHighContrast() {
    return window.matchMedia('(prefers-contrast: high)').matches;
  },
  
  // Focus management
  trapFocus(element) {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleTabKey = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };
    
    element.addEventListener('keydown', handleTabKey);
    firstElement?.focus();
    
    return () => {
      element.removeEventListener('keydown', handleTabKey);
    };
  }
};

export default {
  TouchHandler,
  ViewportUtils,
  PerformanceUtils,
  AccessibilityUtils
};