document.addEventListener('DOMContentLoaded', function() {
  const statusDiv = document.getElementById('status');
  const statusText = document.getElementById('statusText');
  const startButton = document.getElementById('startButton');
  const stopButton = document.getElementById('stopButton');
  const buttonText = document.getElementById('buttonText');

  let isRecording = false;

  // 初期状態を確認
  updateStatus();

  // ボタンイベント
  startButton.addEventListener('click', handleStartRecording);
  stopButton.addEventListener('click', handleStopRecording);

  /**
   * 録音開始処理
   */
  async function handleStartRecording() {
    try {
      console.log('[Popup] 録音開始ボタンがクリックされました');
      
      // ボタンを無効化
      startButton.disabled = true;
      buttonText.innerHTML = '<span class="loading">⏳</span> タブキャプチャ中...';
      
      // 現在アクティブなタブを取得
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error('アクティブなタブが見つかりません');
      }
      
      console.log('[Popup] アクティブタブ:', {
        id: tab.id,
        url: tab.url,
        title: tab.title
      });
      
      let targetTab = tab;
      
      // Google Meetタブかチェック
      if (!tab.url.includes('meet.google.com')) {
        // Google Meetタブではない場合、Google Meetタブを探す
        const meetTabs = await chrome.tabs.query({ url: 'https://meet.google.com/*' });
        
        if (meetTabs.length === 0) {
          throw new Error('Google Meetタブが見つかりません。先にGoogle Meetページを開いてください。');
        }
        
        // 最初のGoogle Meetタブを使用
        targetTab = meetTabs[0];
        console.log('[Popup] Google Meetタブを発見:', {
          id: targetTab.id,
          url: targetTab.url,
          title: targetTab.title
        });
        
        // Google Meetタブをアクティブ化
        await chrome.tabs.update(targetTab.id, { active: true });
        await chrome.windows.update(targetTab.windowId, { focused: true });
        
        // 少し待つ
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log('[Popup] ターゲットタブ決定:', {
        id: targetTab.id,
        url: targetTab.url,
        title: targetTab.title
      });
      
      // バックグラウンドスクリプトに録音開始を指示
      const response = await chrome.runtime.sendMessage({
        action: 'startRecordingFromPopup',
        tabId: targetTab.id
      });
      
      if (response && response.success) {
        console.log('[Popup] 録音開始成功');
        isRecording = true;
        updateStatus();
      } else {
        throw new Error(response?.error || '録音開始に失敗しました');
      }
      
    } catch (error) {
      console.error('[Popup] 録音開始エラー:', error);
      
      statusText.textContent = `エラー: ${error.message}`;
      statusDiv.className = 'status';
      
      // ボタンを復元
      startButton.disabled = false;
      buttonText.textContent = 'Google Meetタブをキャプチャ';
      
      // 3秒後にステータスをリセット
      setTimeout(() => {
        updateStatus();
      }, 3000);
    }
  }

  /**
   * 録音停止処理
   */
  async function handleStopRecording() {
    try {
      console.log('[Popup] 録音停止ボタンがクリックされました');
      
      const response = await chrome.runtime.sendMessage({
        action: 'stopRecording'
      });
      
      if (response && response.success) {
        console.log('[Popup] 録音停止成功');
        isRecording = false;
        updateStatus();
      } else {
        throw new Error(response?.error || '録音停止に失敗しました');
      }
      
    } catch (error) {
      console.error('[Popup] 録音停止エラー:', error);
      statusText.textContent = `エラー: ${error.message}`;
    }
  }

  /**
   * ステータス更新
   */
  async function updateStatus() {
    try {
      // バックグラウンドから現在の状態を取得
      const response = await chrome.runtime.sendMessage({
        action: 'getRecordingStatus'
      });
      
      if (response) {
        isRecording = response.isRecording || false;
      }
      
      if (isRecording) {
        statusDiv.className = 'status recording';
        statusText.textContent = '🔴 録音中...';
        startButton.style.display = 'none';
        stopButton.style.display = 'block';
      } else {
        statusDiv.className = 'status ready';
        statusText.textContent = '✅ 準備完了';
        startButton.style.display = 'block';
        stopButton.style.display = 'none';
        startButton.disabled = false;
        buttonText.textContent = 'Google Meetタブをキャプチャ';
      }
      
    } catch (error) {
      console.error('[Popup] ステータス更新エラー:', error);
      statusDiv.className = 'status';
      statusText.textContent = '状態を取得できませんでした';
    }
  }
});