// Background service worker: handle recording control and audio processing
let pendingStartRecording = false;
let isRecording = false;
let recordingWindowId = null;
let recordingTabId = null;
let recordingStartTime = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
// const RECORDING_TIMEOUT = 300000; // 5 minutes max recording time - removed timeout limit

// publicIdを保持するグローバル変数
let globalPublicId = null;
let captureTargetTabId = null;
let globalTabStream = null;
let globalTabStreamId = null;

// Health check and monitoring
let healthCheckInterval = null;
let lastHealthCheck = Date.now();

// Error tracking
const errorLog = [];
const MAX_ERROR_LOG_SIZE = 100;

/**
 * Log errors with timestamp and context
 */
function logError(error, context = '') {
  const errorEntry = {
    timestamp: new Date().toISOString(),
    error: error.toString(),
    context,
    stack: error.stack || 'No stack trace'
  };
  
  errorLog.push(errorEntry);
  if (errorLog.length > MAX_ERROR_LOG_SIZE) {
    errorLog.shift();
  }
  
  console.error(`[Background Error] ${context}:`, error);
}

/**
 * Validate recording state consistency
 */
function validateRecordingState() {
  const now = Date.now();
  
  // Check for stuck recording - timeout check removed
  
  // Check for orphaned windows
  if (recordingWindowId && isRecording) {
    chrome.windows.get(recordingWindowId).catch(() => {
      logError(new Error('Recording window lost'), 'validateRecordingState');
      resetRecordingState();
    });
  }
  
  return true;
}

/**
 * Force stop recording and cleanup
 */
function forceStopRecording() {
  console.log('[Background] Force stopping recording due to error or timeout');
  
  pendingStartRecording = false;
  isRecording = false;
  recordingStartTime = null;
  
  if (recordingWindowId) {
    try {
      chrome.windows.remove(recordingWindowId);
    } catch (e) {
      logError(e, 'forceStopRecording - window removal');
    }
    recordingWindowId = null;
    recordingTabId = null;
  }
  
  // Send broadcast stop message
  try {
    chrome.runtime.sendMessage({ action: 'stopRecordingInOffscreen' });
  } catch (e) {
    logError(e, 'forceStopRecording - message send');
  }
}

/**
 * Reset all recording state
 */
function resetRecordingState() {
  pendingStartRecording = false;
  isRecording = false;
  recordingWindowId = null;
  recordingTabId = null;
  recordingStartTime = null;
  reconnectAttempts = 0;
}

/**
 * Start health monitoring
 */
function startHealthMonitoring() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
  
  healthCheckInterval = setInterval(() => {
    try {
      validateRecordingState();
      lastHealthCheck = Date.now();
    } catch (e) {
      logError(e, 'healthCheck');
    }
  }, 10000); // Check every 10 seconds
}

// Initialize health monitoring
startHealthMonitoring();

/**
 * Create offscreen document using Chrome's offscreen API
 */
async function openOffscreenWindow() {
  try {
    // Check if chrome.offscreen API is available
    if (!chrome.offscreen || typeof chrome.offscreen.createDocument !== 'function') {
      console.warn('[Background] chrome.offscreen API not available, using fallback method');
      throw new Error('chrome.offscreen API not available');
    }
    
    // Check if chrome.runtime.getContexts is available
    if (chrome.runtime.getContexts && typeof chrome.runtime.getContexts === 'function') {
      // Check if offscreen document already exists
      const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
      });
      
      if (existingContexts.length > 0) {
        console.log('[Background] Offscreen document already exists');
        return existingContexts[0];
      }
    } else {
      console.warn('[Background] chrome.runtime.getContexts not available, skipping existence check');
    }
    
    // Create offscreen document
    console.log('[Background] Creating offscreen document...');
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Recording audio from tab and microphone'
    });
    
    console.log('[Background] Offscreen document created successfully');
    return { id: 'offscreen' }; // Mock window object
    
  } catch (e) {
    console.error('Error creating offscreen document:', e);
    
    // Fallback to popup window method
    console.log('[Background] Falling back to popup window method...');
    try {
      const url = chrome.runtime.getURL('offscreen.html');
      console.log('[Background] Attempting to create window with URL:', url);
      
      const win = await chrome.windows.create({
        url,
        type: 'popup',
        focused: true,
        width: 800,
        height: 600,
        left: 50,
        top: 50,
        state: 'normal'
      });
      
      // Force window to front
      setTimeout(async () => {
        try {
          await chrome.windows.update(win.id, { focused: true });
          console.log('[Background] Window forced to front');
        } catch (e) {
          console.error('Error focusing window:', e);
        }
      }, 100);
      
      console.log('[Background] Window creation result:', win);
      recordingWindowId = win.id;
      if (win.tabs && win.tabs.length > 0) {
        recordingTabId = win.tabs[0].id;
      }
      
      return win;
    } catch (fallbackError) {
      console.error('Fallback window creation failed:', fallbackError);
      return null;
    }
  }
}
// Handle messages from popup and offscreen window
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) {
    logError(new Error('Invalid message format'), 'onMessage');
    return false;
  }
  
  console.log('Background received message:', message.action);
  
  try {
    switch (message.action) {
      case 'startRecording':
        return handleStartRecording(sendResponse);
        
      case 'stopRecording':
        return handleStopRecording(sendResponse);
        
      case 'getRecordingStatus':
        return handleGetRecordingStatus(sendResponse);
        
      case 'offscreenReady':
        return handleOffscreenReady();
        
      case 'recordingStopped':
        return handleRecordingStopped();
        
      case 'recordingError':
        return handleRecordingError(message);
        
      case 'getErrorLog':
        sendResponse({ errorLog: errorLog.slice(-10) }); // Last 10 errors
        return false;
        
      case 'getHealthStatus':
        sendResponse({
          isRecording,
          pendingStartRecording,
          recordingStartTime,
          lastHealthCheck,
          uptime: Date.now() - lastHealthCheck
        });
        return false;
      
      case 'promptResponse':
        return handlePromptResponse(message, sender);
      
      case 'loginRequired':
        try {
          showLoginRequiredBanner();
        } catch (e) {
          logError(e, 'onMessage - loginRequired');
        }
        return false;

      case 'focusOrOpenParatalk':
        try {
          focusOrOpenParatalk();
        } catch (e) {
          logError(e, 'onMessage - focusOrOpenParatalk');
        }
        return false;

      case 'openParatalkMeeting':
        try {
          focusOrOpenParatalkMeeting();
        } catch (e) {
          logError(e, 'onMessage - openParatalkMeeting');
        }
        return false;

      case 'executeTabCapture':
        return handleExecuteTabCapture(message, sendResponse);

      case 'getTabStream':
        return handleGetTabStream(sendResponse);
        
      default:
        logError(new Error(`Unknown action: ${message.action}`), 'onMessage');
        sendResponse({ error: 'Unknown action' });
        return false;
    }
  } catch (error) {
    logError(error, `onMessage - ${message.action}`);
    sendResponse({ error: 'Internal error occurred' });
    return false;
  }
});

/**
 * Handle start recording request with validation and error handling
 */
function handleStartRecording(sendResponse) {
  console.log('[Background] handleStartRecording called');
  try {
    // Validate current state
    if (isRecording || pendingStartRecording) {
      console.log('[Background] Recording already in progress, ignoring start request');
      sendResponse({ error: 'Recording already in progress' });
      return false;
    }
    
    // Validate system capabilities
    if (!chrome.tabCapture) {
      console.error('[Background] TabCapture API not available');
      logError(new Error('TabCapture API not available'), 'handleStartRecording');
      sendResponse({ error: 'Audio capture not supported' });
      return false;
    }
    
    console.log('[Background] Starting recording process...');
    
    // Reset state
    resetRecordingState();
    recordingStartTime = Date.now();
    
    // Determine capture target tab: prefer Meet tab in current window, fallback to active tab
    try {
      chrome.tabs.query({ currentWindow: true, url: 'https://meet.google.com/*' }, (meetTabs) => {
        try {
          let target = null;
          if (Array.isArray(meetTabs) && meetTabs.length > 0) {
            target = meetTabs.find(t => t.active) || meetTabs[0];
          }
          if (target && target.id) {
            captureTargetTabId = target.id;
            console.log('[Background] Selected captureTargetTabId (meet):', captureTargetTabId);
          } else {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              try {
                const activeTab = tabs && tabs[0];
                captureTargetTabId = activeTab && activeTab.id ? activeTab.id : null;
                console.log('[Background] Selected captureTargetTabId (active):', captureTargetTabId);
              } catch (e) {
                logError(e, 'handleStartRecording - select active tab');
              }
            });
          }
        } catch (e) {
          logError(e, 'handleStartRecording - select meet tab');
        }
      });
    } catch (e) {
      logError(e, 'handleStartRecording - tabs.query meet');
    }

    // Find public IDs with timeout
    const publicIdTimeout = setTimeout(() => {
      logError(new Error('Public ID search timeout'), 'handleStartRecording');
      pendingStartRecording = false;
      sendResponse({ error: 'Initialization timeout' });
    }, 10000);
    
    console.log('[Background] Calling findAllPublicIds...');
    findAllPublicIds((publicIds) => {
      console.log('[Background] findAllPublicIds callback called with:', publicIds);
      clearTimeout(publicIdTimeout);
      
      if (publicIds.length > 0) {
        globalPublicId = publicIds[0].public_id;
        console.log("[Background] Found public_id:", globalPublicId);
      } else {
        globalPublicId = null;
        console.log("[Background] No public_id found");
        // Show login required banner and abort start
        try { showLoginRequiredBanner(); } catch (e) { logError(e, 'handleStartRecording - showLoginRequiredBanner'); }
        pendingStartRecording = false;
        recordingStartTime = null;
        sendResponse({ error: 'loginRequired' });
        return false;
      }
      
        pendingStartRecording = true;
      console.log('[Background] Calling ensureOffscreenDocument...');
      
        ensureOffscreenDocument()
          .then(() => {
          console.log('[Background] Recording start initiated successfully');
            sendResponse({ success: true });
          })
          .catch((error) => {
          console.error('[Background] ensureOffscreenDocument failed:', error);
          logError(error, 'handleStartRecording - ensureOffscreenDocument');
            pendingStartRecording = false;
          recordingStartTime = null;
          sendResponse({ error: error.message || 'Failed to initialize recording' });
        });
    });
    
    return true; // Async response
  } catch (error) {
    logError(error, 'handleStartRecording');
            pendingStartRecording = false;
    recordingStartTime = null;
    sendResponse({ error: 'Failed to start recording' });
    return false;
  }
}

/**
 * Handle stop recording request
 */
function handleStopRecording(sendResponse) {
  try {
    if (!isRecording && !pendingStartRecording) {
      console.log('Stop requested but not recording');
      sendResponse({ success: true });
        return false;
    }
    
    pendingStartRecording = false;
    console.log('Initiating stop recording process');
    
    // Set up timeout for stop operation
    const stopTimeoutId = setTimeout(() => {
      logError(new Error('Stop operation timeout'), 'handleStopRecording');
      forceStopRecording();
      sendResponse({ success: true });
    }, 10000);
    
    // Set up stop completion listener
    const stopListener = (message) => {
      if (message && message.action === 'recordingStopped') {
        console.log('Recording stop confirmed by offscreen');
        clearTimeout(stopTimeoutId);
        chrome.runtime.onMessage.removeListener(stopListener);
        
        isRecording = false;
        recordingStartTime = null;
        
        // Close window after confirmation
        if (recordingWindowId) {
          setTimeout(() => {
          try {
            chrome.windows.remove(recordingWindowId);
              console.log('Recording window closed');
          } catch (e) {
              logError(e, 'handleStopRecording - window close');
          }
          }, 100);
          recordingWindowId = null;
          recordingTabId = null;
        }
        
        sendResponse({ success: true });
      }
    };
    
    chrome.runtime.onMessage.addListener(stopListener);
    
    // Send stop message
    try {
      chrome.runtime.sendMessage({ action: 'stopRecordingInOffscreen' });
    } catch (e) {
      logError(e, 'handleStopRecording - message send');
      clearTimeout(stopTimeoutId);
      chrome.runtime.onMessage.removeListener(stopListener);
      forceStopRecording();
      sendResponse({ error: 'Failed to send stop message' });
    }
    
    return true; // Async response
  } catch (error) {
    logError(error, 'handleStopRecording');
    forceStopRecording();
    sendResponse({ error: 'Failed to stop recording' });
    return false;
  }
}

/**
 * Handle recording status request
 */
function handleGetRecordingStatus(sendResponse) {
  try {
    console.log('[background.js] Status check - isRecording:', isRecording, 'pendingStart:', pendingStartRecording, 'windowId:', recordingWindowId);
    
    if (pendingStartRecording) {
      sendResponse({ isRecording: false, isPending: true });
        return false;
    }
    
    if (isRecording && recordingWindowId) {
      chrome.windows.get(recordingWindowId)
        .then(() => {
          console.log('[background.js] Recording window exists, confirming recording active');
          sendResponse({ 
            isRecording: true, 
            startTime: recordingStartTime,
            duration: recordingStartTime ? Date.now() - recordingStartTime : 0
          });
        })
        .catch(() => {
          logError(new Error('Recording window missing during status check'), 'handleGetRecordingStatus');
          resetRecordingState();
          sendResponse({ isRecording: false });
        });
      return true;
    } else {
        sendResponse({ isRecording });
        return false;
    }
  } catch (error) {
    logError(error, 'handleGetRecordingStatus');
    sendResponse({ isRecording: false, error: 'Status check failed' });
    return false;
  }
}

/**
 * Handle offscreen ready notification
 */
async function handleOffscreenReady() {
  try {
    console.log('Offscreen document ready');
    if (pendingStartRecording) {
      try {
        // Bring target Meet tab to front so fallback capture() can target it if needed
        if (captureTargetTabId) {
          const tab = await chrome.tabs.get(captureTargetTabId).catch(() => null);
          if (tab && tab.windowId) {
            try { await chrome.windows.update(tab.windowId, { focused: true }); } catch (e) { logError(e, 'handleOffscreenReady - focus window'); }
            try { await chrome.tabs.update(captureTargetTabId, { active: true }); } catch (e) { logError(e, 'handleOffscreenReady - activate tab'); }
            // small delay to ensure focus takes effect before capture
            await new Promise(r => setTimeout(r, 150));
          }
        }

        console.log('Starting chrome.tabCapture for tab:', captureTargetTabId);
        
        // Execute chrome.tabCapture in background script
        try {
          const result = await captureTabAudio(captureTargetTabId);
          console.log('[Background] Tab capture successful, result:', result);
          
          // Send stream ID and recording data to offscreen document
          await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ 
              action: 'startRecordingInOffscreen', 
              publicId: globalPublicId,
              tabId: captureTargetTabId,
              streamId: result.streamId,
              hasTabStream: true
            }, (response) => {
              if (chrome.runtime.lastError) {
                const error = chrome.runtime.lastError;
                if (error.message && error.message.includes('Receiving end does not exist')) {
                  console.warn('[Background] Offscreen document not ready yet, retrying...');
                  // Retry after a short delay
                  setTimeout(() => {
                    chrome.runtime.sendMessage({ 
                      action: 'startRecordingInOffscreen', 
                      publicId: globalPublicId,
                      tabId: captureTargetTabId,
                      streamId: result.streamId,
                      hasTabStream: true
                    }, () => {
                      if (chrome.runtime.lastError) {
                        reject(new Error(`Message send failed: ${chrome.runtime.lastError.message}`));
                      } else {
                        resolve();
                      }
                    });
                  }, 500);
                } else {
                  reject(new Error(`Message send failed: ${error.message}`));
                }
              } else {
                resolve(response);
              }
            });
          });
          
          pendingStartRecording = false;
          isRecording = true;
          console.log('[Background] Recording start message sent successfully');
          
        } catch (messageError) {
          logError(messageError, 'handleOffscreenReady - message send failed');
          pendingStartRecording = false;
          recordingStartTime = null;
          
          // Try to restart offscreen document
          console.warn('[Background] Attempting to recreate offscreen document...');
          try {
            await ensureOffscreenDocument();
          } catch (recreateError) {
            logError(recreateError, 'handleOffscreenReady - recreate offscreen failed');
          }
        }
      } catch (e) {
        logError(e, 'handleOffscreenReady - general error');
        pendingStartRecording = false;
        recordingStartTime = null;
      }
    }
    return false;
  } catch (error) {
    logError(error, 'handleOffscreenReady');
    pendingStartRecording = false;
    recordingStartTime = null;
    return false;
  }
}

/**
 * Handle recording stopped notification
 */
function handleRecordingStopped() {
  try {
    console.log('Recording stopped notification received');
    // This is handled by the listener in handleStopRecording
    return false;
  } catch (error) {
    logError(error, 'handleRecordingStopped');
    return false;
  }
}

/**
 * Handle recording error notification
 */
function handleRecordingError(message) {
  try {
    const error = new Error(message.error || 'Unknown recording error');
    const errorDetails = message.details || {};
    
    logError(error, 'Recording error from offscreen');
    console.log('[Background] Error details:', errorDetails);
    
    // Provide specific guidance based on error type
    if (error.message.includes('activeTab') || error.message.includes('Permission')) {
      console.warn('[Background] Permission error detected - user needs to grant permissions');
      
      // Send notification to popup if available
      try {
        chrome.runtime.sendMessage({
          action: 'showUserGuidance',
          message: errorDetails.userGuidance || 'Please allow screen sharing and microphone access when prompted.',
          type: 'permission'
        }).catch(() => {}); // Ignore if popup not available
      } catch (e) {
        // Ignore messaging errors
      }
    } else if (error.message.includes('No audio sources')) {
      console.warn('[Background] No audio sources available - user needs to enable audio');
      
      try {
        chrome.runtime.sendMessage({
          action: 'showUserGuidance',
          message: 'No audio sources detected. Please ensure your browser allows screen sharing with audio.',
          type: 'audio'
        }).catch(() => {});
      } catch (e) {
        // Ignore messaging errors
      }
    } else if (error.message.includes('Chrome pages cannot be captured')) {
      console.warn('[Background] Chrome internal page - cannot capture');
      
      try {
        chrome.runtime.sendMessage({
          action: 'showUserGuidance',
          message: 'Cannot capture Chrome internal pages. Please navigate to a regular webpage.',
          type: 'page'
        }).catch(() => {});
      } catch (e) {
        // Ignore messaging errors
      }
    }
    
    // Force cleanup on error
    forceStopRecording();
    
    // Reset reconnect attempts for next try
    reconnectAttempts = 0;
  
    return false;
  } catch (error) {
    logError(error, 'handleRecordingError');
    forceStopRecording();
    return false;
  }
}

/**
 * Capture audio from specified tab using chrome.tabCapture
 */
async function captureTabAudio(tabId) {
  try {
    if (!chrome.tabCapture) {
      throw new Error('chrome.tabCapture API not available');
    }

    if (!tabId) {
      throw new Error('No tab ID specified');
    }

    console.log('[Background] Capturing audio from tab using getMediaStreamId:', tabId);

    // Use the new Manifest V3 compatible API
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tabId
    });

    console.log('[Background] Got stream ID:', streamId);

    if (!streamId) {
      throw new Error('No stream ID returned from chrome.tabCapture.getMediaStreamId');
    }

    // Store the stream ID globally so it can be accessed by offscreen document
    globalTabStreamId = streamId;
    
    console.log('[Background] Tab capture stream ID stored successfully');
    return { streamId, success: true };

  } catch (error) {
    console.error('[Background] chrome.tabCapture.getMediaStreamId error:', error);
    throw new Error(`Tab capture failed: ${error.message}`);
  }
}

/**
 * Handle executeTabCapture request from offscreen document
 */
function handleExecuteTabCapture(message, sendResponse) {
  try {
    const tabId = message.tabId;
    if (!tabId) {
      sendResponse({ success: false, error: 'No tab ID provided' });
      return false;
    }

    console.log('[Background] Executing tab capture for tab:', tabId);
    
    captureTabAudio(tabId)
      .then((stream) => {
        console.log('[Background] Tab capture successful, stream stored globally');
        sendResponse({ success: true, hasStream: true });
      })
      .catch((error) => {
        console.error('[Background] Tab capture failed:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Async response
  } catch (error) {
    logError(error, 'handleExecuteTabCapture');
    sendResponse({ success: false, error: 'Internal error' });
    return false;
  }
}

/**
 * Handle getTabStream request from offscreen document
 */
function handleGetTabStream(sendResponse) {
  try {
    if (globalTabStreamId) {
      console.log('[Background] Providing access to global tab stream ID:', globalTabStreamId);
      sendResponse({ success: true, streamId: globalTabStreamId, hasStream: true });
    } else {
      sendResponse({ success: false, error: 'No tab stream ID available' });
    }
    return false;
  } catch (error) {
    logError(error, 'handleGetTabStream');
    sendResponse({ success: false, error: 'Internal error' });
    return false;
  }
}

/**
 * Handle Yes/No prompt response
 */
async function handlePromptResponse(message, sender) {
  try {
    console.log('[Background] Prompt response:', message.response, 'tab:', message.tabId, 'url:', message.url);
    // close any legacy prompt window if opened
    if (promptWindowId) { try { chrome.windows.remove(promptWindowId); } catch (_) {} promptWindowId = null; }

    if (message.response === 'yes') {
      // Set capture target tab from the sender tab (Meet tab)
      try {
        captureTargetTabId = sender && sender.tab && sender.tab.id ? sender.tab.id : null;
        console.log('[Background] captureTargetTabId from prompt:', captureTargetTabId);
      } catch (e) {
        logError(e, 'handlePromptResponse - captureTargetTabId from sender');
      }

      // Paratalkのミーティングページを開く
      try {
        await chrome.windows.create({
          url: 'https://app.paratalk.jp/meeting',
          type: 'normal',
          focused: true
        });
      } catch (e) {
        logError(e, 'handlePromptResponse - redirect');
      }

      // handleStartRecordingを呼び出して録音を開始
      console.log('[Background] Calling handleStartRecording from prompt response');
      handleStartRecording((response) => {
        if (response && response.error) {
          console.error('[Background] Recording start failed from prompt:', response.error);
          logError(new Error(`Recording start failed: ${response.error}`), 'handlePromptResponse - handleStartRecording');
        } else {
          console.log('[Background] Recording started successfully from prompt');
        }
      });
    }
    return false;
  } catch (error) {
    logError(error, 'handlePromptResponse');
    return false;
  }
}

/**
 * Show a login-required banner on the active Meet tab
 */
function showLoginRequiredBanner() {
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs && tabs[0];
      if (activeTab && activeTab.id) {
        try {
          chrome.tabs.sendMessage(activeTab.id, { action: 'showLoginRequired' });
        } catch (e) {
          logError(e, 'showLoginRequiredBanner - sendMessage activeTab');
        }
      }
    });
  } catch (e) {
    logError(e, 'showLoginRequiredBanner');
  }
}

/**
 * Focus an existing Paratalk tab or open a new one
 */
function focusOrOpenParatalk() {
  try {
    chrome.tabs.query({}, (tabs) => {
      const targetUrl = 'https://app.paratalk.jp/login';
      const sitePrefix = 'https://app.paratalk.jp/';
      const existing = tabs.find(t => typeof t.url === 'string' && t.url.startsWith(sitePrefix));
      if (existing) {
        try { chrome.windows.update(existing.windowId, { focused: true }); } catch (e) { logError(e, 'focusOrOpenParatalk - focus window'); }
        try { chrome.tabs.update(existing.id, { active: true, url: targetUrl }); } catch (e) { logError(e, 'focusOrOpenParatalk - activate tab'); }
      } else {
        try { chrome.tabs.create({ url: targetUrl, active: true }); } catch (e) { logError(e, 'focusOrOpenParatalk - open new'); }
      }
    });
  } catch (e) {
    logError(e, 'focusOrOpenParatalk');
  }
}

/**
 * Focus or open the Paratalk meeting page
 */
function focusOrOpenParatalkMeeting() {
  try {
    chrome.tabs.query({}, (tabs) => {
      const targetUrl = 'https://app.paratalk.jp/meeting';
      const sitePrefix = 'https://app.paratalk.jp/';
      const existing = tabs.find(t => typeof t.url === 'string' && t.url.startsWith(sitePrefix));
      if (existing) {
        try { chrome.windows.update(existing.windowId, { focused: true }); } catch (e) { logError(e, 'focusOrOpenParatalkMeeting - focus window'); }
        try { chrome.tabs.update(existing.id, { active: true, url: targetUrl }); } catch (e) { logError(e, 'focusOrOpenParatalkMeeting - activate tab'); }
      } else {
        try { chrome.tabs.create({ url: targetUrl, active: true }); } catch (e) { logError(e, 'focusOrOpenParatalkMeeting - open new'); }
      }
    });
  } catch (e) {
    logError(e, 'focusOrOpenParatalkMeeting');
  }
}

/**
 * Enhanced offscreen document management with retry logic
 */
async function ensureOffscreenDocument() {
  console.log('[Background] ensureOffscreenDocument called');
  return new Promise(async (resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 3;
    
    const tryCreateOffscreen = async () => {
      attempts++;
      
      try {
        console.log(`[Background] Creating offscreen document (attempt ${attempts}/${maxAttempts})`);
      
      // Create the offscreen window
        console.log('[Background] Calling openOffscreenWindow...');
      const window = await openOffscreenWindow();
      
      if (!window) {
        throw new Error('Failed to create offscreen window');
      }
      
        console.log('[Background] Offscreen window created:', window.id);
        
        // Set timeout for ready message
      const timeoutId = setTimeout(() => {
          chrome.runtime.onMessage.removeListener(messageListener);
          
          if (attempts < maxAttempts) {
            console.log(`[Background] Offscreen setup timeout, retrying (${attempts}/${maxAttempts})`);
            setTimeout(tryCreateOffscreen, 1000);
          } else {
            logError(new Error('Offscreen document setup timed out after all attempts'), 'ensureOffscreenDocument');
        reject(new Error('Offscreen document setup timed out'));
          }
        }, 15000); // 15 second timeout
      
        // Listen for ready message
      const messageListener = (message) => {
        if (message && message.action === 'offscreenReady') {
            console.log('[Background] Offscreen document ready');
          clearTimeout(timeoutId);
          chrome.runtime.onMessage.removeListener(messageListener);
          resolve();
        }
      };
      
      chrome.runtime.onMessage.addListener(messageListener);
        
      } catch (error) {
        logError(error, `ensureOffscreenDocument - attempt ${attempts}`);
        
        if (attempts < maxAttempts) {
          console.log(`[Background] Retrying offscreen creation (${attempts}/${maxAttempts})`);
          setTimeout(tryCreateOffscreen, 2000);
        } else {
          reject(error);
        }
      }
    };
    
    tryCreateOffscreen();
  });
}

// すべてのタブからpublicIdを探して取得する関数
function findAllPublicIds(callback) {
  chrome.tabs.query({}, function(tabs) {
    let results = [];
    let pending = tabs.length;
    if (pending === 0) {
      callback(results);
      return;
    }
    tabs.forEach(tab => {
      if (!tab.url) {
        if (--pending === 0) callback(results);
        return;
      }
      let urlObj;
      try {
        urlObj = new URL(tab.url);
      } catch (_) {
        if (--pending === 0) callback(results);
        return;
      }
      // Only check cookies on http(s) paratalk domains
      const isHttp = urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
      const isParatalk = /\.paratalk\.jp$/.test(urlObj.hostname) || urlObj.hostname === 'paratalk.jp' || urlObj.hostname === 'app.paratalk.jp';
      if (!isHttp || !isParatalk) {
        if (--pending === 0) callback(results);
        return;
      }
      try {
        chrome.cookies.get({url: tab.url, name: "public_id"}, function(cookie) {
          if (cookie) {
            results.push({tabId: tab.id, url: tab.url, public_id: cookie.value});
          }
          if (--pending === 0) callback(results);
        });
      } catch (e) {
        logError(e, 'findAllPublicIds - cookies.get');
        if (--pending === 0) callback(results);
      }
    });
  });
}

// 拡張機能起動時に全タブからpublicIdを取得
chrome.runtime.onStartup.addListener(() => {
  findAllPublicIds((publicIds) => {
    if (publicIds.length > 0) {
      // 最初に見つかったpublicIdをグローバル変数にセット
      globalPublicId = publicIds[0].public_id;
      console.log("[onStartup] publicId一覧:", publicIds);
      console.log("[onStartup] 最初に見つかったpublicId:", globalPublicId);
    } else {
      globalPublicId = null;
      console.log("[onStartup] どのタブからもpublicIdが見つかりませんでした");
    }
  });
});
//publicIdを取得するのはparatalkのドメインだけ

// publicIdをWebSocketのURLパラメータに含めて取得する関数
function getWebSocketUrlWithPublicId() {
  const baseUrl = 'wss://app.paratalk.jp/ws';
  if (globalPublicId) {
    return `${baseUrl}?publicId=${encodeURIComponent(globalPublicId)}`;
  } else {
    return baseUrl;
  }
}

// ================= URL Monitoring and Prompt (disabled: using content script banner) ================= //

// Track a small prompt window
let promptWindowId = null;

// Avoid duplicate prompts per tab
const promptedTabIds = new Set();

// Decide if the URL matches target
function isTargetUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || u.hostname !== 'meet.google.com') return false;
    // Match /xxx-xxxx-xxx (alphabet only), optionally followed by /, query or end
    return /^\/[a-zA-Z]{3}-[a-zA-Z]{4}-[a-zA-Z]{3}(?:\/|$)/.test(u.pathname);
  } catch {
    return false;
  }
}

async function openPromptWindow(tabId, url) {
  if (promptWindowId !== null) return; // already open
  try {
    const promptUrl = chrome.runtime.getURL('prompt.html') + `?tabId=${tabId}&url=${encodeURIComponent(url)}`;
    const win = await chrome.windows.create({
      url: promptUrl,
      type: 'popup',
      focused: true,
      width: 380,
      height: 220
    });
    promptWindowId = win.id;
  } catch (e) {
    logError(e, 'openPromptWindow');
  }
}

// Clear when prompt window closed
chrome.windows.onRemoved.addListener((winId) => {
  if (promptWindowId && winId === promptWindowId) {
    promptWindowId = null;
  }
});

// Watch tab URL updates
// Disabled because we now show an in-page sliding banner via content script
// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//   const url = changeInfo && changeInfo.url ? changeInfo.url : (tab && tab.url);
//   if (!url) return;
//   if (!isTargetUrl(url)) return;
//   if (promptedTabIds.has(tabId)) return;
//   promptedTabIds.add(tabId);
//   openPromptWindow(tabId, url);
// });