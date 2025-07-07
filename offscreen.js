(() => {
  let audioContext, tabSourceNode, micSourceNode, processor, workletNode;
  let ws, tabStream, micStream, mp3Encoder;
  let keepAliveOsc, keepAliveGain, dummyAudio;
  let WS_URL = 'ws://localhost:3001/ws?id='; // WebSocketサーバーのURL (ローカル開発用)
  let receivedPublicId = null;
  
  // AudioWorkletは物理ファイルとして提供（audio-worklet.js）

  function floatTo16BitPCM(input) {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
  }

  // Try to get microphone access (will fail in most contexts due to permission policy)
  async function startRecording() {
    try {
      console.log('Attempting to access microphone...');
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted');
    } catch (e) {
      console.warn('Microphone access denied, recording tab audio only:', e);
      // This is expected in most cases due to permissions policy
    }
    // publicIdを含めたWebSocket URLを生成
    const baseUrl = 'ws://localhost:3001/ws';
    const wsUrl = receivedPublicId
      ? `${baseUrl}?publicId=${encodeURIComponent(receivedPublicId)}`
      : baseUrl;
    console.log('[offscreen.js] WebSocket接続URL:', wsUrl);
    ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    ws.onerror = (e) => console.error('WebSocket error', e);
    ws.onopen = () => {
      chrome.tabCapture.capture({ audio: true, video: false }, async (s) => {
          if (chrome.runtime.lastError || !s) {
            console.error('Tab capture failed', chrome.runtime.lastError || 'No stream returned');
            return;
          }
          tabStream = s;
              audioContext = new AudioContext();
              audioContext.resume().catch((e) => console.warn('AudioContext resume failed:', e));
              audioContext.onstatechange = () => {
                if (audioContext.state === 'suspended') {
                  audioContext.resume().catch((e) => console.warn('AudioContext resume failed:', e));
                }
              };
              const mediaDestination = audioContext.createMediaStreamDestination();
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
              try {
                // Load the audio worklet from a physical file
                const workletUrl = chrome.runtime.getURL('audio-worklet.js');
                await audioContext.audioWorklet.addModule(workletUrl);
              
              // Create worklet node
              workletNode = new AudioWorkletNode(audioContext, 'audio-processor', {
                numberOfInputs: 1,
                numberOfOutputs: 1,
                channelCount: 1,
              });
              
              // Set up message handling from the worklet
              workletNode.port.onmessage = (event) => {
                if (event.data.type === 'buffer') {
                  const samples = floatTo16BitPCM(event.data.buffer);
                  const mp3buf = mp3Encoder.encodeBuffer(samples);
                  if (mp3buf.length > 0 && ws.readyState === WebSocket.OPEN) {
                    ws.send(mp3buf.buffer);
                  }
                }
              };
              
              // mp3Encoder初期化は後で行う
              
              // Set up audio nodes
              tabSourceNode = audioContext.createMediaStreamSource(tabStream);
              
              // Create a merger node to combine tab and mic audio if mic is available
              const merger = audioContext.createChannelMerger(1);
              tabSourceNode.connect(merger, 0, 0);
              
              if (micStream) {
                micSourceNode = audioContext.createMediaStreamSource(micStream);
                micSourceNode.connect(merger, 0, 0);
              }
              
              // Connect to worklet for processing
              merger.connect(workletNode);
              workletNode.connect(mediaDestination);
              
              console.log('AudioWorkletNode setup complete');
              
              // Initialize mp3Encoder for AudioWorklet
              const sampleRate = audioContext.sampleRate;
              mp3Encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);
              
              // タブ音声をスピーカーに戻す
              tabSourceNode.connect(audioContext.destination);
            } catch (e) {
              console.error('AudioWorklet failed to load:', e);
              
              // Fallback to ScriptProcessor if AudioWorklet fails
              console.warn('Falling back to ScriptProcessor');
              tabSourceNode = audioContext.createMediaStreamSource(tabStream);
              if (micStream) {
                micSourceNode = audioContext.createMediaStreamSource(micStream);
              }
              processor = audioContext.createScriptProcessor(4096, 1, 1);
              tabSourceNode.connect(processor);
              if (micSourceNode) {
                micSourceNode.connect(processor);
              }
              processor.connect(mediaDestination);
              
              // Initialize mp3Encoder for ScriptProcessor fallback
              const sampleRate = audioContext.sampleRate;
              mp3Encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);
              
              // タブ音声をスピーカーに戻す
              tabSourceNode.connect(audioContext.destination);
              
              processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const output = e.outputBuffer.getChannelData(0);
                output.set(inputData);
                const samples = floatTo16BitPCM(inputData);
                const mp3buf = mp3Encoder.encodeBuffer(samples);
                if (mp3buf.length > 0 && ws.readyState === WebSocket.OPEN) {
                  ws.send(mp3buf.buffer);
                }
              };
            }
      });
    };
  }

  function stopRecording() {
    if (processor) processor.disconnect();
    if (tabSourceNode) tabSourceNode.disconnect();
    if (micSourceNode) micSourceNode.disconnect();
    if (tabStream) tabStream.getTracks().forEach((t) => t.stop());
    if (micStream) micStream.getTracks().forEach((t) => t.stop());
    if (mp3Encoder) {
      const mp3bufFlush = mp3Encoder.flush();
      if (mp3bufFlush.length > 0 && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(mp3bufFlush.buffer);
      }
    }
    if (ws) ws.close();
    if (keepAliveOsc) keepAliveOsc.stop();
    if (keepAliveGain) keepAliveGain.disconnect();
    if (dummyAudio) {
      dummyAudio.pause();
      dummyAudio.srcObject = null;
      dummyAudio.remove();
    }
    if (audioContext) {
      audioContext.close().catch((e) => console.warn('AudioContext close failed:', e));
    }
    try {
      // Don't use Offscreen API as it's not supported in your Chrome version
      window.close();
    } catch (e) {
      console.error('Error closing window:', e);
    }
  }

  // Listen for commands from background
  chrome.runtime.onMessage.addListener((message) => {
    if (!message || !message.action) return;
    if (message.action === 'startRecordingInOffscreen') {
      receivedPublicId = message.publicId;
      startRecording();
    } else if (message.action === 'stopRecordingInOffscreen') {
      stopRecording();
    }
  });

  // Error handler to report back to background script
  function reportError(error) {
    try {
      chrome.runtime.sendMessage({
        action: 'recordingError',
        error: error.toString()
      });
    } catch (e) {
      console.error('Failed to report error:', e);
    }
  }

  // Notify background that offscreen document is ready
  try {
    console.log('Offscreen document initialized, notifying background...');
    chrome.runtime.sendMessage({ action: 'offscreenReady' });
  } catch (e) {
    console.error('Failed to notify background of readiness:', e);
  }
})();
