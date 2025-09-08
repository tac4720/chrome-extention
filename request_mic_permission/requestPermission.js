/**
 * requestPermission.js
 * マイクの使用権限をリクエストする
 */

/**
 * ユーザーからマイクの使用許可を取得する
 * @returns {Promise<void>} 権限が付与された場合に解決されるPromise
 */
async function getUserPermission() {
  const statusElement = document.getElementById('status');
  
  try {
    console.log('Paratalk拡張機能がマイク権限をリクエストしています...');
    
    if (statusElement) {
      statusElement.textContent = 'Paratalkがマイク権限をリクエスト中...';
      statusElement.style.color = '#007bff';
    }

    // navigator.mediaDevices.getUserMediaを使用してマイクアクセスをリクエスト
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    console.log('Paratalk拡張機能のマイクアクセスが許可されました');
    
    if (statusElement) {
      statusElement.textContent = '✓ Paratalkのマイク権限が正常に取得されました';
      statusElement.style.color = '#28a745';
    }

    // レコーディングインジケータが表示されないようにトラックを停止
    stream.getTracks().forEach(function (track) {
      track.stop();
    });

    // 親ウィンドウ（コンテンツスクリプト）に成功を通知
    if (window.parent !== window) {
      window.parent.postMessage({ 
        type: 'MICROPHONE_PERMISSION_GRANTED',
        success: true 
      }, '*');
    }

  } catch (error) {
    console.error('Paratalk拡張機能のマイク権限の取得でエラーが発生しました:', error);
    
    if (statusElement) {
      statusElement.textContent = '✗ Paratalkのマイク権限の取得に失敗しました';
      statusElement.style.color = '#dc3545';
    }

    // エラーの種類に応じてメッセージを表示
    let errorMessage = 'Paratalk拡張機能のマイク権限の取得に失敗しました。';
    
    if (error.name === 'NotAllowedError') {
      errorMessage = 'Paratalk拡張機能のマイクアクセスが拒否されました。ブラウザの設定からマイクの使用を許可してください。';
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'マイクが見つかりませんでした。マイクが接続されているか確認してください。';
    } else if (error.name === 'NotSupportedError') {
      errorMessage = 'このブラウザではマイクアクセスがサポートされていません。';
    }

    console.error(errorMessage);

    // 親ウィンドウに失敗を通知
    if (window.parent !== window) {
      window.parent.postMessage({ 
        type: 'MICROPHONE_PERMISSION_DENIED',
        success: false,
        error: errorMessage
      }, '*');
    }
  }
}

// ページが読み込まれたらマイク権限をリクエスト
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', getUserPermission);
} else {
  getUserPermission();
}
