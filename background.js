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
 * Open offscreen.html in a hidden popup window to process audio
 */
async function openOffscreenWindow() {
  try {
    // Check if window is already open
    if (recordingWindowId !== null) {
      try {
        const existingWin = await chrome.windows.get(recordingWindowId);
        if (existingWin) return; // Window already exists
      } catch (e) {
        // Window doesn't exist, continue to create a new one
        recordingWindowId = null;
      }
    }
    
    const url = chrome.runtime.getURL('offscreen.html');
    const win = await chrome.windows.create({
      url,
      type: 'popup',
      focused: false,
      width: 100,
      height: 100,
      left: 0,
      top: 0
    });
    
    recordingWindowId = win.id;
    if (win.tabs && win.tabs.length > 0) {
      recordingTabId = win.tabs[0].id;
    }
    
    // Minimize after a short delay to ensure it loads properly
    setTimeout(() => {
      try {
        chrome.windows.update(recordingWindowId, { state: 'minimized' });
      } catch (e) {
        console.error('Error minimizing window:', e);
      }
    }, 500);
    
    return win;
  } catch (e) {
    console.error('Error opening offscreen window:', e);
    return null;
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
function handleOffscreenReady() {
  try {
    console.log('Offscreen document ready');
    if (pendingStartRecording) {
      console.log('Sending startRecordingInOffscreen message with publicId:', globalPublicId);
      
      try {
        chrome.runtime.sendMessage({ 
          action: 'startRecordingInOffscreen', 
          publicId: globalPublicId 
        });
        pendingStartRecording = false;
        isRecording = true;
      } catch (e) {
        logError(e, 'handleOffscreenReady - message send');
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
    logError(error, 'Recording error from offscreen');
    
    // Force cleanup on error
    forceStopRecording();
    
    return false;
  } catch (error) {
    logError(error, 'handleRecordingError');
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
      // 1) publicIdを取得（既存のfindAllPublicIdsを利用）
      const publicId = await new Promise((resolve) => {
        findAllPublicIds((list) => resolve((list[0] && list[0].public_id) || null));
      });
      globalPublicId = publicId;
      console.log('[Background] Using publicId:', globalPublicId);
      // 2) ユーザーの現在タブを http://localhost:3000 にリダイレクト（録音開始はまだ実装しない）
      try {
        const tabId = (message.tabId) || (sender && sender.tab && sender.tab.id);
        if (tabId) {
          await chrome.tabs.update(tabId, { url: 'http://localhost:3000' });
        } else {
          await chrome.tabs.create({ url: 'http://localhost:3000' });
        }
      } catch (e) {
        logError(e, 'handlePromptResponse - redirect');
      }
    }
    return false;
  } catch (error) {
    logError(error, 'handlePromptResponse');
    return false;
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
      chrome.cookies.get({url: tab.url, name: "public_id"}, function(cookie) {
        if (cookie) {
          results.push({tabId: tab.id, url: tab.url, public_id: cookie.value});
        }
        if (--pending === 0) callback(results);
      });
    });
  });
}

// 拡張機能起動時に全タブからpublicIdを取得
chrome.runtime.onStartup.addListener(() => {
  findAllPublicIds((publicIds) => {
    if (publicIds.length > 0) {
      // 最初に見つかったpublicIdをグローバル変数にセット
      globalPublicId = publicIds[0].publicId;
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