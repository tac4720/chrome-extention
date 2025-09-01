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
      
      // 会議タブかチェック（Google Meet、Teams、Zoom）
      const isMeetingTab = tab.url.includes('meet.google.com') || 
                          tab.url.includes('teams.live.com') || 
                          tab.url.includes('teams.microsoft.com') ||
                          tab.url.includes('zoom.us');
      
      if (!isMeetingTab) {
        // 会議タブではない場合、会議タブを探す
        const meetTabs = await chrome.tabs.query({ url: 'https://meet.google.com/*' });
        const teamsTabs = await chrome.tabs.query({ url: 'https://teams.live.com/*' });
        const teamsOldTabs = await chrome.tabs.query({ url: 'https://teams.microsoft.com/*' });
        const zoomTabs = await chrome.tabs.query({ url: 'https://*.zoom.us/*' });
        
        const allMeetingTabs = [...meetTabs, ...teamsTabs, ...teamsOldTabs, ...zoomTabs];
        
        if (allMeetingTabs.length === 0) {
          throw new Error('Google Meet、Teams、またはZoomタブが見つかりません。先に会議ページを開いてください。');
        }
        
        // 最初の会議タブを使用
        targetTab = allMeetingTabs[0];
        
        let tabType = 'Unknown';
        if (targetTab.url.includes('meet.google.com')) {
          tabType = 'Google Meet';
        } else if (targetTab.url.includes('teams.live.com') || targetTab.url.includes('teams.microsoft.com')) {
          tabType = 'Microsoft Teams';
        } else if (targetTab.url.includes('zoom.us')) {
          tabType = 'Zoom';
        }
        
        console.log(`[Popup] ${tabType}タブを発見:`, {
          id: targetTab.id,
          url: targetTab.url,
          title: targetTab.title
        });
        
        // 会議タブをアクティブ化
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
        // throw new Error(response?.error || '録音開始に失敗しました');
      }
      
    } catch (error) {
      console.error('[Popup] 録音開始エラー:', error);
      
      statusText.textContent = `エラー: ${error.message}`;
      statusDiv.className = 'status';
      
      // ボタンを復元
      startButton.disabled = false;
      buttonText.textContent = '会議タブをキャプチャ';
      
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
        buttonText.textContent = '会議タブをキャプチャ';
      }
      
    } catch (error) {
      console.error('[Popup] ステータス更新エラー:', error);
      statusDiv.className = 'status';
      statusText.textContent = '状態を取得できませんでした';
    }
  }
});
