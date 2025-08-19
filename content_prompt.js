(() => {
  if (window.__meet_slide_prompt_injected__) return;
  window.__meet_slide_prompt_injected__ = true;

  function createBanner(text, onYes, onNo) {
    const container = document.createElement('div');
    container.id = 'meet-slide-banner';
    container.style.position = 'fixed';
    container.style.top = '-100px';
    container.style.left = '50%';
    container.style.transform = 'translateX(-50%)';
    container.style.width = 'min(640px, 90vw)';
    container.style.boxSizing = 'border-box';
    container.style.padding = '12px 16px';
    container.style.borderRadius = '10px';
    container.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
    container.style.background = '#111827';
    container.style.color = 'white';
    container.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial';
    container.style.zIndex = '2147483647';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'space-between';
    container.style.gap = '12px';
    container.style.transition = 'top 300ms ease';

    const message = document.createElement('div');
    message.textContent = text;
    message.style.fontSize = '14px';
    message.style.flex = '1 1 auto';
    message.style.whiteSpace = 'nowrap';
    message.style.overflow = 'hidden';
    message.style.textOverflow = 'ellipsis';

    const buttons = document.createElement('div');
    buttons.style.display = 'flex';
    buttons.style.gap = '8px';

    const yes = document.createElement('button');
    yes.textContent = 'はい';
    yes.style.background = '#10B981';
    yes.style.color = '#fff';
    yes.style.border = 'none';
    yes.style.borderRadius = '8px';
    yes.style.padding = '8px 12px';
    yes.style.fontSize = '14px';
    yes.style.cursor = 'pointer';

    const no = document.createElement('button');
    no.textContent = 'いいえ';
    no.style.background = 'transparent';
    no.style.color = '#D1D5DB';
    no.style.border = '1px solid #374151';
    no.style.borderRadius = '8px';
    no.style.padding = '8px 12px';
    no.style.fontSize = '14px';
    no.style.cursor = 'pointer';

    yes.addEventListener('mouseenter', () => (yes.style.filter = 'brightness(1.05)'));
    yes.addEventListener('mouseleave', () => (yes.style.filter = 'none'));
    no.addEventListener('mouseenter', () => (no.style.background = '#1F2937'));
    no.addEventListener('mouseleave', () => (no.style.background = 'transparent'));

    yes.addEventListener('click', () => onYes());
    no.addEventListener('click', () => onNo());

    buttons.appendChild(yes);
    buttons.appendChild(no);
    container.appendChild(message);
    container.appendChild(buttons);

    document.documentElement.appendChild(container);
    requestAnimationFrame(() => {
      container.style.top = '16px';
    });

    return {
      remove() {
        container.style.top = '-100px';
        setTimeout(() => container.remove(), 300);
      }
    };
  }

  function createInfoBanner(text) {
    const container = document.createElement('div');
    container.id = 'meet-slide-info-banner';
    container.style.position = 'fixed';
    container.style.top = '-100px';
    container.style.left = '50%';
    container.style.transform = 'translateX(-50%)';
    container.style.width = 'min(640px, 90vw)';
    container.style.boxSizing = 'border-box';
    container.style.padding = '12px 16px';
    container.style.borderRadius = '10px';
    container.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
    container.style.background = '#111827';
    container.style.color = 'white';
    container.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial';
    container.style.zIndex = '2147483647';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'space-between';
    container.style.gap = '12px';
    container.style.transition = 'top 300ms ease';

    const message = document.createElement('div');
    message.textContent = text;
    message.style.fontSize = '14px';
    message.style.flex = '1 1 auto';
    message.style.whiteSpace = 'nowrap';
    message.style.overflow = 'hidden';
    message.style.textOverflow = 'ellipsis';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'OK';
    closeBtn.style.background = '#3B82F6';
    closeBtn.style.color = '#fff';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '8px';
    closeBtn.style.padding = '8px 12px';
    closeBtn.style.fontSize = '14px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.addEventListener('mouseenter', () => (closeBtn.style.filter = 'brightness(1.05)'));
    closeBtn.addEventListener('mouseleave', () => (closeBtn.style.filter = 'none'));

    closeBtn.addEventListener('click', () => {
      container.style.top = '-100px';
      setTimeout(() => container.remove(), 300);
    });

    container.appendChild(message);
    container.appendChild(closeBtn);
    document.documentElement.appendChild(container);
    requestAnimationFrame(() => {
      container.style.top = '16px';
    });

    return {
      remove() {
        container.style.top = '-100px';
        setTimeout(() => container.remove(), 300);
      }
    };
  }

  function createLoginRequiredBanner() {
    const container = document.createElement('div');
    container.id = 'meet-slide-login-required-banner';
    container.style.position = 'fixed';
    container.style.top = '-100px';
    container.style.left = '50%';
    container.style.transform = 'translateX(-50%)';
    container.style.width = 'min(640px, 90vw)';
    container.style.boxSizing = 'border-box';
    container.style.padding = '12px 16px';
    container.style.borderRadius = '10px';
    container.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
    container.style.background = '#111827';
    container.style.color = 'white';
    container.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial';
    container.style.zIndex = '2147483647';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'space-between';
    container.style.gap = '12px';
    container.style.transition = 'top 300ms ease';

    const message = document.createElement('div');
    message.textContent = 'paratalk側でログインが必要です';
    message.style.fontSize = '14px';
    message.style.flex = '1 1 auto';
    message.style.whiteSpace = 'nowrap';
    message.style.overflow = 'hidden';
    message.style.textOverflow = 'ellipsis';

    const buttons = document.createElement('div');
    buttons.style.display = 'flex';
    buttons.style.gap = '8px';

    const openLogin = document.createElement('button');
    openLogin.textContent = 'ログインページを開く';
    openLogin.style.background = '#3B82F6';
    openLogin.style.color = '#fff';
    openLogin.style.border = 'none';
    openLogin.style.borderRadius = '8px';
    openLogin.style.padding = '8px 12px';
    openLogin.style.fontSize = '14px';
    openLogin.style.cursor = 'pointer';

    const retry = document.createElement('button');
    retry.textContent = 'ログイン後に再試行';
    retry.style.background = 'transparent';
    retry.style.color = '#D1D5DB';
    retry.style.border = '1px solid #374151';
    retry.style.borderRadius = '8px';
    retry.style.padding = '8px 12px';
    retry.style.fontSize = '14px';
    retry.style.cursor = 'pointer';

    openLogin.addEventListener('mouseenter', () => (openLogin.style.filter = 'brightness(1.05)'));
    openLogin.addEventListener('mouseleave', () => (openLogin.style.filter = 'none'));
    retry.addEventListener('mouseenter', () => (retry.style.background = '#1F2937'));
    retry.addEventListener('mouseleave', () => (retry.style.background = 'transparent'));

    openLogin.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'focusOrOpenParatalk' });
    });
    retry.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'openParatalkMeeting' });
      container.style.top = '-100px';
      setTimeout(() => container.remove(), 300);
    });

    buttons.appendChild(openLogin);
    buttons.appendChild(retry);
    container.appendChild(message);
    container.appendChild(buttons);
    document.documentElement.appendChild(container);
    requestAnimationFrame(() => {
      container.style.top = '16px';
    });

    return {
      remove() {
        container.style.top = '-100px';
        setTimeout(() => container.remove(), 300);
      }
    };
  }

  // 背景側の判定に頼らず、コンテンツ側でも自前でURL形式を判定
  function isTargetMeetPath() {
    try {
      const { pathname } = window.location;
      return /^\/[a-zA-Z]{3}-[a-zA-Z]{4}-[a-zA-Z]{3}(?:\/|$)/.test(pathname);
    } catch {
      return false;
    }
  }

  if (!isTargetMeetPath()) return;

  const banner = createBanner('paratalkを起動させますか？', () => {
    console.log('[ContentPrompt] ユーザーが「はい」をクリック');
    console.log('[ContentPrompt] タブURL:', location.href);
    
    banner.remove();
    
    // 拡張機能アイコンクリックを促すメッセージを表示
    showExtensionClickPrompt();
  }, () => {
    chrome.runtime.sendMessage({ action: 'promptResponse', response: 'no', url: location.href });
    banner.remove();
  });

  chrome.runtime.onMessage.addListener((message) => {
    try {
      if (!message || !message.action) return false;
      if (message.action === 'showLoginRequired') {
        createLoginRequiredBanner();
        return false;
      }
      if (message.action === 'showInfoBanner' && typeof message.text === 'string') {
        createInfoBanner(message.text);
        return false;
      }
      return false;
    } catch (_) {
      return false;
    }
  });

  /**
   * 拡張機能アイコンクリックを促すメッセージを表示
   */
  function showExtensionClickPrompt() {
    // 既存のプロンプトがある場合は削除
    const existingPrompt = document.getElementById('paratalk-extension-prompt');
    if (existingPrompt) {
      existingPrompt.remove();
    }

    const container = document.createElement('div');
    container.id = 'paratalk-extension-prompt';
    container.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      z-index: 10001;
      max-width: 350px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      animation: slideInFromRight 0.3s ease-out;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    `;

    // アニメーション用CSSを追加
    if (!document.getElementById('paratalk-animation-styles')) {
      const style = document.createElement('style');
      style.id = 'paratalk-animation-styles';
      style.textContent = `
        @keyframes slideInFromRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `;
      document.head.appendChild(style);
    }

    const title = document.createElement('div');
    title.textContent = '🚀 Paratalkを開始';
    title.style.cssText = `
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    const message = document.createElement('div');
    message.innerHTML = `
      音声キャプチャを開始するために、<br>
      <strong>ブラウザーの右上にあるParatalkアイコン</strong>をクリックしてください。
    `;
    message.style.cssText = `
      margin-bottom: 16px;
      opacity: 0.9;
    `;

    const iconHint = document.createElement('div');
    iconHint.innerHTML = '🔍 アイコンが見つからない場合は、ブラウザーのアドレスバー右のパズルアイコンをクリック';
    iconHint.style.cssText = `
      font-size: 12px;
      opacity: 0.7;
      margin-bottom: 16px;
      padding: 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 6px;
    `;

    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: none;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    closeButton.addEventListener('click', () => {
      container.style.transform = 'translateX(100%)';
      container.style.opacity = '0';
      setTimeout(() => container.remove(), 300);
    });

    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.background = 'rgba(255, 255, 255, 0.3)';
    });

    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
    });

    container.appendChild(title);
    container.appendChild(message);
    container.appendChild(iconHint);
    container.appendChild(closeButton);
    
    document.documentElement.appendChild(container);

    // 10秒後に自動で閉じる
    setTimeout(() => {
      if (container.parentNode) {
        container.style.transform = 'translateX(100%)';
        container.style.opacity = '0';
        setTimeout(() => container.remove(), 300);
      }
    }, 10000);
  }
})();

