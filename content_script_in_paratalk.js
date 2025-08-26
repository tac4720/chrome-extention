(() => {
  console.log('[Paratalk Content Script] Initialized');

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
          
          // 今後ここに実際の処理を追加
          // 例: UI更新、API呼び出し、状態変更など
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
