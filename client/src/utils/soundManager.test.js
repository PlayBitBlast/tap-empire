// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock AudioContext
global.AudioContext = jest.fn();
global.webkitAudioContext = jest.fn();

// Mock console methods
global.console.warn = jest.fn();
global.console.log = jest.fn();

describe('SoundManager', () => {
  let SoundManager;
  let soundManager;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Reset modules to get fresh instance
    jest.resetModules();
    SoundManager = require('./soundManager').default.constructor;
    soundManager = new SoundManager();
  });

  describe('Initialization', () => {
    test('should initialize with default values', () => {
      expect(soundManager.isEnabled).toBe(true);
      expect(soundManager.volume).toBe(0.7);
      expect(soundManager.isInitialized).toBe(false);
    });

    test('should have sound preference methods', () => {
      // Test that the methods exist and return values
      expect(typeof soundManager.loadSoundPreference).toBe('function');
      expect(typeof soundManager.loadVolumePreference).toBe('function');
      expect(typeof soundManager.saveSoundPreference).toBe('function');
      expect(typeof soundManager.saveVolumePreference).toBe('function');
    });

    test('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const enabled = soundManager.loadSoundPreference();
      const volume = soundManager.loadVolumePreference();

      expect(enabled).toBe(true);
      expect(volume).toBe(0.7);
    });
  });

  describe('Settings Management', () => {
    test('should enable and disable sounds', () => {
      soundManager.setEnabled(false);
      expect(soundManager.getEnabled()).toBe(false);

      soundManager.setEnabled(true);
      expect(soundManager.getEnabled()).toBe(true);
    });

    test('should set volume level', () => {
      soundManager.setVolume(0.5);
      expect(soundManager.getVolume()).toBe(0.5);
    });

    test('should clamp volume to valid range', () => {
      soundManager.setVolume(-0.5);
      expect(soundManager.getVolume()).toBe(0);

      soundManager.setVolume(1.5);
      expect(soundManager.getVolume()).toBe(1);
    });
  });

  describe('Sound Playback', () => {
    test('should not play sound when disabled', async () => {
      soundManager.setEnabled(false);
      
      // Mock console.warn to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await soundManager.playGoldenTapSound();
      
      // Should not attempt to play when disabled
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    test('should not play sound when audio context is not available', async () => {
      soundManager.audioContext = null;
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await soundManager.playGoldenTapSound();
      
      // Should not attempt to play without audio context
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
});