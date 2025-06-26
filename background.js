// Background service worker: handle recording control and audio processing
let pendingStartRecording = false;
let isRecording = false;
let recordingWindowId = null;
let recordingTabId = null;

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
  if (!message || !message.action) return false;
  
  console.log('Background received message:', message.action);
  
  try {
    switch (message.action) {
      case 'startRecording':
        // Start the recording process
        pendingStartRecording = true;
        ensureOffscreenDocument()
          .then(() => {
            // Recording was started successfully
            sendResponse({ success: true });
          })
          .catch((error) => {
            // Recording failed to start
            console.error('Error starting recording:', error);
            pendingStartRecording = false;
            sendResponse({ error: error.message || 'Failed to start recording' });
          });
        return true; // Will respond asynchronously
        
      case 'offscreenReady':
        console.log('Offscreen document ready');
        if (pendingStartRecording && recordingTabId) {
          // Try using targeted messaging to avoid context invalidation
          try {
            chrome.tabs.sendMessage(
              recordingTabId, 
              { action: 'startRecordingInOffscreen' }
            );
            pendingStartRecording = false;
            isRecording = true;
          } catch (e) {
            console.error('Error sending message to offscreen:', e);
            // Fallback to broadcast
            chrome.runtime.sendMessage({ action: 'startRecordingInOffscreen' });
          }
        }
        return false;
        
      case 'stopRecording':
        pendingStartRecording = false;
        isRecording = false;
        
        // Try targeted messaging first
        if (recordingTabId) {
          try {
            chrome.tabs.sendMessage(
              recordingTabId, 
              { action: 'stopRecordingInOffscreen' }
            );
          } catch (e) {
            console.error('Error sending stop message to tab:', e);
            // Fallback to broadcast
            chrome.runtime.sendMessage({ action: 'stopRecordingInOffscreen' });
          }
        } else {
          // Broadcast if we don't know which tab
          chrome.runtime.sendMessage({ action: 'stopRecordingInOffscreen' });
        }
        
        // Try to close the window
        if (recordingWindowId) {
          try {
            chrome.windows.remove(recordingWindowId);
          } catch (e) {
            console.error('Error closing recording window:', e);
          }
          recordingWindowId = null;
          recordingTabId = null;
        }
        
        sendResponse({ success: true });
        return false;
        
      case 'getRecordingStatus':
        sendResponse({ isRecording });
        return false;
        
      case 'recordingError':
        // Handle errors reported from offscreen document
        console.error('Recording error:', message.error);
        isRecording = false;
        pendingStartRecording = false;
        return false;
    }
  } catch (e) {
    console.error('Error processing message:', e);
    sendResponse({ error: e.message });
    return false;
  }
  
  return false;
});

/**
 * Ensure offscreen document is ready to handle audio processing
 */
async function ensureOffscreenDocument() {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('Starting offscreen document...');
      
      // Create the offscreen window
      const window = await openOffscreenWindow();
      
      if (!window) {
        throw new Error('Failed to create offscreen window');
      }
      
      // Set a timeout to detect if setup fails
      const timeoutId = setTimeout(() => {
        reject(new Error('Offscreen document setup timed out'));
      }, 5000); // 5 second timeout
      
      // Listen for the ready message
      const messageListener = (message) => {
        if (message && message.action === 'offscreenReady') {
          console.log('Offscreen document ready');
          clearTimeout(timeoutId);
          chrome.runtime.onMessage.removeListener(messageListener);
          resolve();
        }
      };
      
      // Add temporary listener for offscreen ready message
      chrome.runtime.onMessage.addListener(messageListener);
    } catch (err) {
      console.error('Error ensuring offscreen document:', err);
      reject(err);
    }
  });
}