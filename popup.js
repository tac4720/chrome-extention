// Popup script: UI controls for the recorder
document.addEventListener('DOMContentLoaded', () => {
  const startButton = document.getElementById('start');
  const stopButton = document.getElementById('stop');
  const statusElement = document.getElementById('status');
  
  // Helper function to update status with visual feedback
  function updateStatus(state, text) {
    if (!statusElement) return;
    
    // Remove all status classes
    statusElement.className = 'status-indicator';
    
    // Add new status class
    statusElement.classList.add(`status-${state}`);
    
    // Update the HTML content with proper structure
    statusElement.innerHTML = `
      <div class="status-dot"></div>
      <span class="status-text">${text}</span>
    `;
  }
  
  // Default state
  startButton.disabled = false;
  stopButton.disabled = true;
  
  if (statusElement) {
    updateStatus('ready', 'Ready');
  }
  
  // Check WebSocket server with retry logic
  let connectionAttempts = 0;
  const maxAttempts = 3;
  
  function checkServerConnection() {
    connectionAttempts++;
    updateStatus('loading', `Connecting... (${connectionAttempts}/${maxAttempts})`);
    
    let connectionCheckTimeout;
    const testSocket = new WebSocket('wss://app.paratalk.jp/ws');
    
    connectionCheckTimeout = setTimeout(() => {
      testSocket.close();
      handleConnectionFailure('Connection timeout');
    }, 5000);
    
    testSocket.onopen = () => {
      clearTimeout(connectionCheckTimeout);
      updateStatus('connected', 'Server connected');
      testSocket.close();
      startButton.disabled = false;
      connectionAttempts = 0; // Reset on success
    };
    
    testSocket.onerror = (error) => {
      clearTimeout(connectionCheckTimeout);
      console.error('WebSocket connection error:', error);
      handleConnectionFailure('Connection error');
    };
    
    testSocket.onclose = (event) => {
      clearTimeout(connectionCheckTimeout);
      if (event.code !== 1000 && event.code !== 1001) {
        console.error('WebSocket close event:', event.code, event.reason);
        handleConnectionFailure(`Connection closed (${event.code})`);
      }
    };
  }
  
  function handleConnectionFailure(reason) {
    if (connectionAttempts < maxAttempts) {
      setTimeout(() => {
        checkServerConnection();
      }, 2000); // Wait 2 seconds before retry
    } else {
      updateStatus('error', 'Server unavailable');
      startButton.disabled = true;
      connectionAttempts = 0;
      
      // Add retry button functionality
      setTimeout(() => {
        if (startButton.disabled) {
          startButton.textContent = 'Retry Connection';
          startButton.disabled = false;
          startButton.onclick = () => {
            startButton.textContent = 'Start Recording';
            startButton.onclick = null;
            checkServerConnection();
          };
        }
      }, 3000);
    }
  }
  
  // Start initial connection check
  checkServerConnection();
  
  // Query the recording status on popup open
  function refreshRecordingStatus() {
    chrome.runtime.sendMessage(
      { action: 'getRecordingStatus' },
      (response) => {
        console.log('[popup.js] Recording status response:', response);
        if (chrome.runtime.lastError) {
          console.error('[popup.js] Error getting recording status:', chrome.runtime.lastError);
          return;
        }
        
        if (response && response.isRecording) {
          console.log('[popup.js] Recording is active, updating UI');
          startButton.disabled = true;
          stopButton.disabled = false;
          updateStatus('recording', 'Recording');
          
          // Reset button event handlers for stop
          setupStopButtonHandler();
        } else {
          console.log('[popup.js] Recording is not active');
          startButton.disabled = false;
          stopButton.disabled = true;
          updateStatus('ready', 'Ready');
          
          // Reset button event handlers for start
          setupStartButtonHandler();
        }
      }
    );
  }
  
  // Initial status check
  refreshRecordingStatus();
  
  // Separate button handler functions
  function setupStartButtonHandler() {
    startButton.onclick = () => {
      console.log('[popup.js] Start button clicked');
      
      // Prevent double-click
      if (startButton.disabled) {
        console.log('[popup.js] Start button already disabled, ignoring click');
        return;
      }
      
      startButton.disabled = true;
      stopButton.disabled = true; // Disable both during transition
      updateStatus('loading', 'Starting...');
      
      console.log('[popup.js] Sending startRecording message to background');
      
      // Set a timeout for the recording start operation
      const startTimeout = setTimeout(() => {
        console.log('[popup.js] Start operation timed out');
        startButton.disabled = false;
        stopButton.disabled = true;
        updateStatus('error', 'Start timeout');
        setupStartButtonHandler(); // Reset handler
      }, 20000); // 20 second timeout
      
      chrome.runtime.sendMessage({ action: 'startRecording' }, (response) => {
        console.log('[popup.js] Received response from background:', response);
        clearTimeout(startTimeout);
        
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError);
          startButton.disabled = false;
          stopButton.disabled = true;
          updateStatus('error', 'Runtime error');
          setupStartButtonHandler();
          return;
        }
        
        if (response && response.error) {
          startButton.disabled = false;
          stopButton.disabled = true;
          updateStatus('error', 'Error: ' + response.error);
          console.error('Recording error:', response.error);
          setupStartButtonHandler();
        } else {
          console.log('[popup.js] Recording started successfully');
          startButton.disabled = true;
          stopButton.disabled = false;
          updateStatus('recording', 'Recording');
          setupStopButtonHandler();
        }
      });
    };
  }
  
  function setupStopButtonHandler() {
    stopButton.onclick = () => {
      console.log('[popup.js] Stop button clicked');
      
      // Prevent double-click
      if (stopButton.disabled) {
        console.log('[popup.js] Stop button already disabled, ignoring click');
        return;
      }
      
      startButton.disabled = true; // Disable both during transition
      stopButton.disabled = true;
      updateStatus('loading', 'Stopping...');
      
      // Set a timeout for the stop operation
      const stopTimeout = setTimeout(() => {
        console.log('[popup.js] Stop operation timed out');
        startButton.disabled = false;
        stopButton.disabled = true;
        updateStatus('ready', 'Ready');
        setupStartButtonHandler();
      }, 10000); // 10 second timeout
      
      chrome.runtime.sendMessage({ action: 'stopRecording' }, (response) => {
        clearTimeout(stopTimeout);
        
        if (chrome.runtime.lastError) {
          console.error('Runtime error during stop:', chrome.runtime.lastError);
        }
        
        console.log('[popup.js] Stop completed successfully');
        startButton.disabled = false;
        stopButton.disabled = true;
        updateStatus('ready', 'Ready');
        setupStartButtonHandler();
        
        // Refresh status after stop to ensure consistency
        setTimeout(() => {
          refreshRecordingStatus();
        }, 500);
      });
    };
  }
  
  // Initial setup based on current state
  setupStartButtonHandler();
  
  // Periodic status check to ensure UI stays in sync
  const statusCheckInterval = setInterval(() => {
    if (!document.hidden) { // Only check when popup is visible
      refreshRecordingStatus();
    }
  }, 2000); // Check every 2 seconds
  
  // Clear interval when popup is closed
  window.addEventListener('beforeunload', () => {
    clearInterval(statusCheckInterval);
  });
});