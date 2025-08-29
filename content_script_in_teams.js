(() => {
  if (window.__teams_slide_prompt_injected__) return;
  window.__teams_slide_prompt_injected__ = true;

  function createBanner(text, onYes, onNo) {
    const container = document.createElement('div');
    container.id = 'teams-slide-banner';
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
    container.id = 'teams-slide-info-banner';
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
    container.id = 'teams-slide-login-required-banner';
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
      // バナーを閉じる
      container.style.top = '-100px';
      setTimeout(() => container.remove(), 300);
      
      // 拡張機能アイコンクリックを促すメッセージを表示
      showExtensionClickPrompt();
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

  // Teams会議の退出ボタンが存在するかを判定
  function hasTeamsExitButton() {
    try {
      // Teams退出ボタンのセレクター（teams.live.com用も含む）
      const exitButtonSelectors = [
        '[data-tid="hangup-main-btn"]',
        '#hangup-button',
        '[data-track-module-name="StopMeetingButton"]',
        'button[aria-label="退出します"]',
        'button[aria-label*="退出"]',
        'button[aria-label*="Leave"]',
        'button[aria-label*="hang up"]',
        'button[aria-label*="End call"]',
        'button.fui-Button[aria-label*="退出"]',
        'button[data-tid*="hangup"]',
        // teams.live.com用の追加パターン
        'button[title*="Leave"]',
        'button[title*="退出"]',
        'button[class*="hangup"]',
        'button[class*="leave"]',
        'button[class*="end-call"]',
        '[role="button"][aria-label*="Leave"]',
        '[role="button"][aria-label*="退出"]'
      ];
      
      for (const selector of exitButtonSelectors) {
        const buttons = document.querySelectorAll(selector);
        for (const button of buttons) {
          if (button && button.offsetParent !== null) {
            return true;
          }
        }
      }
      
      // より汎用的な検索（すべてのボタンをチェック）
      const allButtons = document.querySelectorAll('button');
      
      for (const button of allButtons) {
        const ariaLabel = button.getAttribute('aria-label') || '';
        const dataTid = button.getAttribute('data-tid') || '';
        const id = button.id || '';
        const className = button.className || '';
        const title = button.title || '';
        const textContent = (button.textContent || '').trim();
        
        if (
          button.offsetParent !== null && (
            ariaLabel.includes('退出') ||
            ariaLabel.includes('Leave') ||
            ariaLabel.includes('hang up') ||
            ariaLabel.includes('End call') ||
            title.includes('Leave') ||
            title.includes('退出') ||
            title.includes('hang up') ||
            title.includes('End call') ||
            textContent.includes('退出') ||
            textContent.includes('Leave') ||
            textContent.includes('終了') ||
            dataTid.includes('hangup') ||
            id.includes('hangup') ||
            className.includes('hangup') ||
            className.includes('leave') ||
            className.includes('end-call')
          )
        ) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Teams会議の退出ボタンを監視
   */
  function setupTeamsEndCallMonitoring() {
    const endCallSelectors = [
      '[data-tid="hangup-main-btn"]',
      '#hangup-button',
      '[data-track-module-name="StopMeetingButton"]',
      'button[aria-label*="退出"]',
      'button[aria-label="退出します"]',
      '[data-tid="call-end-button"]',
      '[data-tid="hangup-button"]',
      'button[title*="Leave"]',
      'button[title*="hang up"]',
      'button[aria-label*="Leave"]',
      'button[aria-label*="hang up"]',
      'button[aria-label*="End call"]',
      'button[title*="End call"]'
    ];

    function attachEndCallListener(btn) {
      if (!btn || btn.dataset.teamsEndListenerAttached) return;
      btn.dataset.teamsEndListenerAttached = '1';

      btn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: "END_CALL", time: new Date().toISOString(), source: "teams" });
      }, true);
    }

    function findAndAttachEndCallListeners() {
      // 特定のセレクターで検索
      for (const selector of endCallSelectors) {
        const buttons = document.querySelectorAll(selector);
        buttons.forEach(btn => attachEndCallListener(btn));
      }

      // クラス名でも検索（Teams特有のクラス）
      const teamsButtons = document.querySelectorAll('button.fui-Button');
      teamsButtons.forEach(btn => {
        const ariaLabel = btn.getAttribute('aria-label') || '';
        const dataTid = btn.getAttribute('data-tid') || '';
        const id = btn.id || '';
        
        if (
          ariaLabel.includes('退出') ||
          ariaLabel.includes('Leave') ||
          ariaLabel.includes('hang up') ||
          ariaLabel.includes('End call') ||
          dataTid.includes('hangup') ||
          id.includes('hangup')
        ) {
          attachEndCallListener(btn);
        }
      });
    }

    // 初回検索
    findAndAttachEndCallListeners();

    // DOM変更を監視
    const observer = new MutationObserver(() => {
      findAndAttachEndCallListeners();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-tid', 'title', 'aria-label', 'id', 'class']
    });

  }

  // Teams会議の退出ボタンが出現するまで待つ
  function waitForTeamsExitButton() {
    let bannerShown = false;
    
    const checkInterval = setInterval(() => {
      if (hasTeamsExitButton()) {
        // 退出ボタンの監視を開始（1回のみ）
        if (!window.__teamsMonitoringStarted__) {
          window.__teamsMonitoringStarted__ = true;
          setupTeamsEndCallMonitoring();
        }
        
        // バナーを表示（1回のみ）
        if (!bannerShown) {
          bannerShown = true;
          showTeamsBanner();
        }
      }
    }, 1000);
    
    // 60秒でタイムアウト
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 60000);
  }

  function showTeamsBanner() {
    const banner = createBanner('paratalkを起動させますか？', () => {
      banner.remove();
      
      // 先にParatalkミーティングページを開く
      chrome.runtime.sendMessage({ action: 'openParatalkMeeting' }, () => {
        // Paratalkページが開かれた後にpublic_idをチェック
        setTimeout(() => {
          chrome.runtime.sendMessage({ action: 'checkPublicId' }, (response) => {
            if (chrome.runtime.lastError) {
              // エラーの場合はログイン必要バナーを表示
              setTimeout(() => createLoginRequiredBanner(), 1000);
              return;
            }
            
            if (response && response.hasPublicId === true) {
              // public_idがある場合：拡張機能アイコンクリックを促すメッセージを表示
              showExtensionClickPrompt();
            } else {
              // public_idがない場合：ログイン必要バナーを表示
              setTimeout(() => createLoginRequiredBanner(), 1000);
            }
          });
        }, 2000); // Paratalkページが開かれるのを2秒待つ
      });
    }, () => {
      chrome.runtime.sendMessage({ action: 'promptResponse', response: 'no', url: location.href });
      banner.remove();
    });
  }

  // Teams URLの場合は退出ボタンの監視を開始
  if (window.location.href.includes('teams.live.com') || window.location.href.includes('teams.microsoft.com')) {
    waitForTeamsExitButton();
  }

  // Paratalkからのメッセージも受信（Google Meetからの終了通知など）
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'teams-connection') {
      port.onMessage.addListener((message) => {
        if (message.type === 'MEET_END_CALL') {
          // Google MeetからTeamsを終了させる必要はないので何もしない
        }
      });
      
      port.onDisconnect.addListener(() => {
        // Port disconnected
      });
    }
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