/**
 * Tab Audio Capture Module
 * Handles tab audio stream acquisition and management
 */

class TabAudioCapture {
  constructor() {
    this.tabStream = null;
    this.isActive = false;
  }

  /**
   * Get tab stream using streamId from background script
   * @returns {Promise<MediaStream>} Tab audio stream
   */
  async getTabStream() {
    console.log('[TabAudioCapture] Attempting to get tab stream from background...');
    
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

        console.log('[TabAudioCapture] Got stream ID from background:', response.streamId);

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

          console.log('[TabAudioCapture] Successfully created MediaStream from stream ID');
          
          // Validate stream has audio tracks
          const audioTracks = stream.getAudioTracks();
          if (audioTracks.length === 0) {
            stream.getTracks().forEach(track => track.stop());
            reject(new Error('No audio tracks in stream'));
            return;
          }

          console.log('[TabAudioCapture] Stream audio tracks:', audioTracks.map(t => ({
            kind: t.kind,
            enabled: t.enabled,
            readyState: t.readyState,
            label: t.label,
            id: t.id
          })));

          this.tabStream = stream;
          this.isActive = true;

          // Set up stream event listeners
          this._setupStreamEventListeners(stream);

          resolve(stream);

        } catch (streamError) {
          console.error('[TabAudioCapture] Failed to create MediaStream from stream ID:', streamError);
          reject(new Error(`Failed to create MediaStream: ${streamError.message}`));
        }
      });
    });
  }

  /**
   * Set up event listeners for tab stream
   * @param {MediaStream} stream - The tab audio stream
   */
  _setupStreamEventListeners(stream) {
    stream.getAudioTracks().forEach(track => {
      track.addEventListener('ended', () => {
        console.log('[TabAudioCapture] Tab audio track ended');
        this.isActive = false;
        this._handleStreamEnd();
      });

      track.addEventListener('mute', () => {
        console.log('[TabAudioCapture] Tab audio track muted');
      });

      track.addEventListener('unmute', () => {
        console.log('[TabAudioCapture] Tab audio track unmuted');
      });
    });
  }

  /**
   * Handle stream end event
   */
  _handleStreamEnd() {
    console.log('[TabAudioCapture] Tab stream ended');
    
    // Notify parent about stream end
    if (typeof window.onTabStreamEnd === 'function') {
      window.onTabStreamEnd();
    }
  }

  /**
   * Stop tab audio capture
   */
  stop() {
    if (this.tabStream) {
      console.log('[TabAudioCapture] Stopping tab audio capture...');
      
      this.tabStream.getTracks().forEach(track => {
        track.stop();
      });
      
      this.tabStream = null;
      this.isActive = false;
      
      console.log('[TabAudioCapture] Tab audio capture stopped');
    }
  }

  /**
   * Get current tab stream
   * @returns {MediaStream|null} Current tab stream
   */
  getCurrentStream() {
    return this.tabStream;
  }

  /**
   * Check if tab audio capture is active
   * @returns {boolean} True if active
   */
  isCapturing() {
    return this.isActive && this.tabStream && this.tabStream.active;
  }

  /**
   * Get tab audio track info
   * @returns {Object} Tab audio track information
   */
  getTrackInfo() {
    if (!this.tabStream) {
      return null;
    }

    const audioTracks = this.tabStream.getAudioTracks();
    if (audioTracks.length === 0) {
      return null;
    }

    const track = audioTracks[0];
    return {
      kind: track.kind,
      enabled: track.enabled,
      readyState: track.readyState,
      label: track.label,
      id: track.id,
      muted: track.muted
    };
  }

  /**
   * Enable/disable tab audio track
   * @param {boolean} enabled - Whether to enable the track
   */
  setEnabled(enabled) {
    if (this.tabStream) {
      const audioTracks = this.tabStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = enabled;
      });
      console.log(`[TabAudioCapture] Tab audio ${enabled ? 'enabled' : 'disabled'}`);
    }
  }
}

// Export for use in other modules
window.TabAudioCapture = TabAudioCapture;