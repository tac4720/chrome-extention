// Popup script: UI controls for the recorder
document.addEventListener('DOMContentLoaded', () => {
  const startButton = document.getElementById('start');
  const stopButton = document.getElementById('stop');
  const statusElement = document.getElementById('status');
  
  // Default state
  startButton.disabled = false;
  stopButton.disabled = true;
  
  if (statusElement) {
    statusElement.textContent = 'Ready';
  }
  
  // Check if WebSocket server is available
  const testSocket = new WebSocket('ws://localhost:3001/ws');
  testSocket.onopen = () => {
    if (statusElement) {
      statusElement.textContent = 'Server connected';
      statusElement.style.color = 'green';
    }
    testSocket.close();
  };
  testSocket.onerror = () => {
    if (statusElement) {
      statusElement.textContent = 'Server not available';
      statusElement.style.color = 'red';
    }
    startButton.disabled = true;
  };
  
  // Query the recording status on popup open
  chrome.runtime.sendMessage(
    { action: 'getRecordingStatus' },
    (response) => {
      if (response && response.isRecording) {
        startButton.disabled = true;
        stopButton.disabled = false;
        if (statusElement) {
          statusElement.textContent = 'Recording';
          statusElement.style.color = 'red';
        }
      }
    }
  );
  
  // Start recording button click
  startButton.addEventListener('click', () => {
    startButton.disabled = true;
    
    if (statusElement) {
      statusElement.textContent = 'Starting...';
    }
    
    chrome.runtime.sendMessage({ action: 'startRecording' }, (response) => {
      if (response && response.error) {
        startButton.disabled = false;
        alert('Error: ' + response.error);
        if (statusElement) {
          statusElement.textContent = 'Error';
          statusElement.style.color = 'red';
        }
      } else {
        stopButton.disabled = false;
        if (statusElement) {
          statusElement.textContent = 'Recording';
          statusElement.style.color = 'red';
        }
      }
    });
  });
  
  // Stop recording button click
  stopButton.addEventListener('click', () => {
    stopButton.disabled = true;
    
    if (statusElement) {
      statusElement.textContent = 'Stopping...';
    }
    
    chrome.runtime.sendMessage({ action: 'stopRecording' }, () => {
      startButton.disabled = false;
      if (statusElement) {
        statusElement.textContent = 'Ready';
        statusElement.style.color = 'black';
      }
    });
  });
});