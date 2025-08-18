(() => {
  // Core audio components
  let audioContext, tabSourceNode, micSourceNode, processor, workletNode;
  let ws, tabStream, micStream, mp3Encoder;
  let keepAliveOsc, keepAliveGain, dummyAudio;
  let receivedPublicId = null;
  let captureTabId = null;
  
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

      if (!receivedPublicId) {
        console.warn('[Offscreen] publicId is missing. Aborting start and requesting login.');
        try { chrome.runtime.sendMessage({ action: 'loginRequired' }); } catch (_) {}
        return;
      }

      console.log('[Offscreen] Starting recording with publicId:', receivedPublicId);
      
      // Note: Microphone access is now handled in initializeTabCapture()
      // which uses the new dual audio capture system
      console.log('[Offscreen] Using enhanced dual audio capture system...');
      
      // Initialize WebSocket connection first; if it fails, do not proceed
      try {
        await initializeWebSocket();
      } catch (error) {
        logError(error, 'WebSocket initialization failed', 'warning');
        try { chrome.runtime.sendMessage({ action: 'loginRequired' }); } catch (_) {}
        return;
      }

      recordingStartTime = Date.now();
      isRecording = true;
      
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
   * Initialize audio capture using chrome.tabCapture and getUserMedia
   */
  async function initializeTabCapture() {
    try {
      console.log('[Offscreen] Starting audio capture with stream from background...');
      
      // Try to get microphone access (optional)
      try {
        console.log('[Offscreen] Attempting microphone access...');
        micStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: CONFIG.SAMPLE_RATE
          }
        });
        console.log('[Offscreen] Microphone access granted');
      } catch (e) {
        console.warn('[Offscreen] Microphone access denied, using tab audio only:', e.message);
        micStream = null;
      }
      
      // Get tab stream from background script
      tabStream = await getTabStreamFromBackground();
      console.log('[Offscreen] Tab stream received from background');

      // Initialize audio processing with the captured streams
      await setupAudioProcessing();

      console.log('[Offscreen] Audio capture setup complete');

    } catch (error) {
      logError(error, 'initializeTabCapture', 'critical');
      throw error;
    }
  }



  /**
   * Get tab stream using streamId from background script
   */
  async function getTabStreamFromBackground() {
    console.log('[Offscreen] Attempting to get tab stream from background...');
    
    return new Promise((resolve, reject) => {
      // Get stream ID from background script
      chrome.runtime.sendMessage({
        action: 'getTabStream'
      }, async (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Failed to get stream ID: ${chrome.runtime.lastError.message}`));
          return;
        }

        if (!response || !response.success || !response.streamId) {
          reject(new Error('No stream ID available from background'));
          return;
        }

        console.log('[Offscreen] Got stream ID from background:', response.streamId);

        try {
          // Use the stream ID to get MediaStream via getUserMedia
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              mandatory: {
                chromeMediaSource: 'tab',
                chromeMediaSourceId: response.streamId
              }
            }
          });

          console.log('[Offscreen] Successfully created MediaStream from stream ID');
          
          // Validate stream has audio tracks
          const audioTracks = stream.getAudioTracks();
          if (audioTracks.length === 0) {
            stream.getTracks().forEach(track => track.stop());
            reject(new Error('No audio tracks in stream'));
            return;
          }

          console.log('[Offscreen] Stream audio tracks:', audioTracks.map(t => ({
            kind: t.kind,
            enabled: t.enabled,
            readyState: t.readyState,
            label: t.label,
            id: t.id
          })));

          resolve(stream);

        } catch (streamError) {
          console.error('[Offscreen] Failed to create MediaStream from stream ID:', streamError);
          reject(new Error(`Failed to create MediaStream: ${streamError.message}`));
        }
      });
    });
  }


  
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
   * Setup enhanced audio routing with proper mixing and gain control
   */
  function setupAudioRouting(processor, mediaDestination) {
    console.log('[Offscreen] Setting up enhanced audio routing...');
    
    // Create gain nodes for volume control
    const tabGainNode = audioContext.createGain();
    const micGainNode = audioContext.createGain();
    const masterGainNode = audioContext.createGain();
    
    // Set initial gain levels (can be adjusted later)
    tabGainNode.gain.value = 0.8; // Slightly reduce tab audio to prevent clipping
    micGainNode.gain.value = 1.0; // Keep microphone at full volume
    masterGainNode.gain.value = 1.0; // Master volume
    
    // Create merger for combining audio sources
    const merger = audioContext.createChannelMerger(2); // Use 2 channels for better separation initially
    const mixerGain = audioContext.createGain();
    mixerGain.gain.value = 0.7; // Prevent clipping when mixing
    
    let sourcesConnected = 0;
    
    // Setup display/tab audio source
    if (tabStream) {
      console.log('[Offscreen] Setting up display audio source...');
      tabSourceNode = audioContext.createMediaStreamSource(tabStream);
      
      // Connect: tabSource -> tabGain -> merger (channel 0)
      tabSourceNode.connect(tabGainNode);
      tabGainNode.connect(merger, 0, 0);
      sourcesConnected++;
      
      console.log('[Offscreen] Display audio connected to mixer');
    }
    
    // Setup microphone audio source
    if (micStream) {
      console.log('[Offscreen] Setting up microphone audio source...');
      micSourceNode = audioContext.createMediaStreamSource(micStream);
      
      // Connect: micSource -> micGain -> merger (channel 1)
      micSourceNode.connect(micGainNode);
      micGainNode.connect(merger, 0, 1);
      sourcesConnected++;
      
      console.log('[Offscreen] Microphone audio connected to mixer');
    }
    
    if (sourcesConnected === 0) {
      throw new Error('No audio sources available for routing');
    }
    
    // Create a channel splitter to convert stereo to mono for processing
    const splitter = audioContext.createChannelSplitter(2);
    const monoMerger = audioContext.createChannelMerger(1);
    
    // Connect the routing chain
    merger.connect(mixerGain);
    mixerGain.connect(splitter);
    
    // Mix both channels to mono for processing
    splitter.connect(monoMerger, 0, 0); // Left channel
    splitter.connect(monoMerger, 1, 0); // Right channel (mixed with left)
    
    // Apply master gain and connect to processor
    monoMerger.connect(masterGainNode);
    masterGainNode.connect(processor);
    processor.connect(mediaDestination);
    
    // Store gain nodes for potential runtime adjustment
    if (!window.audioGainControls) {
      window.audioGainControls = {};
    }
    window.audioGainControls.tabGain = tabGainNode;
    window.audioGainControls.micGain = micGainNode;
    window.audioGainControls.masterGain = masterGainNode;
    
    console.log('[Offscreen] Enhanced audio routing complete:', {
      displayAudio: !!tabStream,
      microphoneAudio: !!micStream,
      sourcesConnected
    });
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
   * Process mixed audio buffer and send to WebSocket backend
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
      
      // Apply normalization to prevent clipping in the mixed audio
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
          
          // Log transmission stats periodically
          if (Date.now() - lastHeartbeat > 5000) { // Every 5 seconds
            console.log('[Offscreen] Audio transmission stats:', {
              bufferSize: buffer.length,
              mp3Size: mp3buf.length,
              sampleRate: CONFIG.SAMPLE_RATE,
              bitrate: CONFIG.MP3_BITRATE
            });
          }
        } catch (wsError) {
          logError(wsError, 'processAudioBuffer - WebSocket send failed');
          // Attempt reconnection if send fails
          if (ws.readyState !== WebSocket.OPEN) {
            console.warn('[Offscreen] WebSocket disconnected, attempting reconnection...');
            attemptReconnect();
          }
        }
      } else if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn('[Offscreen] WebSocket not ready, audio data dropped');
        
        // Try to reconnect if recording is active
        if (isRecording && (!ws || ws.readyState === WebSocket.CLOSED)) {
          attemptReconnect();
        }
      }
    } catch (error) {
      logError(error, 'processAudioBuffer');
    }
  }
  
  /**
   * Normalize audio buffer to prevent clipping and improve quality
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
    
    // Apply normalization if needed (prevent clipping while preserving dynamics)
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
          console.log('[Offscreen] Starting recording with publicId:', message.publicId, 'tabId:', message.tabId);
          receivedPublicId = message.publicId;
          captureTabId = typeof message.tabId === 'number' ? message.tabId : null;
          
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