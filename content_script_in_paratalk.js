(() => {
  console.log('[Paratalk Content Script] Initialized');

  /**
   * Paratalkの通話終了ボタンを自動クリック
   */
  function clickEndCallButton() {
    console.log('[Paratalk Content Script] Searching for end call button...');
    
    try {
      const button = Array.from(document.querySelectorAll('button'))
        .find(btn => btn.textContent.trim() === '会議終了');
      
      if (button && button.offsetParent !== null) {
        console.log('[Paratalk Content Script] Found button with text content method');
        button.click();
        console.log('[Paratalk Content Script] ✅ Button clicked successfully!');
      } else {
        console.warn('[Paratalk Content Script] ❌ End call button not found');
      }
    } catch (error) {
      console.error('[Paratalk Content Script] Error clicking end call button:', error);
    }
  }

  // chrome.runtime.onConnect でポート接続を受信
  chrome.runtime.onConnect.addListener((port) => {
    console.log('[Paratalk Content Script] Port connected:', port.name);
    
    if (port.name === 'paratalk-connection') {
      // メッセージを受信
      port.onMessage.addListener((message) => {
        console.log('[Paratalk Content Script] Message received:', message);
        
        if (message.type === 'MEET_END_CALL') {
          console.log('[Paratalk Content Script] 🔴 Google Meet call ended!');
          console.log('[Paratalk Content Script] Timestamp:', message.timestamp);
          console.log('[Paratalk Content Script] Source:', message.source);
          
          // 既存のボタンを自動クリック
          clickEndCallButton();
        }
      });
      
      // ポート切断時の処理
      port.onDisconnect.addListener(() => {
        console.log('[Paratalk Content Script] Port disconnected');
      });
      
      // 接続確認メッセージを送信
      port.postMessage({
        type: 'CONNECTION_CONFIRMED',
        timestamp: new Date().toISOString()
      });
    }
  });
})();
