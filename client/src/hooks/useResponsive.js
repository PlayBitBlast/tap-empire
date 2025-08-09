import { useState, useEffect, useCallback } from 'react';
import { ViewportUtils, PerformanceUtils } from '../utils/touchOptimization';

/**
 * Custom hook for responsive design and mobile optimization
 * Provides screen size information, orientation, and mobile-specific utilities
 */
export const useResponsive = () => {
  const [screenInfo, setScreenInfo] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    availableHeight: window.visualViewport?.height || window.innerHeight,
    isMobile: ViewportUtils.isMobile(),
    isTablet: ViewportUtils.isTablet(),
    isDesktop: ViewportUtils.isDesktop(),
    isLandscape: ViewportUtils.isLandscape(),
    isKeyboardVisible: ViewportUtils.isKeyboardVisible(),
    safeAreaInsets: ViewportUtils.getSafeAreaInsets()
  }));

  const [deviceInfo, setDeviceInfo] = useState(() => ({
    pixelRatio: window.devicePixelRatio || 1,
    prefersReducedMotion: PerformanceUtils.prefersReducedMotion(),
    isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    isHighRefreshRate: window.screen?.refreshRate > 60 || false,
    connectionType: navigator.connection?.effectiveType || 'unknown'
  }));

  // Throttled update function to prevent excessive re-renders
  const updateScreenInfo = useCallback(
    PerformanceUtils.throttle(() => {
      const newScreenInfo = {
        width: window.innerWidth,
        height: window.innerHeight,
        availableHeight: window.visualViewport?.height || window.innerHeight,
        isMobile: ViewportUtils.isMobile(),
        isTablet: ViewportUtils.isTablet(),
        isDesktop: ViewportUtils.isDesktop(),
        isLandscape: ViewportUtils.isLandscape(),
        isKeyboardVisible: ViewportUtils.isKeyboardVisible(),
        safeAreaInsets: ViewportUtils.getSafeAreaInsets()
      };

      setScreenInfo(prevInfo => {
        // Only update if something actually changed
        const hasChanged = Object.keys(newScreenInfo).some(
          key => newScreenInfo[key] !== prevInfo[key]
        );
        return hasChanged ? newScreenInfo : prevInfo;
      });
    }, 100),
    []
  );

  // Set up viewport listeners
  useEffect(() => {
    const cleanup = ViewportUtils.onViewportChange(updateScreenInfo);
    
    // Also listen for orientation changes
    const handleOrientationChange = () => {
      // Delay to ensure viewport has updated
      setTimeout(updateScreenInfo, 100);
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      cleanup();
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [updateScreenInfo]);

  // Update device info when connection changes
  useEffect(() => {
    const updateDeviceInfo = () => {
      setDeviceInfo(prev => ({
        ...prev,
        connectionType: navigator.connection?.effectiveType || 'unknown'
      }));
    };

    if (navigator.connection) {
      navigator.connection.addEventListener('change', updateDeviceInfo);
      return () => {
        navigator.connection.removeEventListener('change', updateDeviceInfo);
      };
    }
  }, []);

  // Utility functions
  const getBreakpoint = useCallback(() => {
    const { width } = screenInfo;
    if (width <= 480) return 'xs';
    if (width <= 768) return 'sm';
    if (width <= 1024) return 'md';
    if (width <= 1200) return 'lg';
    return 'xl';
  }, [screenInfo.width]);

  const isBreakpoint = useCallback((breakpoint) => {
    const current = getBreakpoint();
    const breakpoints = ['xs', 'sm', 'md', 'lg', 'xl'];
    const currentIndex = breakpoints.indexOf(current);
    const targetIndex = breakpoints.indexOf(breakpoint);
    
    return currentIndex >= targetIndex;
  }, [getBreakpoint]);

  const getOptimalImageSize = useCallback((baseSizes = {}) => {
    const breakpoint = getBreakpoint();
    const pixelRatio = deviceInfo.pixelRatio;
    
    let size = baseSizes[breakpoint] || baseSizes.md || 'medium';
    
    // Use higher resolution for high DPI displays
    if (pixelRatio > 1.5 && baseSizes[`${breakpoint}@2x`]) {
      size = baseSizes[`${breakpoint}@2x`];
    }
    
    return size;
  }, [getBreakpoint, deviceInfo.pixelRatio]);

  const shouldReduceAnimations = useCallback(() => {
    return (
      deviceInfo.prefersReducedMotion ||
      deviceInfo.connectionType === 'slow-2g' ||
      deviceInfo.connectionType === '2g' ||
      (screenInfo.isMobile && deviceInfo.pixelRatio < 2)
    );
  }, [deviceInfo, screenInfo.isMobile]);

  const getOptimalAnimationDuration = useCallback((baseDuration = 300) => {
    if (shouldReduceAnimations()) return baseDuration * 0.5;
    if (deviceInfo.isHighRefreshRate) return baseDuration * 1.2;
    return baseDuration;
  }, [shouldReduceAnimations, deviceInfo.isHighRefreshRate]);

  const getTouchTargetSize = useCallback(() => {
    // Minimum 44px for accessibility, larger on small screens
    const baseSize = 44;
    if (screenInfo.width <= 320) return baseSize + 4;
    if (screenInfo.isMobile) return baseSize + 2;
    return baseSize;
  }, [screenInfo]);

  const getLayoutSpacing = useCallback((baseSpacing = 16) => {
    const breakpoint = getBreakpoint();
    const multipliers = {
      xs: 0.75,
      sm: 0.875,
      md: 1,
      lg: 1.125,
      xl: 1.25
    };
    
    return Math.round(baseSpacing * (multipliers[breakpoint] || 1));
  }, [getBreakpoint]);

  const isLowEndDevice = useCallback(() => {
    return (
      navigator.hardwareConcurrency <= 2 ||
      navigator.deviceMemory <= 2 ||
      deviceInfo.connectionType === 'slow-2g' ||
      deviceInfo.connectionType === '2g'
    );
  }, [deviceInfo.connectionType]);

  return {
    // Screen information
    ...screenInfo,
    
    // Device information
    ...deviceInfo,
    
    // Utility functions
    getBreakpoint,
    isBreakpoint,
    getOptimalImageSize,
    shouldReduceAnimations,
    getOptimalAnimationDuration,
    getTouchTargetSize,
    getLayoutSpacing,
    isLowEndDevice,
    
    // Convenience flags
    isSmallScreen: screenInfo.width <= 480,
    isMediumScreen: screenInfo.width > 480 && screenInfo.width <= 768,
    isLargeScreen: screenInfo.width > 768,
    isPortrait: !screenInfo.isLandscape,
    hasNotch: screenInfo.safeAreaInsets.top > 20,
    isFullscreen: screenInfo.height === window.screen?.height,
    
    // Performance flags
    canUseExpensiveAnimations: !shouldReduceAnimations() && !isLowEndDevice(),
    shouldPreloadImages: deviceInfo.connectionType !== 'slow-2g' && deviceInfo.connectionType !== '2g',
    shouldUseWebP: 'WebP' in window && deviceInfo.connectionType !== 'slow-2g'
  };
};

/**
 * Hook for managing responsive CSS classes
 */
export const useResponsiveClasses = (baseClass = '') => {
  const responsive = useResponsive();
  
  const classes = [
    baseClass,
    `breakpoint-${responsive.getBreakpoint()}`,
    responsive.isMobile ? 'mobile' : '',
    responsive.isTablet ? 'tablet' : '',
    responsive.isDesktop ? 'desktop' : '',
    responsive.isLandscape ? 'landscape' : 'portrait',
    responsive.isKeyboardVisible ? 'keyboard-visible' : '',
    responsive.isTouchDevice ? 'touch-device' : 'no-touch',
    responsive.shouldReduceAnimations() ? 'reduced-motion' : '',
    responsive.isLowEndDevice() ? 'low-end-device' : '',
    responsive.hasNotch ? 'has-notch' : ''
  ].filter(Boolean).join(' ');
  
  return classes;
};

/**
 * Hook for responsive values that change based on screen size
 */
export const useResponsiveValue = (values) => {
  const { getBreakpoint } = useResponsive();
  const breakpoint = getBreakpoint();
  
  // Return the value for current breakpoint, falling back to smaller breakpoints
  const breakpoints = ['xs', 'sm', 'md', 'lg', 'xl'];
  const currentIndex = breakpoints.indexOf(breakpoint);
  
  for (let i = currentIndex; i >= 0; i--) {
    const bp = breakpoints[i];
    if (values[bp] !== undefined) {
      return values[bp];
    }
  }
  
  // Fallback to the first available value
  return Object.values(values)[0];
};

export default useResponsive;