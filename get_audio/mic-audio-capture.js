/**
 * Microphone Audio Capture Module
 * Handles microphone audio stream acquisition and management
 */

class MicAudioCapture {
  constructor(config = {}) {
    this.micStream = null;
    this.isActive = false;
    this.config = {
      echoCancellation: config.echoCancellation || false,
      noiseSuppression: config.noiseSuppression || false,
      autoGainControl: config.autoGainControl || false,
      sampleRate: config.sampleRate || 48000,
      ...config
    };
  }

  /**
   * Request microphone access and get audio stream
   * @returns {Promise<MediaStream|null>} Microphone audio stream or null if denied
   */
  async getMicStream() {
    console.log('[MicAudioCapture] Attempting microphone access...');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          autoGainControl: this.config.autoGainControl,
          sampleRate: this.config.sampleRate
        }
      });

      console.log('[MicAudioCapture] Microphone access granted');
      
      // Validate stream has audio tracks
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach(track => track.stop());
        throw new Error('No audio tracks in microphone stream');
      }

      console.log('[MicAudioCapture] Microphone audio tracks:', audioTracks.map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        readyState: t.readyState,
        label: t.label,
        id: t.id
      })));

      this.micStream = stream;
      this.isActive = true;

      // Set up stream event listeners
      this._setupStreamEventListeners(stream);

      return stream;

    } catch (error) {
      console.warn('[MicAudioCapture] Microphone access denied:', error.message);
      this.micStream = null;
      this.isActive = false;
      
      // Notify parent about microphone access denial
      if (typeof window.onMicAccessDenied === 'function') {
        window.onMicAccessDenied(error);
      }
      
      return null;
    }
  }

  /**
   * Set up event listeners for microphone stream
   * @param {MediaStream} stream - The microphone audio stream
   */
  _setupStreamEventListeners(stream) {
    stream.getAudioTracks().forEach(track => {
      track.addEventListener('ended', () => {
        console.log('[MicAudioCapture] Microphone audio track ended');
        this.isActive = false;
        this._handleStreamEnd();
      });

      track.addEventListener('mute', () => {
        console.log('[MicAudioCapture] Microphone audio track muted');
        this._handleMute();
      });

      track.addEventListener('unmute', () => {
        console.log('[MicAudioCapture] Microphone audio track unmuted');
        this._handleUnmute();
      });
    });
  }

  /**
   * Handle stream end event
   */
  _handleStreamEnd() {
    console.log('[MicAudioCapture] Microphone stream ended');
    
    // Notify parent about stream end
    if (typeof window.onMicStreamEnd === 'function') {
      window.onMicStreamEnd();
    }
  }

  /**
   * Handle microphone mute event
   */
  _handleMute() {
    console.log('[MicAudioCapture] Microphone muted by system');
    
    // Notify parent about mute
    if (typeof window.onMicMuted === 'function') {
      window.onMicMuted();
    }
  }

  /**
   * Handle microphone unmute event
   */
  _handleUnmute() {
    console.log('[MicAudioCapture] Microphone unmuted by system');
    
    // Notify parent about unmute
    if (typeof window.onMicUnmuted === 'function') {
      window.onMicUnmuted();
    }
  }

  /**
   * Stop microphone audio capture
   */
  stop() {
    if (this.micStream) {
      console.log('[MicAudioCapture] Stopping microphone audio capture...');
      
      this.micStream.getTracks().forEach(track => {
        track.stop();
      });
      
      this.micStream = null;
      this.isActive = false;
      
      console.log('[MicAudioCapture] Microphone audio capture stopped');
    }
  }

  /**
   * Get current microphone stream
   * @returns {MediaStream|null} Current microphone stream
   */
  getCurrentStream() {
    return this.micStream;
  }

  /**
   * Check if microphone audio capture is active
   * @returns {boolean} True if active
   */
  isCapturing() {
    return this.isActive && this.micStream && this.micStream.active;
  }

  /**
   * Get microphone audio track info
   * @returns {Object|null} Microphone audio track information
   */
  getTrackInfo() {
    if (!this.micStream) {
      return null;
    }

    const audioTracks = this.micStream.getAudioTracks();
    if (audioTracks.length === 0) {
      return null;
    }

    const track = audioTracks[0];
    return {
      kind: track.kind,
      enabled: track.enabled,
      readyState: track.readyState,
      label: track.label,
      id: track.id,
      muted: track.muted
    };
  }

  /**
   * Enable/disable microphone audio track
   * @param {boolean} enabled - Whether to enable the track
   */
  setEnabled(enabled) {
    if (this.micStream) {
      const audioTracks = this.micStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = enabled;
      });
      console.log(`[MicAudioCapture] Microphone audio ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Check if microphone is available
   * @returns {Promise<boolean>} True if microphone is available
   */
  async isMicrophoneAvailable() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      return audioInputs.length > 0;
    } catch (error) {
      console.warn('[MicAudioCapture] Failed to enumerate devices:', error);
      return false;
    }
  }

  /**
   * Get available microphone devices
   * @returns {Promise<Array>} Array of available microphone devices
   */
  async getAvailableDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audioinput');
    } catch (error) {
      console.warn('[MicAudioCapture] Failed to enumerate devices:', error);
      return [];
    }
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('[MicAudioCapture] Configuration updated:', this.config);
  }

  /**
   * Get current configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return { ...this.config };
  }
}

// Export for use in other modules
window.MicAudioCapture = MicAudioCapture;