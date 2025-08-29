// Background service worker: handle recording control and audio processing
let pendingStartRecording = false;
let isRecording = false;
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
  
  // Basic state validation
  
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
  
  recordingTabId = null;
  
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
 * Send end call message to Paratalk website
 */
async function sendEndCallToParatalk(endTime) {
  try {
    console.log('[Background] Sending end call message to Paratalk...');
    
    // Paratalkサイトのタブを検索
    const tabs = await chrome.tabs.query({});
    const paratalkTabs = tabs.filter(tab => 
      tab.url && (
        tab.url.includes('paratalk.jp') || 
        tab.url.includes('app.paratalk.jp')
      )
    );
    
    if (paratalkTabs.length === 0) {
      console.log('[Background] No Paratalk tabs found');
      return;
    }
    
    // 最初に見つかったParatalkタブに接続
    const targetTab = paratalkTabs[0];
    console.log('[Background] Found Paratalk tab:', targetTab.id, targetTab.url);
    
    // chrome.runtime.connectを使用してメッセージを送信
    try {
      const port = chrome.tabs.connect(targetTab.id, { name: 'paratalk-connection' });
      
      port.postMessage({
        type: 'MEET_END_CALL',
        timestamp: endTime,
        source: 'google-meet'
      });
      
      console.log('[Background] End call message sent to Paratalk via port');
      
      // 接続を閉じる
      port.disconnect();
      
    } catch (connectError) {
      console.error('[Background] Failed to connect to Paratalk tab:', connectError);
      logError(connectError, 'sendEndCallToParatalk - connect');
    }
    
  } catch (error) {
    console.error('[Background] Error sending end call to Paratalk:', error);
    logError(error, 'sendEndCallToParatalk');
  }
}

/**
 * Send end call message to Teams website
 */
async function sendEndCallToTeams(endTime) {
  try {
    console.log('[Background] Sending end call message to Teams...');
    
    // Teamsサイトのタブを検索
    const tabs = await chrome.tabs.query({});
    const teamsTabs = tabs.filter(tab => 
      tab.url && tab.url.includes('teams.microsoft.com')
    );
    
    if (teamsTabs.length === 0) {
      console.log('[Background] No Teams tabs found');
      return;
    }
    
    // 最初に見つかったTeamsタブに接続
    const targetTab = teamsTabs[0];
    console.log('[Background] Found Teams tab:', targetTab.id, targetTab.url);
    
    // chrome.runtime.connectを使用してメッセージを送信
    try {
      const port = chrome.tabs.connect(targetTab.id, { name: 'teams-connection' });
      
      port.postMessage({
        type: 'MEET_END_CALL',
        timestamp: endTime,
        source: 'google-meet'
      });
      
      console.log('[Background] End call message sent to Teams via port');
      
      // 接続を閉じる
      port.disconnect();
      
    } catch (connectError) {
      console.error('[Background] Failed to connect to Teams tab:', connectError);
      logError(connectError, 'sendEndCallToTeams - connect');
    }
    
  } catch (error) {
    console.error('[Background] Error sending end call to Teams:', error);
    logError(error, 'sendEndCallToTeams');
  }
}

/**
 * Create offscreen document using Chrome's offscreen API
 */
async function createOffscreenDocument() {
  try {
    // Check if chrome.offscreen API is available
    if (!chrome.offscreen || typeof chrome.offscreen.createDocument !== 'function') {
      throw new Error('chrome.offscreen API not available');
    }
    
    // Check if offscreen document already exists and close it
    if (chrome.runtime.getContexts && typeof chrome.runtime.getContexts === 'function') {
      const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
      });
      
      if (existingContexts.length > 0) {
        console.log('[Background] Existing offscreen document found, closing it...');
        try {
          await chrome.offscreen.closeDocument();
          console.log('[Background] Existing offscreen document closed');
          // Small delay to ensure cleanup
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.warn('[Background] Failed to close existing offscreen document:', error);
        }
      }
    }
    
    // Create offscreen document
    console.log('[Background] Creating offscreen document...');
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Recording audio from tab and microphone'
    });
    
    console.log('[Background] Offscreen document created successfully');
    return { id: 'offscreen' };
    
  } catch (error) {
    console.error('[Background] Failed to create offscreen document:', error);
    throw error;
  }
}
// Handle messages from popup and offscreen window
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle END_CALL message from content script
  if (message.type === "END_CALL") {
    const source = message.source || "google-meet";
    console.log(`[Service Worker] ${source} end-call clicked at:`, message.time);
    
    // Paratalkサイトに通話終了メッセージを送信
    sendEndCallToParatalk(message.time);
    
    // 各プラットフォームから退出した際は、そのプラットフォーム以外には終了メッセージを送らない
    // （例：Google Meetから退出してもTeamsは終了させない）
    
    return false;
  }

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

      case 'checkPublicId':
        try {
          console.log('[Background] checkPublicIdアクション開始');
          findAllPublicIds((publicIds) => {
            console.log('[Background] findAllPublicIds結果:', publicIds);
            const hasPublicId = publicIds.length > 0;
            if (hasPublicId) {
              globalPublicId = publicIds[0].public_id;
              console.log("[Background] checkPublicId: Found public_id:", globalPublicId);
              console.log("[Background] 全publicIds:", publicIds.map(p => ({ tabId: p.tabId, url: p.url, public_id: p.public_id })));
            } else {
              globalPublicId = null;
              console.log("[Background] checkPublicId: No public_id found");
            }
            console.log('[Background] checkPublicIdレスポンス送信:', { hasPublicId });
            sendResponse({ hasPublicId });
          });
        } catch (e) {
          console.error('[Background] checkPublicIdエラー:', e);
          logError(e, 'onMessage - checkPublicId');
          sendResponse({ hasPublicId: false });
        }
        return true; // 非同期レスポンスのため

      case 'getTabStream':
        return handleGetTabStream(sendResponse);
        
      case 'startRecordingFromPopup':
        return handleStartRecordingFromPopup(message, sendResponse);
        
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
    
    // Use existing captureTargetTabId if available, otherwise determine capture target tab
    if (!captureTargetTabId) {
      console.log('[Background] No captureTargetTabId set, searching for Meet tab...');
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
    } else {
      console.log('[Background] Using existing captureTargetTabId:', captureTargetTabId);
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
        recordingTabId = null;
        
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
    console.log('[background.js] Status check - isRecording:', isRecording, 'pendingStart:', pendingStartRecording);
    
    if (pendingStartRecording) {
      sendResponse({ isRecording: false, isPending: true });
        return false;
    }
    
    if (isRecording) {
      sendResponse({ 
        isRecording: true, 
        startTime: recordingStartTime,
        duration: recordingStartTime ? Date.now() - recordingStartTime : 0
      });
      return false;
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

        console.log('[Background] Using pre-captured stream ID from handleStartRecordingFromPopup:', globalTabStreamId);
        
        // Use the stream ID that was already captured in handleStartRecordingFromPopup
        if (!globalTabStreamId) {
          throw new Error('No stream ID available - tab capture should have been done in handleStartRecordingFromPopup');
        }
        
        // Send stream ID and recording data to offscreen document
        const sendStartMessage = () => {
          return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ 
              action: 'start',
              publicId: globalPublicId,
              streamId: globalTabStreamId
            }, (response) => {
              if (chrome.runtime.lastError) {
                console.log("aaaaaaaaaaaaaa");
                reject(new Error(`Message send failed: ${chrome.runtime.lastError.message}`));
              } else {
                resolve(response);
              }
            });
          });
        };

        try {
          await sendStartMessage();
        } catch (error) {
          if (error.message.includes('Receiving end does not exist')) {
            console.warn('[Background] Offscreen document not ready yet, retrying...');
            await new Promise(resolve => setTimeout(resolve, 500));
            await sendStartMessage();
          } else {
            throw error;
          }
        }
          
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
 * Handle start recording request from popup (with activeTab permission)
 */
async function handleStartRecordingFromPopup(message, sendResponse) {
  try {
    console.log('[Background] 🎆 Popupからの録音開始リクエスト:', message.tabId);
    
    if (!message.tabId) {
      sendResponse({ success: false, error: 'Tab IDが指定されていません' });
      return true;
    }
    
    // activeTab権限が有効化された状態でタブキャプチャを実行
    try {
      console.log('[Background] 🎯 activeTab権限でタブキャプチャを実行:', message.tabId);
      
      const streamId = await chrome.tabCapture.getMediaStreamId({
        targetTabId: message.tabId
      });
      
      if (!streamId) {
        throw new Error('ストリームIDが取得できませんでした');
      }
      
      console.log('[Background] ✅ タブキャプチャ成功! ストリームID:', streamId);
      console.log('[Background] 🎯 タブID:', message.tabId);
      
      // グローバルにストリームIDを保存
      globalTabStreamId = streamId;
      captureTargetTabId = message.tabId;
      
      // ★ Paratalk ミーティングページを新規ウィンドウで開く
      console.log('[Background] 🌐 Paratalk ミーティングページを開きます...');
      try {
        await chrome.windows.create({ 
          url: 'https://app.paratalk.jp/meeting', 
          type: 'normal',
          focused: true 
        });
        console.log('[Background] ✅ Paratalk ページを開きました');
      } catch (error) {
        console.error('[Background] ❌ Paratalk ページを開けませんでした:', error);
      }
      
      // 少し待ってから publicId を検索
      console.log('[Background] 🔍 publicId を検索中...');
      setTimeout(() => {
        findAllPublicIds(async (publicIds) => {
        if (publicIds.length > 0) {
          globalPublicId = publicIds[0].public_id;
          console.log('[Background] ✅ publicId 取得成功:', globalPublicId);
        } else {
          globalPublicId = null;
          console.log('[Background] ⚠️ publicId が見つかりません');
        }
        
        pendingStartRecording = true;
        
        try {
          await ensureOffscreenDocument();
          sendResponse({ success: true, streamId: streamId });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      });
      }, 2000); // 2秒待機
      
      return true; // 非同期レスポンス
      
    } catch (captureError) {
      console.error('[Background] ❌ タブキャプチャ失敗:', captureError);
      sendResponse({ 
        success: false, 
        error: `タブキャプチャ失敗: ${captureError.message}` 
      });
      return true;
    }
    
  } catch (error) {
    console.error('[Background] handleStartRecordingFromPopupエラー:', error);
    logError(error, 'handleStartRecordingFromPopup');
    sendResponse({ success: false, error: '内部エラーが発生しました' });
    return true;
  }
}

/**
 * Handle Yes/No prompt response
 */
async function handlePromptResponse(message, sender) {
  try {
    console.log('[Background] Prompt response:', message.response, 'tab:', message.tabId, 'url:', message.url);
    console.log('[Background] 受信したメッセージ詳細:', message);
    
    // close any legacy prompt window if opened
    if (promptWindowId) { try { chrome.windows.remove(promptWindowId); } catch (_) {} promptWindowId = null; }

    if (message.response === 'yes') {
      // sender.tab.idを使用してタブIDを取得（正式な方法）
      try {
        captureTargetTabId = sender && sender.tab && sender.tab.id ? sender.tab.id : null;
        
        if (captureTargetTabId) {
          console.log('[Background] 🎯 Google MeetタブIDを取得:', captureTargetTabId);
          console.log('[Background] 🌐 タブURL:', sender.tab.url);
          console.log('[Background] 📝 タブキャプチャはhandleOffscreenReady()で実行されます');
        } else {
          console.error('[Background] ⚠️ sender.tab.idが取得できません');
          logError(new Error('sender.tab.id not available'), 'handlePromptResponse');
        }
      } catch (e) {
        logError(e, 'handlePromptResponse - sender.tab.id');
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
    chrome.tabs.query({}, async (tabs) => {
      const targetUrl = 'https://app.paratalk.jp/meeting';
      const sitePrefix = 'https://app.paratalk.jp/';
      const existing = tabs.find(t => typeof t.url === 'string' && t.url.startsWith(sitePrefix));
      
      if (existing) {
        try {
          // 既存のParatalkタブを新しいウィンドウに移動
          console.log('[Background] Moving existing Paratalk tab to new window');
          
          // 新しいウィンドウを作成
          const newWindow = await chrome.windows.create({
            type: 'normal',
            focused: true
          });
          
          // 既存のタブを新しいウィンドウに移動
          await chrome.tabs.move(existing.id, {
            windowId: newWindow.id,
            index: 0
          });
          
          // URLを更新（必要に応じて）
          await chrome.tabs.update(existing.id, { url: targetUrl, active: true });
          
          console.log('[Background] ✅ Paratalk tab moved to new window');
        } catch (e) { 
          logError(e, 'focusOrOpenParatalk - move to new window');
          // フォールバック: 既存ウィンドウにフォーカス
          try { chrome.windows.update(existing.windowId, { focused: true }); } catch (e2) { logError(e2, 'focusOrOpenParatalk - fallback focus'); }
        }
      } else {
        try { chrome.windows.create({ url: targetUrl, type: 'normal', focused: true }); } catch (e) { logError(e, 'focusOrOpenParatalk - open new window'); }
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
    chrome.tabs.query({}, async (tabs) => {
      const targetUrl = 'https://app.paratalk.jp/meeting';
      const sitePrefix = 'https://app.paratalk.jp/';
      const existing = tabs.find(t => typeof t.url === 'string' && t.url.startsWith(sitePrefix));
      
      if (existing) {
        try {
          // 既存のParatalkタブを新しいウィンドウに移動
          console.log('[Background] Moving existing Paratalk tab to new window');
          
          // 新しいウィンドウを作成
          const newWindow = await chrome.windows.create({
            type: 'normal',
            focused: true
          });
          
          // 既存のタブを新しいウィンドウに移動
          await chrome.tabs.move(existing.id, {
            windowId: newWindow.id,
            index: 0
          });
          
          // URLを更新（必要に応じて）
          await chrome.tabs.update(existing.id, { url: targetUrl, active: true });
          
          console.log('[Background] ✅ Paratalk tab moved to new window');
        } catch (e) { 
          logError(e, 'focusOrOpenParatalkMeeting - move to new window');
          // フォールバック: 既存ウィンドウにフォーカス
          try { chrome.windows.update(existing.windowId, { focused: true }); } catch (e2) { logError(e2, 'focusOrOpenParatalkMeeting - fallback focus'); }
        }
      } else {
        try { chrome.windows.create({ url: targetUrl, type: 'normal', focused: true }); } catch (e) { logError(e, 'focusOrOpenParatalkMeeting - open new window'); }
      }
    });
  } catch (e) {
    logError(e, 'focusOrOpenParatalkMeeting');
  }
}

/**
 * Simple offscreen document creation without retry logic
 */
async function ensureOffscreenDocument() {
  console.log('[Background] ensureOffscreenDocument called');
  
  try {
    // Create the offscreen document
    console.log('[Background] Calling createOffscreenDocument...');
    const document = await createOffscreenDocument();
    
    if (!document) {
      throw new Error('Failed to create offscreen document');
    }
    
    console.log('[Background] Offscreen document created:', document.id);
    
    // Wait for ready message
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        chrome.runtime.onMessage.removeListener(messageListener);
        reject(new Error('Offscreen document setup timed out'));
      }, 10000); // 10 second timeout
      
      const messageListener = (message) => {
        if (message && message.action === 'offscreenReady') {
          console.log('[Background] Offscreen document ready');
          clearTimeout(timeoutId);
          chrome.runtime.onMessage.removeListener(messageListener);
          resolve();
        }
      };
      
      chrome.runtime.onMessage.addListener(messageListener);
    });
    
  } catch (error) {
    logError(error, 'ensureOffscreenDocument');
    throw error;
  }
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
