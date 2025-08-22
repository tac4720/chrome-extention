/**
 * Audio Routing Module
 * Handles audio processing nodes, routing, and mixing
 */

class AudioRouting {
  constructor(config = {}) {
    this.audioContext = null;
    this.processor = null;
    this.workletNode = null;
    this.keepAliveOsc = null;
    this.keepAliveGain = null;
    this.dummyAudio = null;
    this.mediaDestination = null;
    
    // Audio processing nodes
    this.tabSourceNode = null;
    this.micSourceNode = null;
    this.tabGainNode = null;
    this.micGainNode = null;
    this.masterGainNode = null;
    this.merger = null;
    this.splitter = null;
    this.monoMerger = null;
    this.mixerGain = null;
    
    // Configuration
    this.config = {
      bufferSize: config.bufferSize || 4096,
      sampleRate: config.sampleRate || 48000,
      tabGainLevel: config.tabGainLevel || 0.8,
      micGainLevel: config.micGainLevel || 1.0,
      masterGainLevel: config.masterGainLevel || 1.0,
      mixerGainLevel: config.mixerGainLevel || 0.7,
      ...config
    };
    
    // Callbacks
    this.onAudioBuffer = null;
    this.onError = null;
  }

  /**
   * Initialize audio context and routing
   * @param {AudioContext} audioContext - The audio context to use
   * @returns {Promise<void>}
   */
  async initialize(audioContext) {
    this.audioContext = audioContext;
    
    console.log('[AudioRouting] Initializing audio routing...');
    
    // Create gain nodes for volume control (needed before connecting audio sources)
    this.tabGainNode = audioContext.createGain();
    this.micGainNode = audioContext.createGain();
    this.masterGainNode = audioContext.createGain();
    
    // Set initial gain levels
    this.tabGainNode.gain.value = this.config.tabGainLevel;
    this.micGainNode.gain.value = this.config.micGainLevel;
    this.masterGainNode.gain.value = this.config.masterGainLevel;
    
    // Create merger for combining audio sources
    this.merger = audioContext.createChannelMerger(2);
    this.mixerGain = audioContext.createGain();
    this.mixerGain.gain.value = this.config.mixerGainLevel;
    
    // Create destination and keep-alive components
    this.mediaDestination = audioContext.createMediaStreamDestination();
    this.setupKeepAlive();
    
    console.log('[AudioRouting] Audio routing initialized with gain nodes');
  }

  /**
   * Setup keep-alive components to prevent AudioContext suspension
   */
  setupKeepAlive() {
    try {
      this.keepAliveOsc = this.audioContext.createOscillator();
      this.keepAliveGain = this.audioContext.createGain();
      this.keepAliveGain.gain.value = 0;
      this.keepAliveOsc.connect(this.keepAliveGain).connect(this.mediaDestination);
      this.keepAliveOsc.start();
      
      this.dummyAudio = document.createElement('audio');
      this.dummyAudio.srcObject = this.mediaDestination.stream;
      this.dummyAudio.muted = true;
      this.dummyAudio.autoplay = true;
      document.body.appendChild(this.dummyAudio);
      
      console.log('[AudioRouting] Keep-alive components setup');
    } catch (error) {
      this._handleError(error, 'setupKeepAlive');
    }
  }

  /**
   * Setup AudioWorklet for audio processing
   * @returns {Promise<void>}
   */
  async setupAudioWorklet() {
    try {
      const workletUrl = chrome.runtime.getURL('audio_processing/audio-worklet.js');
      await this.audioContext.audioWorklet.addModule(workletUrl);
      
      this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1,
      });
      
      // Setup message handling
      this.workletNode.port.onmessage = (event) => {
        if (event.data.type === 'buffer') {
          this._processAudioBuffer(event.data.buffer);
        } else {
          console.log('[AudioRouting] Unknown worklet message:', event.data);
        }
      };
      
      // Setup audio routing
      this.setupAudioRouting(this.workletNode);
      
      console.log('[AudioRouting] AudioWorklet setup complete');
    } catch (error) {
      this._handleError(error, 'setupAudioWorklet');
      throw error;
    }
  }

  /**
   * Setup ScriptProcessor fallback for older browsers
   */
  setupScriptProcessor() {
    try {
      // Create script processor
      this.processor = this.audioContext.createScriptProcessor(this.config.bufferSize, 1, 1);
      
      // Setup audio routing
      this.setupAudioRouting(this.processor);
      
      // Setup audio processing
      this.processor.onaudioprocess = (e) => {
        try {
          const inputData = e.inputBuffer.getChannelData(0);
          const output = e.outputBuffer.getChannelData(0);
          output.set(inputData);
          
          this._processAudioBuffer(inputData);
        } catch (error) {
          this._handleError(error, 'ScriptProcessor.onaudioprocess');
        }
      };
      
      console.log('[AudioRouting] ScriptProcessor setup complete');
    } catch (error) {
      this._handleError(error, 'setupScriptProcessor');
      throw error;
    }
  }

  /**
   * Setup enhanced audio routing with proper mixing and gain control
   * @param {AudioNode} processor - The audio processor node
   */
  setupAudioRouting(processor) {
    console.log('[AudioRouting] Setting up enhanced audio routing...');
    
    // Create a channel splitter to convert stereo to mono for processing
    this.splitter = this.audioContext.createChannelSplitter(2);
    this.monoMerger = this.audioContext.createChannelMerger(1);
    
    // Connect the routing chain
    this.merger.connect(this.mixerGain);
    this.mixerGain.connect(this.splitter);
    
    // Mix both channels to mono for processing
    this.splitter.connect(this.monoMerger, 0, 0); // Left channel
    this.splitter.connect(this.monoMerger, 1, 0); // Right channel (mixed with left)
    
    // Apply master gain and connect to processor
    this.monoMerger.connect(this.masterGainNode);
    this.masterGainNode.connect(processor);
    processor.connect(this.mediaDestination);
    
    console.log('[AudioRouting] Enhanced audio routing setup complete');
  }

  /**
   * Connect tab audio source
   * @param {MediaStream} tabStream - Tab audio stream
   */
  connectTabAudio(tabStream) {
    if (!tabStream || !this.audioContext) {
      console.warn('[AudioRouting] Cannot connect tab audio: missing stream or context');
      return;
    }

    console.log('[AudioRouting] Connecting tab audio source...');
    
    this.tabSourceNode = this.audioContext.createMediaStreamSource(tabStream);
    
    // Connect: tabSource -> tabGain -> merger (channel 0)
    this.tabSourceNode.connect(this.tabGainNode);
    this.tabGainNode.connect(this.merger, 0, 0);
    
    // Also connect tab audio to speakers for monitoring
    this.tabSourceNode.connect(this.audioContext.destination);
    
    console.log('[AudioRouting] Tab audio connected to mixer');
  }

  /**
   * Connect microphone audio source
   * @param {MediaStream} micStream - Microphone audio stream
   */
  connectMicAudio(micStream) {
    if (!micStream || !this.audioContext) {
      console.warn('[AudioRouting] Cannot connect mic audio: missing stream or context');
      return;
    }

    console.log('[AudioRouting] Connecting microphone audio source...');
    
    this.micSourceNode = this.audioContext.createMediaStreamSource(micStream);
    
    // Connect: micSource -> micGain -> merger (channel 1)
    this.micSourceNode.connect(this.micGainNode);
    this.micGainNode.connect(this.merger, 0, 1);
    
    console.log('[AudioRouting] Microphone audio connected to mixer');
  }

  /**
   * Set gain level for specific audio source
   * @param {string} source - 'tab', 'mic', 'master', or 'mixer'
   * @param {number} level - Gain level (0.0 to 1.0)
   */
  setGainLevel(source, level) {
    const clampedLevel = Math.max(0, Math.min(1, level));
    
    switch (source) {
      case 'tab':
        if (this.tabGainNode) {
          this.tabGainNode.gain.value = clampedLevel;
          console.log(`[AudioRouting] Tab gain set to ${clampedLevel}`);
        }
        break;
      case 'mic':
        if (this.micGainNode) {
          this.micGainNode.gain.value = clampedLevel;
          console.log(`[AudioRouting] Mic gain set to ${clampedLevel}`);
        }
        break;
      case 'master':
        if (this.masterGainNode) {
          this.masterGainNode.gain.value = clampedLevel;
          console.log(`[AudioRouting] Master gain set to ${clampedLevel}`);
        }
        break;
      case 'mixer':
        if (this.mixerGain) {
          this.mixerGain.gain.value = clampedLevel;
          console.log(`[AudioRouting] Mixer gain set to ${clampedLevel}`);
        }
        break;
      default:
        console.warn(`[AudioRouting] Unknown gain source: ${source}`);
    }
  }

  /**
   * Get current gain level for specific audio source
   * @param {string} source - 'tab', 'mic', 'master', or 'mixer'
   * @returns {number} Current gain level
   */
  getGainLevel(source) {
    switch (source) {
      case 'tab':
        return this.tabGainNode ? this.tabGainNode.gain.value : 0;
      case 'mic':
        return this.micGainNode ? this.micGainNode.gain.value : 0;
      case 'master':
        return this.masterGainNode ? this.masterGainNode.gain.value : 0;
      case 'mixer':
        return this.mixerGain ? this.mixerGain.gain.value : 0;
      default:
        console.warn(`[AudioRouting] Unknown gain source: ${source}`);
        return 0;
    }
  }

  /**
   * Get routing status information
   * @returns {Object} Routing status
   */
  getRoutingStatus() {
    return {
      hasTabAudio: !!this.tabSourceNode,
      hasMicAudio: !!this.micSourceNode,
      isWorkletActive: !!this.workletNode,
      isScriptProcessorActive: !!this.processor,
      gainLevels: {
        tab: this.getGainLevel('tab'),
        mic: this.getGainLevel('mic'),
        master: this.getGainLevel('master'),
        mixer: this.getGainLevel('mixer')
      }
    };
  }

  /**
   * Set audio buffer callback
   * @param {Function} callback - Callback function for audio buffer processing
   */
  setAudioBufferCallback(callback) {
    this.onAudioBuffer = callback;
  }

  /**
   * Set error callback
   * @param {Function} callback - Callback function for error handling
   */
  setErrorCallback(callback) {
    this.onError = callback;
  }

  /**
   * Process audio buffer and call callback
   * @param {Float32Array} buffer - Audio buffer
   */
  _processAudioBuffer(buffer) {
    if (this.onAudioBuffer && typeof this.onAudioBuffer === 'function') {
      try {
        this.onAudioBuffer(buffer);
      } catch (error) {
        this._handleError(error, '_processAudioBuffer callback');
      }
    }
  }

  /**
   * Handle errors
   * @param {Error} error - The error object
   * @param {string} context - Error context
   */
  _handleError(error, context) {
    console.error(`[AudioRouting] Error in ${context}:`, error);
    
    if (this.onError && typeof this.onError === 'function') {
      this.onError(error, context);
    }
  }

  /**
   * Cleanup and stop all audio processing
   */
  cleanup() {
    console.log('[AudioRouting] Cleaning up audio routing...');
    
    // Stop keep-alive components
    if (this.keepAliveOsc) {
      try {
        this.keepAliveOsc.stop();
      } catch (e) {
        // Oscillator might already be stopped
      }
      this.keepAliveOsc = null;
    }
    
    if (this.dummyAudio) {
      this.dummyAudio.remove();
      this.dummyAudio = null;
    }
    
    // Disconnect audio nodes
    if (this.tabSourceNode) {
      this.tabSourceNode.disconnect();
      this.tabSourceNode = null;
    }
    
    if (this.micSourceNode) {
      this.micSourceNode.disconnect();
      this.micSourceNode = null;
    }
    
    // Cleanup processors
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    // Reset other nodes
    this.tabGainNode = null;
    this.micGainNode = null;
    this.masterGainNode = null;
    this.merger = null;
    this.splitter = null;
    this.monoMerger = null;
    this.mixerGain = null;
    this.mediaDestination = null;
    
    console.log('[AudioRouting] Audio routing cleanup complete');
  }
}

// Export for use in other modules
window.AudioRouting = AudioRouting;