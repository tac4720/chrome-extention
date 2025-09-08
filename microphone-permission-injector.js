/**
 * マイク権限取得用コンテンツスクリプト
 * ページにiframeを注入してマイク権限を取得する
 */

/**
 * マイク権限取得用のiframeを注入する関数
 */
const injectMicrophonePermissionIframe = () => {
  // 既にiframeが存在する場合は作成しない
  if (document.getElementById("permissionsIFrame")) {
    console.log("権限取得用iframeは既に存在します");
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.setAttribute("hidden", "hidden");
  iframe.setAttribute("id", "permissionsIFrame");
  iframe.setAttribute("allow", "microphone");
  iframe.src = chrome.runtime.getURL("request_mic_permission/microphone-permission-request.html");
  
  // bodyが読み込まれるまで待機
  if (document.body) {
    document.body.appendChild(iframe);
    console.log("マイク権限取得用iframe (microphone-permission-request.html) を注入しました");
  } else {
    // bodyが読み込まれていない場合はDOMContentLoadedイベントを待つ
    document.addEventListener("DOMContentLoaded", () => {
      document.body.appendChild(iframe);
      console.log("マイク権限取得用iframe (microphone-permission-request.html) を注入しました");
    });
  }
};

// ページが読み込まれたらiframeを注入
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", injectMicrophonePermissionIframe);
} else {
  injectMicrophonePermissionIframe();
}
