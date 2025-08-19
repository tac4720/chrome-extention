(() => {
  // Module instances
  let tabAudioCapture = null;
  let micAudioCapture = null;
  let audioRouting = null;
  
  // Core components
  let audioContext = null;
  let ws = null;
  let mp3Encoder = null;
  
  // State management
  let isInitialized = false;
  let isRecording = false;
  let recordingStartTime = null;
  let connectionAttempts = 0;
  let lastHeartbeat = Date.now();
  let receivedPublicId = null;
  let captureTabId = null;
  
  // Configuration
  const CONFIG = {
    WS_BASE_URL: 'wss://app.paratalk.jp/ws',
    MAX_CONNECTION_ATTEMPTS: 5,
    HEARTBEAT_INTERVAL: 30000, // 30 seconds
    BUFFER_SIZE: 4096,
    SAMPLE_RATE: 48000,
    MP3_BITRATE: 128,
    RECONNECT_DELAY: 2000,
    MAX_RECORDING_TIME: 3600000 // 1 hour
  };
  
  // Error tracking and logging
  const errorLog = [];
  const MAX_ERROR_LOG_SIZE = 50;

  /**
   * Log errors with context and timestamp
   */
  function logError(error, context = '', severity = 'error') {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      error: error.toString(),
      context,
      severity,
      stack: error.stack || 'No stack trace'
    };
    
    errorLog.push(errorEntry);
    if (errorLog.length > MAX_ERROR_LOG_SIZE) {
      errorLog.shift();
    }
    
    console.error(`[Offscreen ${severity.toUpperCase()}] ${context}:`, error);
    
    // Report critical errors to background
    if (severity === 'critical') {
      reportError(error, context);
    }
  }

  /**
   * Report error to background script
   */
  function reportError(error, context) {
    try {
      chrome.runtime.sendMessage({
        action: 'error',
        error: error.toString(),
        context,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error('[Offscreen] Failed to report error to background:', e);
    }
  }

  /**
   * Convert float audio to 16-bit PCM
   */
  function floatTo16BitPCM(input) {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
  }

  /**
   * Normalize audio buffer to prevent clipping
   */
  function normalizeAudioBuffer(buffer) {
    if (!buffer || buffer.length === 0) return buffer;
    
    // Find peak amplitude
    let maxAmplitude = 0;
    for (let i = 0; i < buffer.length; i++) {
      const amplitude = Math.abs(buffer[i]);
      if (amplitude > maxAmplitude) {
        maxAmplitude = amplitude;
      }
    }
    
    // Apply normalization if needed
    if (maxAmplitude > 0.95) {
      const normalizationFactor = 0.95 / maxAmplitude;
      const normalizedBuffer = new Float32Array(buffer.length);
      
      for (let i = 0; i < buffer.length; i++) {
        normalizedBuffer[i] = buffer[i] * normalizationFactor;
      }
      
      return normalizedBuffer;
    }
    
    return buffer;
  }

  /**
   * Process audio buffer and send to WebSocket
   */
  function processAudioBuffer(buffer) {
    try {
      if (!isRecording || !mp3Encoder) {
        return;
      }
      
      // Validate buffer
      if (!buffer || buffer.length === 0) {
        console.warn('[Offscreen] Empty audio buffer received');
        return;
      }
      
      // Apply normalization
      const normalizedBuffer = normalizeAudioBuffer(buffer);
      
      // Convert to 16-bit PCM for MP3 encoding
      const samples = floatTo16BitPCM(normalizedBuffer);
      
      // Encode to MP3
      const mp3buf = mp3Encoder.encodeBuffer(samples);
      
      // Send to backend via WebSocket
      if (mp3buf.length > 0 && ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(mp3buf.buffer);
          lastHeartbeat = Date.now();
        } catch (wsError) {
          logError(wsError, 'processAudioBuffer - WebSocket send failed');
          if (ws.readyState !== WebSocket.OPEN) {
            console.warn('[Offscreen] WebSocket disconnected, attempting reconnection...');
            attemptReconnect();
          }
        }
      } else if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn('[Offscreen] WebSocket not ready, audio data dropped');
        
        if (isRecording && (!ws || ws.readyState === WebSocket.CLOSED)) {
          attemptReconnect();
        }
      }
    } catch (error) {
      logError(error, 'processAudioBuffer');
    }
  }

  /**
   * Initialize WebSocket connection
   */
  function initializeWebSocket() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log('[Offscreen] WebSocket already connected');
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = receivedPublicId
          ? `${CONFIG.WS_BASE_URL}?publicId=${encodeURIComponent(receivedPublicId)}`
          : CONFIG.WS_BASE_URL;
        
        console.log('[Offscreen] Connecting to WebSocket:', wsUrl);
        
        ws = new WebSocket(wsUrl);
        ws.binaryType = 'arraybuffer';
        
        const connectionTimeout = setTimeout(() => {
          ws.close();
          reject(new Error('WebSocket connection timeout'));
        }, 10000);
        
        ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('[Offscreen] WebSocket connected successfully');
          connectionAttempts = 0;
          resolve();
        };
        
        ws.onerror = (e) => {
          clearTimeout(connectionTimeout);
          logError(new Error('WebSocket connection error'), 'initializeWebSocket');
          reject(e);
        };
        
        ws.onclose = (e) => {
          console.log(`[Offscreen] WebSocket closed: ${e.code} - ${e.reason}`);
          
          if (isRecording && e.code !== 1000) {
            logError(new Error(`WebSocket unexpected close: ${e.code}`), 'WebSocket.onclose', 'warning');
            attemptReconnect();
          }
        };
        
        ws.onmessage = (e) => {
          console.log('[Offscreen] WebSocket message received:', e.data);
          lastHeartbeat = Date.now();
        };
        
      } catch (error) {
        logError(error, 'initializeWebSocket');
        reject(error);
      }
    });
  }

  /**
   * Attempt WebSocket reconnection
   */
  function attemptReconnect() {
    if (connectionAttempts >= CONFIG.MAX_CONNECTION_ATTEMPTS) {
      logError(new Error('Max reconnection attempts exceeded'), 'attemptReconnect', 'critical');
      stopRecording();
      return;
    }
    
    connectionAttempts++;
    console.log(`[Offscreen] Attempting reconnection ${connectionAttempts}/${CONFIG.MAX_CONNECTION_ATTEMPTS}`);
    
    setTimeout(() => {
      try {
        initializeWebSocket();
      } catch (error) {
        logError(error, 'attemptReconnect');
      }
    }, CONFIG.RECONNECT_DELAY);
  }

  /**
   * Initialize audio modules
   */
  async function initializeAudioModules() {
    console.log('[Offscreen] Initializing audio modules...');
    
    // Create module instances
    tabAudioCapture = new TabAudioCapture();
    micAudioCapture = new MicAudioCapture({
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      sampleRate: CONFIG.SAMPLE_RATE
    });
    audioRouting = new AudioRouting({
      bufferSize: CONFIG.BUFFER_SIZE,
      sampleRate: CONFIG.SAMPLE_RATE
    });
    
    // Set up event callbacks
    setupModuleCallbacks();
    
    console.log('[Offscreen] Audio modules initialized');
  }

  /**
   * Setup callbacks for audio modules
   */
  function setupModuleCallbacks() {
    // Set up audio routing callbacks
    audioRouting.setAudioBufferCallback(processAudioBuffer);
    audioRouting.setErrorCallback((error, context) => {
      logError(error, `AudioRouting: ${context}`);
    });
    
    // Set up global event handlers
    window.onTabStreamEnd = () => {
      logError(new Error('Tab stream ended unexpectedly'), 'onTabStreamEnd', 'warning');
      if (isRecording) {
        stopRecording();
      }
    };
    
    window.onMicStreamEnd = () => {
      console.log('[Offscreen] Microphone stream ended');
    };
    
    window.onMicAccessDenied = (error) => {
      console.warn('[Offscreen] Microphone access denied:', error.message);
    };
  }

  /**
   * Start recording with modular approach
   */
  async function startRecording() {
    try {
      if (isRecording) {
        logError(new Error('Recording already in progress'), 'startRecording');
        return;
      }

      if (!receivedPublicId) {
        console.warn('[Offscreen] publicId is missing. Aborting start and requesting login.');
        try { chrome.runtime.sendMessage({ action: 'loginRequired' }); } catch (_) {}
        return;
      }

      console.log('[Offscreen] Starting recording with publicId:', receivedPublicId);
      
      // Initialize WebSocket connection first
      try {
        await initializeWebSocket();
      } catch (error) {
        logError(error, 'WebSocket initialization failed', 'warning');
        try { chrome.runtime.sendMessage({ action: 'loginRequired' }); } catch (_) {}
        return;
      }

      recordingStartTime = Date.now();
      isRecording = true;
      
      // Initialize audio modules if not already done
      if (!tabAudioCapture || !micAudioCapture || !audioRouting) {
        await initializeAudioModules();
      }
      
      // Start audio capture
      await initializeAudioCapture();
      
    } catch (error) {
      logError(error, 'startRecording', 'critical');
      isRecording = false;
      recordingStartTime = null;
      throw error;
    }
  }

  /**
   * Initialize audio capture using new modules
   */
  async function initializeAudioCapture() {
    try {
      console.log('[Offscreen] Starting audio capture with modular approach...');
      
      // Create AudioContext
      audioContext = new AudioContext({ sampleRate: CONFIG.SAMPLE_RATE });
      console.log('[Offscreen] AudioContext created:', {
        state: audioContext.state,
        sampleRate: audioContext.sampleRate
      });
      
      // Resume AudioContext if suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('[Offscreen] AudioContext resumed');
      }
      
      // Initialize audio routing
      await audioRouting.initialize(audioContext);
      
      // Get microphone stream (optional)
      const micStream = await micAudioCapture.getMicStream();
      if (micStream) {
        audioRouting.connectMicAudio(micStream);
      }
      
      // Get tab stream
      const tabStream = await tabAudioCapture.getTabStream();
      console.log('[Offscreen] Tab stream received');
      audioRouting.connectTabAudio(tabStream);
      
      // Setup audio processing
      try {
        await audioRouting.setupAudioWorklet();
      } catch (error) {
        logError(error, 'setupAudioWorklet', 'warning');
        console.log('[Offscreen] Falling back to ScriptProcessor');
        audioRouting.setupScriptProcessor();
      }
      
      // Initialize MP3 encoder
      mp3Encoder = new lamejs.Mp3Encoder(1, audioContext.sampleRate, CONFIG.MP3_BITRATE);
      console.log('[Offscreen] MP3 encoder initialized');

      console.log('[Offscreen] Audio capture setup complete');

    } catch (error) {
      logError(error, 'initializeAudioCapture', 'critical');
      throw error;
    }
  }

  /**
   * Stop recording
   */
  function stopRecording() {
    console.log('[Offscreen] Stopping recording...');
    
    if (!isRecording) {
      console.log('[Offscreen] Recording not active, skipping stop');
      return;
    }
    
    isRecording = false;
    recordingStartTime = null;
    
    try {
      // Flush MP3 encoder
      if (mp3Encoder) {
        const mp3buf = mp3Encoder.flush();
        if (mp3buf.length > 0 && ws && ws.readyState === WebSocket.OPEN) {
          ws.send(mp3buf.buffer);
        }
        mp3Encoder = null;
      }
      
      // Stop audio modules
      if (tabAudioCapture) {
        tabAudioCapture.stop();
      }
      
      if (micAudioCapture) {
        micAudioCapture.stop();
      }
      
      if (audioRouting) {
        audioRouting.cleanup();
      }
      
      // Close WebSocket
      if (ws) {
        ws.close(1000, 'Recording stopped');
        ws = null;
      }
      
      // Close AudioContext
      if (audioContext) {
        audioContext.close();
        audioContext = null;
      }
      
      console.log('[Offscreen] Recording stopped successfully');
      
      // Notify background script
      try {
        chrome.runtime.sendMessage({ action: 'recordingStopped' });
      } catch (e) {
        console.warn('[Offscreen] Failed to notify background about stop:', e);
      }
      
    } catch (error) {
      logError(error, 'stopRecording', 'warning');
    }
  }

  /**
   * Handle messages from background script
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Offscreen] Message received:', message);
    
    switch (message.action) {
      case 'start':
        receivedPublicId = message.publicId;
        captureTabId = message.tabId;
        startRecording()
          .then(() => sendResponse({ success: true }))
          .catch(error => {
            logError(error, 'start message handler');
            sendResponse({ success: false, error: error.message });
          });
        return true; // Keep message channel open for async response
        
      case 'stop':
        stopRecording();
        sendResponse({ success: true });
        break;
        
      case 'getStatus':
        const status = {
          isRecording,
          isInitialized,
          recordingStartTime,
          connectionAttempts,
          lastHeartbeat,
          audioModules: {
            tabAudio: tabAudioCapture ? tabAudioCapture.isCapturing() : false,
            micAudio: micAudioCapture ? micAudioCapture.isCapturing() : false,
            routing: audioRouting ? audioRouting.getRoutingStatus() : null
          }
        };
        sendResponse(status);
        break;
        
      case 'setGainLevel':
        if (audioRouting && message.source && typeof message.level === 'number') {
          audioRouting.setGainLevel(message.source, message.level);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Invalid parameters or routing not initialized' });
        }
        break;
        
      default:
        console.warn('[Offscreen] Unknown message action:', message.action);
        sendResponse({ success: false, error: 'Unknown action' });
    }
  });

  // Health check interval
  setInterval(() => {
    if (isRecording) {
      const now = Date.now();
      
      // Check for recording timeout
      if (recordingStartTime && (now - recordingStartTime) > CONFIG.MAX_RECORDING_TIME) {
        logError(new Error('Recording time exceeded maximum duration'), 'healthCheck', 'warning');
        stopRecording();
        return;
      }
      
      // Check WebSocket heartbeat
      if ((now - lastHeartbeat) > CONFIG.HEARTBEAT_INTERVAL * 2) {
        logError(new Error('WebSocket heartbeat timeout'), 'healthCheck', 'warning');
        attemptReconnect();
      }
    }
  }, CONFIG.HEARTBEAT_INTERVAL);

  console.log('[Offscreen] Modular offscreen script loaded');
  
  // バックグラウンドに準備完了を通知
  chrome.runtime.sendMessage({ action: 'offscreenReady' });
  console.log('[Offscreen] Sent offscreenReady message to background');
})();