(() => {
  // Core audio components
  let audioContext, tabSourceNode, micSourceNode, processor, workletNode;
  let ws, tabStream, micStream, mp3Encoder;
  let keepAliveOsc, keepAliveGain, dummyAudio;
  let receivedPublicId = null;
  
  // State management
  let isInitialized = false;
  let isRecording = false;
  let recordingStartTime = null;
  let connectionAttempts = 0;
  let lastHeartbeat = Date.now();
  
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
   * Validate audio processing state
   */
  function validateAudioState() {
    const issues = [];
    
    if (isRecording) {
      if (!audioContext) issues.push('Missing AudioContext');
      if (!tabStream) issues.push('Missing tab stream');
      if (!ws || ws.readyState !== WebSocket.OPEN) issues.push('WebSocket not connected');
      if (!mp3Encoder) issues.push('Missing MP3 encoder');
      
      if (recordingStartTime && (Date.now() - recordingStartTime) > CONFIG.MAX_RECORDING_TIME) {
        issues.push('Recording time exceeded maximum duration');
      }
    }
    
    return issues;
  }
  
  /**
   * Perform health check and recovery
   */
  function performHealthCheck() {
    const issues = validateAudioState();
    
    if (issues.length > 0) {
      logError(new Error(`Health check failed: ${issues.join(', ')}`), 'performHealthCheck', 'warning');
      
      // Attempt recovery for critical issues
      if (issues.includes('WebSocket not connected') && isRecording) {
        logError(new Error('WebSocket disconnected during recording'), 'performHealthCheck', 'critical');
        attemptReconnect();
      }
    }
    
    lastHeartbeat = Date.now();
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
  
  // AudioWorkletは物理ファイルとして提供（audio-worklet.js）

  function floatTo16BitPCM(input) {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
  }

  /**
   * Initialize WebSocket connection with error handling and reconnection
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
          connectionAttempts = 0; // Reset on successful connection
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
   * Enhanced recording start with comprehensive error handling
   */
  async function startRecording() {
    try {
      if (isRecording) {
        logError(new Error('Recording already in progress'), 'startRecording');
        return;
      }
      
      console.log('[Offscreen] Starting recording with publicId:', receivedPublicId);
      recordingStartTime = Date.now();
      isRecording = true;
      
      // Try to get microphone access (optional)
      try {
        console.log('[Offscreen] Attempting microphone access...');
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('[Offscreen] Microphone access granted');
      } catch (e) {
        console.warn('[Offscreen] Microphone access denied, using tab audio only:', e.message);
        // This is expected in most cases due to permissions policy
      }
      
      // Initialize WebSocket connection (non-blocking)
      try {
        await initializeWebSocket();
      } catch (error) {
        logError(error, 'WebSocket initialization failed, continuing without it', 'warning');
      }
      
      // Start capture using chrome.tabCapture (pattern B)
      await initializeTabCapture();
      
    } catch (error) {
      logError(error, 'startRecording', 'critical');
      isRecording = false;
      recordingStartTime = null;
      throw error;
    }
  }
  
  /**
   * Initialize tab capture and audio processing
   */
  /**
   * Initialize tab capture via chrome.tabCapture (current tab of offscreen window)
   */
  async function initializeTabCapture() {
    return new Promise((resolve, reject) => {
      // Continue even if WebSocket is not connected
      if (ws && ws.readyState !== WebSocket.OPEN) {
        console.log('[Offscreen] WebSocket not connected, recording without streaming');
      }

      console.log('[Offscreen] Starting tab capture...');

      chrome.tabCapture.capture({ audio: true, video: false }, async (stream) => {
        try {
          if (chrome.runtime.lastError || !stream) {
            throw new Error(chrome.runtime.lastError?.message || 'No stream returned');
          }

          console.log('[Offscreen] Tab capture successful');
          tabStream = stream;

          // Validate stream
          const tracks = stream.getTracks();
          if (tracks.length === 0) {
            throw new Error('No audio tracks in captured stream');
          }

          console.log('[Offscreen] Stream tracks:', tracks.map(t => ({
            kind: t.kind,
            enabled: t.enabled,
            readyState: t.readyState,
            id: t.id
          })));

          // Initialize audio processing
          await setupAudioProcessing();

          console.log('[Offscreen] Recording started successfully');
          resolve();

        } catch (error) {
          logError(error, 'initializeTabCapture', 'critical');
          reject(error);
        }
      });
    });
  }

  /**
   * Initialize display capture (user selects a tab/window), use audio track(s)
   */
  // getDisplayMedia is not used in pattern B
  
  /**
   * Setup audio processing pipeline with error handling
   */
  async function setupAudioProcessing() {
    try {
      console.log('[Offscreen] Setting up audio processing...');
      
      // Create AudioContext
      audioContext = new AudioContext({ sampleRate: CONFIG.SAMPLE_RATE });
      console.log('[Offscreen] AudioContext created:', {
        state: audioContext.state,
        sampleRate: audioContext.sampleRate
      });
      
      // Force resume AudioContext with user interaction simulation
      if (audioContext.state === 'suspended') {
        // Create a user interaction to resume AudioContext
        const resumeAudio = async () => {
          try {
            await audioContext.resume();
            console.log('[Offscreen] AudioContext resumed');
          } catch (e) {
            // If resume fails, create a dummy user interaction
            const button = document.createElement('button');
            button.style.position = 'fixed';
            button.style.top = '10px';
            button.style.left = '10px';
            button.style.zIndex = '10000';
            button.style.padding = '10px';
            button.style.backgroundColor = '#2196F3';
            button.style.color = 'white';
            button.style.border = 'none';
            button.style.borderRadius = '5px';
            button.innerHTML = 'Start Recording';
            document.body.appendChild(button);
            
            button.onclick = async () => {
              await audioContext.resume();
              button.remove();
              console.log('[Offscreen] AudioContext resumed via user click');
            };
            
            // Auto-click after a short delay
            setTimeout(() => {
              button.click();
            }, 100);
          }
        };
        
        await resumeAudio();
      }
      
      // Monitor AudioContext state
      audioContext.onstatechange = () => {
        console.log('[Offscreen] AudioContext state changed to:', audioContext.state);
        if (audioContext.state === 'suspended' && isRecording) {
          audioContext.resume().catch(e => logError(e, 'AudioContext resume'));
        }
      };
      
      // Create destination and keep-alive components
      const mediaDestination = audioContext.createMediaStreamDestination();
      setupKeepAlive(mediaDestination);
      
      // Setup audio worklet or fallback to ScriptProcessor
      try {
        await setupAudioWorklet(mediaDestination);
      } catch (error) {
        logError(error, 'setupAudioWorklet', 'warning');
        console.log('[Offscreen] Falling back to ScriptProcessor');
        setupScriptProcessor(mediaDestination);
      }
      
      // Initialize MP3 encoder
      mp3Encoder = new lamejs.Mp3Encoder(1, audioContext.sampleRate, CONFIG.MP3_BITRATE);
      console.log('[Offscreen] MP3 encoder initialized');
      
      // Connect tab audio to speakers
      tabSourceNode.connect(audioContext.destination);
      console.log('[Offscreen] Audio processing setup complete');
      
    } catch (error) {
      logError(error, 'setupAudioProcessing', 'critical');
      throw error;
    }
  }
  
  /**
   * Setup keep-alive components to prevent AudioContext suspension
   */
  function setupKeepAlive(mediaDestination) {
    try {
      keepAliveOsc = audioContext.createOscillator();
      keepAliveGain = audioContext.createGain();
      keepAliveGain.gain.value = 0;
      keepAliveOsc.connect(keepAliveGain).connect(mediaDestination);
      keepAliveOsc.start();
      
      dummyAudio = document.createElement('audio');
      dummyAudio.srcObject = mediaDestination.stream;
      dummyAudio.muted = true;
      dummyAudio.autoplay = true;
      document.body.appendChild(dummyAudio);
      
      console.log('[Offscreen] Keep-alive components setup');
    } catch (error) {
      logError(error, 'setupKeepAlive', 'warning');
    }
  }
  
  /**
   * Setup AudioWorklet for audio processing
   */
  async function setupAudioWorklet(mediaDestination) {
    const workletUrl = chrome.runtime.getURL('audio-worklet.js');
    await audioContext.audioWorklet.addModule(workletUrl);
    
    workletNode = new AudioWorkletNode(audioContext, 'audio-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 1,
    });
    
    // Setup message handling
    workletNode.port.onmessage = (event) => {
      if (event.data.type === 'buffer') {
        processAudioBuffer(event.data.buffer);
      } else {
        console.log('[Offscreen] Unknown worklet message:', event.data);
      }
    };
    
    // Setup audio routing
    setupAudioRouting(workletNode, mediaDestination);
    
    console.log('[Offscreen] AudioWorklet setup complete');
  }
  
  /**
   * Setup audio routing between sources and processors
   */
  function setupAudioRouting(processor, mediaDestination) {
    // Create source nodes
    tabSourceNode = audioContext.createMediaStreamSource(tabStream);
    console.log('[Offscreen] Created tab source node');
    
    // Create merger for combining audio sources
    const merger = audioContext.createChannelMerger(1);
    tabSourceNode.connect(merger, 0, 0);
    
    if (micStream) {
      console.log('[Offscreen] Setting up microphone source...');
      micSourceNode = audioContext.createMediaStreamSource(micStream);
      micSourceNode.connect(merger, 0, 0);
      console.log('[Offscreen] Microphone connected');
    }
    
    // Connect to processor
    merger.connect(processor);
    processor.connect(mediaDestination);
    
    console.log('[Offscreen] Audio routing complete');
  }
  
  /**
   * Setup ScriptProcessor fallback for older browsers
   */
  function setupScriptProcessor(mediaDestination) {
    try {
      // Create script processor
      processor = audioContext.createScriptProcessor(CONFIG.BUFFER_SIZE, 1, 1);
      
      // Setup audio routing
      setupAudioRouting(processor, mediaDestination);
      
      // Setup audio processing
      processor.onaudioprocess = (e) => {
        try {
          const inputData = e.inputBuffer.getChannelData(0);
          const output = e.outputBuffer.getChannelData(0);
          output.set(inputData);
          
          processAudioBuffer(inputData);
        } catch (error) {
          logError(error, 'ScriptProcessor.onaudioprocess');
        }
      };
      
      console.log('[Offscreen] ScriptProcessor setup complete');
    } catch (error) {
      logError(error, 'setupScriptProcessor', 'critical');
      throw error;
    }
  }
  
  /**
   * Process audio buffer and send to WebSocket
   */
  function processAudioBuffer(buffer) {
    try {
      if (!isRecording || !mp3Encoder) {
        return;
      }
      
      const samples = floatTo16BitPCM(buffer);
      const mp3buf = mp3Encoder.encodeBuffer(samples);
      
      if (mp3buf.length > 0 && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(mp3buf.buffer);
        lastHeartbeat = Date.now();
      }
    } catch (error) {
      logError(error, 'processAudioBuffer');
    }
  }

  /**
   * Enhanced stop recording with comprehensive cleanup
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
      // Flush MP3 encoder first to ensure no data loss
      if (mp3Encoder && ws && ws.readyState === WebSocket.OPEN) {
        try {
          const mp3bufFlush = mp3Encoder.flush();
          if (mp3bufFlush.length > 0) {
            ws.send(mp3bufFlush.buffer);
            console.log('[Offscreen] Final MP3 data sent');
          }
        } catch (e) {
          logError(e, 'stopRecording - MP3 flush');
        }
      }
      
      // Clean up audio nodes with error handling
      cleanupAudioNodes();
      
      // Stop media streams
      cleanupMediaStreams();
      
      // Clean up WebSocket
      cleanupWebSocket();
      
      // Clean up keep-alive components
      cleanupKeepAlive();
      
      // Close AudioContext
      cleanupAudioContext();
      
      // Reset state
      connectionAttempts = 0;
      
      console.log('[Offscreen] Recording stopped and cleanup completed');
      
    } catch (error) {
      logError(error, 'stopRecording', 'critical');
    } finally {
      // Notify background of completion
      notifyRecordingStopped();
      
      // Close window after delay
      setTimeout(() => {
        try {
          window.close();
        } catch (e) {
          console.error('[Offscreen] Error closing window:', e);
        }
      }, 300);
    }
  }
  
  /**
   * Clean up audio nodes
   */
  function cleanupAudioNodes() {
    const nodes = [
      { node: processor, name: 'processor' },
      { node: workletNode, name: 'workletNode' },
      { node: tabSourceNode, name: 'tabSourceNode' },
      { node: micSourceNode, name: 'micSourceNode' }
    ];
    
    nodes.forEach(({ node, name }) => {
      if (node) {
        try {
          node.disconnect();
          console.log(`[Offscreen] Disconnected ${name}`);
        } catch (e) {
          logError(e, `cleanupAudioNodes - ${name}`);
        }
      }
    });
    
    processor = null;
    workletNode = null;
    tabSourceNode = null;
    micSourceNode = null;
    mp3Encoder = null;
  }
  
  /**
   * Clean up media streams
   */
  function cleanupMediaStreams() {
    [tabStream, micStream].forEach((stream, index) => {
      if (stream) {
        try {
          stream.getTracks().forEach(track => {
            track.stop();
            console.log(`[Offscreen] Stopped ${track.kind} track`);
          });
        } catch (e) {
          logError(e, `cleanupMediaStreams - stream ${index}`);
        }
      }
    });
    
    tabStream = null;
    micStream = null;
  }
  
  /**
   * Clean up WebSocket connection
   */
  function cleanupWebSocket() {
    if (ws) {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1000, 'Recording stopped');
        }
        console.log('[Offscreen] WebSocket closed');
      } catch (e) {
        logError(e, 'cleanupWebSocket');
      }
      ws = null;
    }
  }
  
  /**
   * Clean up keep-alive components
   */
  function cleanupKeepAlive() {
    if (keepAliveOsc) {
      try {
        keepAliveOsc.stop();
        console.log('[Offscreen] Keep-alive oscillator stopped');
      } catch (e) {
        logError(e, 'cleanupKeepAlive - oscillator');
      }
      keepAliveOsc = null;
    }
    
    if (keepAliveGain) {
      try {
        keepAliveGain.disconnect();
      } catch (e) {
        logError(e, 'cleanupKeepAlive - gain');
      }
      keepAliveGain = null;
    }
    
    if (dummyAudio) {
      try {
        dummyAudio.pause();
        dummyAudio.srcObject = null;
        if (dummyAudio.parentNode) {
          dummyAudio.remove();
        }
        console.log('[Offscreen] Dummy audio element removed');
      } catch (e) {
        logError(e, 'cleanupKeepAlive - audio');
      }
      dummyAudio = null;
    }
  }
  
  /**
   * Clean up AudioContext
   */
  function cleanupAudioContext() {
    if (audioContext) {
      try {
        // Don't await this as it might hang
        audioContext.close().catch(e => 
          logError(e, 'cleanupAudioContext - close')
        );
        console.log('[Offscreen] AudioContext close initiated');
      } catch (e) {
        logError(e, 'cleanupAudioContext');
      }
      audioContext = null;
    }
  }
  
  /**
   * Notify background script that recording has stopped
   */
  function notifyRecordingStopped() {
    try {
      chrome.runtime.sendMessage({ action: 'recordingStopped' });
      console.log('[Offscreen] Sent recordingStopped notification');
    } catch (e) {
      logError(e, 'notifyRecordingStopped');
    }
  }
  
  /**
   * Enhanced message handler with validation and error handling
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      console.log('[Offscreen] Received message:', message);
      
      if (!message || typeof message.action !== 'string') {
        logError(new Error('Invalid message format'), 'onMessage');
        return false;
      }
      
      switch (message.action) {
        case 'startRecordingInOffscreen':
          console.log('[Offscreen] Starting recording with publicId:', message.publicId);
          receivedPublicId = message.publicId;
          
          startRecording()
            .then(() => {
              console.log('[Offscreen] Recording started successfully');
            })
            .catch(error => {
              logError(error, 'startRecordingInOffscreen', 'critical');
            });
          break;
          
        case 'stopRecordingInOffscreen':
          console.log('[Offscreen] Stopping recording');
          stopRecording();
          break;
          
        case 'getStatus':
          sendResponse({
            isRecording,
            recordingStartTime,
            connectionAttempts,
            lastHeartbeat,
            errorCount: errorLog.length
          });
          break;
          
        default:
          logError(new Error(`Unknown action: ${message.action}`), 'onMessage');
          break;
      }
    } catch (error) {
      logError(error, 'onMessage', 'critical');
    }
    
    return false;
  });

  /**
   * Enhanced error reporting with context
   */
  function reportError(error, context = '') {
    try {
      const errorData = {
        action: 'recordingError',
        error: error.toString(),
        context,
        timestamp: new Date().toISOString(),
        stack: error.stack || 'No stack trace'
      };
      
      chrome.runtime.sendMessage(errorData);
      console.error('[Offscreen] Reported error to background:', errorData);
    } catch (e) {
      console.error('[Offscreen] Failed to report error:', e);
    }
  }
  
  /**
   * Start health monitoring
   */
  function startHealthMonitoring() {
    setInterval(() => {
      try {
        performHealthCheck();
      } catch (error) {
        logError(error, 'healthMonitoring');
      }
    }, CONFIG.HEARTBEAT_INTERVAL);
  }
  
  /**
   * Initialize offscreen document
   */
  function initializeOffscreen() {
    try {
      console.log('[Offscreen] Initializing offscreen document...');
      
      isInitialized = true;
      
      // Start health monitoring
      startHealthMonitoring();
      
      // Notify background that offscreen is ready
      chrome.runtime.sendMessage({ action: 'offscreenReady' });
      
      console.log('[Offscreen] Initialization complete');
      
    } catch (error) {
      logError(error, 'initializeOffscreen', 'critical');
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeOffscreen);
  } else {
    initializeOffscreen();
  }
})();