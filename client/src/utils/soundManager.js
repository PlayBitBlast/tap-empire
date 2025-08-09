// Sound Manager for Tap Empire
// Handles all game sound effects with proper error handling and user preferences

class SoundManager {
  constructor() {
    this.sounds = new Map();
    this.isEnabled = this.loadSoundPreference();
    this.volume = this.loadVolumePreference();
    this.audioContext = null;
    this.isInitialized = false;
    
    // Initialize audio context on first user interaction
    this.initializeAudioContext = this.initializeAudioContext.bind(this);
    document.addEventListener('touchstart', this.initializeAudioContext, { once: true });
    document.addEventListener('click', this.initializeAudioContext, { once: true });
  }

  /**
   * Initialize Web Audio API context
   */
  async initializeAudioContext() {
    if (this.isInitialized) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      await this.loadSounds();
      this.isInitialized = true;
      console.log('Sound Manager initialized');
    } catch (error) {
      console.warn('Failed to initialize audio context:', error);
    }
  }

  /**
   * Load all game sounds
   */
  async loadSounds() {
    const soundDefinitions = {
      goldenTap: {
        // Generate golden tap sound using Web Audio API
        type: 'generated',
        generator: this.generateGoldenTapSound.bind(this)
      },
      normalTap: {
        type: 'generated',
        generator: this.generateNormalTapSound.bind(this)
      },
      upgrade: {
        type: 'generated',
        generator: this.generateUpgradeSound.bind(this)
      },
      achievement: {
        type: 'generated',
        generator: this.generateAchievementSound.bind(this)
      }
    };

    for (const [name, definition] of Object.entries(soundDefinitions)) {
      try {
        if (definition.type === 'generated') {
          this.sounds.set(name, definition.generator);
        }
      } catch (error) {
        console.warn(`Failed to load sound ${name}:`, error);
      }
    }
  }

  /**
   * Generate golden tap sound effect
   */
  generateGoldenTapSound() {
    if (!this.audioContext) return;

    const duration = 0.8;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(2, duration * sampleRate, sampleRate);

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      
      for (let i = 0; i < channelData.length; i++) {
        const t = i / sampleRate;
        
        // Create a magical chime sound with multiple harmonics
        const fundamental = 880; // A5 note
        const harmonic1 = fundamental * 2; // Octave
        const harmonic2 = fundamental * 3; // Perfect fifth
        const harmonic3 = fundamental * 4; // Double octave
        
        // Envelope for smooth attack and decay
        const envelope = Math.exp(-t * 3) * (1 - Math.exp(-t * 50));
        
        // Combine multiple sine waves with different frequencies
        const wave1 = Math.sin(2 * Math.PI * fundamental * t) * 0.4;
        const wave2 = Math.sin(2 * Math.PI * harmonic1 * t) * 0.3;
        const wave3 = Math.sin(2 * Math.PI * harmonic2 * t) * 0.2;
        const wave4 = Math.sin(2 * Math.PI * harmonic3 * t) * 0.1;
        
        // Add some sparkle with high-frequency modulation
        const sparkle = Math.sin(2 * Math.PI * 2640 * t) * 0.1 * Math.exp(-t * 8);
        
        channelData[i] = (wave1 + wave2 + wave3 + wave4 + sparkle) * envelope;
      }
    }

    return buffer;
  }

  /**
   * Generate normal tap sound effect
   */
  generateNormalTapSound() {
    if (!this.audioContext) return;

    const duration = 0.2;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(2, duration * sampleRate, sampleRate);

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      
      for (let i = 0; i < channelData.length; i++) {
        const t = i / sampleRate;
        
        // Simple click sound
        const frequency = 800;
        const envelope = Math.exp(-t * 20);
        const wave = Math.sin(2 * Math.PI * frequency * t);
        
        channelData[i] = wave * envelope * 0.3;
      }
    }

    return buffer;
  }

  /**
   * Generate upgrade purchase sound
   */
  generateUpgradeSound() {
    if (!this.audioContext) return;

    const duration = 0.5;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(2, duration * sampleRate, sampleRate);

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      
      for (let i = 0; i < channelData.length; i++) {
        const t = i / sampleRate;
        
        // Rising tone for upgrade success
        const startFreq = 440;
        const endFreq = 880;
        const frequency = startFreq + (endFreq - startFreq) * (t / duration);
        
        const envelope = Math.exp(-t * 4) * (1 - Math.exp(-t * 20));
        const wave = Math.sin(2 * Math.PI * frequency * t);
        
        channelData[i] = wave * envelope * 0.4;
      }
    }

    return buffer;
  }

  /**
   * Generate achievement unlock sound
   */
  generateAchievementSound() {
    if (!this.audioContext) return;

    const duration = 1.0;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(2, duration * sampleRate, sampleRate);

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      
      for (let i = 0; i < channelData.length; i++) {
        const t = i / sampleRate;
        
        // Triumphant fanfare-like sound
        const notes = [523, 659, 784, 1047]; // C, E, G, C (major chord)
        let sample = 0;
        
        for (let j = 0; j < notes.length; j++) {
          const noteStart = j * 0.2;
          const noteEnd = noteStart + 0.4;
          
          if (t >= noteStart && t <= noteEnd) {
            const noteTime = t - noteStart;
            const envelope = Math.exp(-noteTime * 2) * (1 - Math.exp(-noteTime * 30));
            sample += Math.sin(2 * Math.PI * notes[j] * noteTime) * envelope * 0.25;
          }
        }
        
        channelData[i] = sample;
      }
    }

    return buffer;
  }

  /**
   * Play a sound effect
   */
  async playSound(soundName, options = {}) {
    if (!this.isEnabled || !this.audioContext || !this.sounds.has(soundName)) {
      return;
    }

    try {
      await this.initializeAudioContext();
      
      const soundGenerator = this.sounds.get(soundName);
      const buffer = soundGenerator();
      
      if (!buffer) return;

      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = buffer;
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Apply volume and any additional options
      gainNode.gain.value = this.volume * (options.volume || 1);
      
      if (options.playbackRate) {
        source.playbackRate.value = options.playbackRate;
      }
      
      source.start();
      
      // Clean up after sound finishes
      source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
      };
      
    } catch (error) {
      console.warn(`Failed to play sound ${soundName}:`, error);
    }
  }

  /**
   * Play golden tap sound with special effects
   */
  async playGoldenTapSound() {
    await this.playSound('goldenTap', { volume: 1.2 });
  }

  /**
   * Play normal tap sound
   */
  async playNormalTapSound() {
    await this.playSound('normalTap', { volume: 0.8 });
  }

  /**
   * Play upgrade sound
   */
  async playUpgradeSound() {
    await this.playSound('upgrade', { volume: 1.0 });
  }

  /**
   * Play achievement sound
   */
  async playAchievementSound() {
    await this.playSound('achievement', { volume: 1.1 });
  }

  /**
   * Enable or disable sounds
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    this.saveSoundPreference(enabled);
  }

  /**
   * Set volume level (0-1)
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.saveVolumePreference(this.volume);
  }

  /**
   * Get current sound enabled state
   */
  getEnabled() {
    return this.isEnabled;
  }

  /**
   * Get current volume level
   */
  getVolume() {
    return this.volume;
  }

  /**
   * Load sound preference from localStorage
   */
  loadSoundPreference() {
    try {
      const saved = localStorage.getItem('tapEmpire:soundEnabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  }

  /**
   * Save sound preference to localStorage
   */
  saveSoundPreference(enabled) {
    try {
      localStorage.setItem('tapEmpire:soundEnabled', JSON.stringify(enabled));
    } catch (error) {
      console.warn('Failed to save sound preference:', error);
    }
  }

  /**
   * Load volume preference from localStorage
   */
  loadVolumePreference() {
    try {
      const saved = localStorage.getItem('tapEmpire:soundVolume');
      return saved !== null ? parseFloat(saved) : 0.7;
    } catch {
      return 0.7;
    }
  }

  /**
   * Save volume preference to localStorage
   */
  saveVolumePreference(volume) {
    try {
      localStorage.setItem('tapEmpire:soundVolume', volume.toString());
    } catch (error) {
      console.warn('Failed to save volume preference:', error);
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.sounds.clear();
  }
}

// Create singleton instance
const soundManager = new SoundManager();

export default soundManager;