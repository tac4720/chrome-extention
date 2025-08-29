(() => {
  if (window.__zoom_slide_prompt_injected__) return;
  window.__zoom_slide_prompt_injected__ = true;

  function createBanner(text, onYes, onNo) {
    const container = document.createElement('div');
    container.id = 'zoom-slide-banner';
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
    container.id = 'zoom-slide-info-banner';
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
    container.id = 'zoom-slide-login-required-banner';
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

  // Zoom会議の退出ボタンが存在するかを判定
  function hasZoomExitButton() {
    try {
      // すべての要素を検索
      const allElements = document.querySelectorAll('*');
      let exitButtonFound = false;
      
      // すべての要素をチェック
      allElements.forEach((element) => {
        // ボタンまたはボタン的な要素のみチェック
        if (element.tagName === 'BUTTON' || 
            element.getAttribute('role') === 'button' ||
            element.onclick ||
            element.className.includes('button') ||
            element.className.includes('btn')) {
          
          const ariaLabel = element.getAttribute('aria-label') || '';
          const textContent = (element.textContent || '').trim();
          const className = element.className || '';
          
          // 退出ボタンの検出
          if (element.offsetParent !== null && (
              ariaLabel.includes('退出') ||
              textContent.includes('退出') ||
              ariaLabel.toLowerCase().includes('leave') ||
              textContent.toLowerCase().includes('leave') ||
              className.includes('footer-button-base__button')
            )) {
            exitButtonFound = true;
          }
        }
      });
      
      // iframe内も検索（アクセス可能な場合のみ）
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((iframe) => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          if (iframeDoc) {
            const iframeButtons = iframeDoc.querySelectorAll('button, [role="button"]');
            iframeButtons.forEach(btn => {
              const ariaLabel = btn.getAttribute('aria-label') || '';
              const textContent = (btn.textContent || '').trim();
              
              if (ariaLabel.includes('退出') || textContent.includes('退出')) {
                exitButtonFound = true;
              }
            });
          }
        } catch (e) {
          // iframe アクセス不可
        }
      });
      
      return exitButtonFound;
    } catch (error) {
      return false;
    }
  }

  /**
   * Zoom会議の退出ボタンを監視
   */
  function setupZoomEndCallMonitoring() {
    const endCallSelectors = [
      'button[aria-label="退出"]',
      'button[aria-label*="退出"]',
      'button[aria-label*="Leave"]',
      'button[aria-label*="End"]',
      'button[title*="Leave"]',
      'button[title*="End"]',
      'button[title*="退出"]',
      '.footer-button-base__button[aria-label*="退出"]',
      '.footer-button__button[aria-label*="退出"]',
      'button.footer-button-base__button',
      '.leave-btn',
      '.end-btn'
    ];

    function attachEndCallListener(btn) {
      if (!btn || btn.dataset.zoomEndListenerAttached) return;
      btn.dataset.zoomEndListenerAttached = '1';

      btn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: "END_CALL", time: new Date().toISOString(), source: "zoom" });
      }, true);
    }

    function findAndAttachEndCallListeners() {
      // 特定のセレクターで検索
      for (const selector of endCallSelectors) {
        const buttons = document.querySelectorAll(selector);
        buttons.forEach(btn => attachEndCallListener(btn));
      }

      // 汎用的な検索
      const allButtons = document.querySelectorAll('button');
      allButtons.forEach(btn => {
        const ariaLabel = btn.getAttribute('aria-label') || '';
        const title = btn.title || '';
        const textContent = (btn.textContent || '').trim();
        const className = btn.className || '';
        
        if (
          ariaLabel.includes('退出') ||
          ariaLabel.toLowerCase().includes('leave') ||
          ariaLabel.toLowerCase().includes('end') ||
          title.includes('退出') ||
          title.toLowerCase().includes('leave') ||
          title.toLowerCase().includes('end') ||
          textContent.includes('退出') ||
          textContent.includes('終了') ||
          textContent.toLowerCase().includes('leave') ||
          textContent.toLowerCase().includes('end') ||
          className.includes('footer-button-base__button') ||
          className.includes('leave') ||
          className.includes('end')
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
      attributeFilter: ['aria-label', 'title', 'class']
    });
  }

  // Zoom会議の退出ボタンが出現するまで待つ
  function waitForZoomExitButton() {
    let bannerShown = false;
    
    const checkInterval = setInterval(() => {
      if (hasZoomExitButton()) {
        // 退出ボタンの監視を開始（1回のみ）
        if (!window.__zoomMonitoringStarted__) {
          window.__zoomMonitoringStarted__ = true;
          setupZoomEndCallMonitoring();
        }
        
        // バナーを表示（1回のみ）
        if (!bannerShown) {
          bannerShown = true;
          showZoomBanner();
        }
      }
    }, 1000);
    
    // 60秒でタイムアウト
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 60000);
  }

  function showZoomBanner() {
    const banner = createBanner('paratalkを起動させますか？', () => {
      banner.remove();
      
      // public_idをチェック
      chrome.runtime.sendMessage({ action: 'checkPublicId' }, (response) => {
        if (chrome.runtime.lastError) {
          // エラーの場合はParatalkページを開いてからログイン必要バナーを表示
          chrome.runtime.sendMessage({ action: 'focusOrOpenParatalk' }, () => {
            setTimeout(() => createLoginRequiredBanner(), 1000);
          });
          return;
        }
        
        if (response && response.hasPublicId === true) {
          // public_idがある場合：直接拡張機能アイコンクリックを促すメッセージを表示
          showExtensionClickPrompt();
        } else {
          // public_idがない場合：Paratalkページを開いてからログイン必要バナーを表示
          chrome.runtime.sendMessage({ action: 'focusOrOpenParatalk' }, () => {
            setTimeout(() => createLoginRequiredBanner(), 1000);
          });
        }
      });
    }, () => {
      chrome.runtime.sendMessage({ action: 'promptResponse', response: 'no', url: location.href });
      banner.remove();
    });
  }

  // Zoom URLの場合は退出ボタンの監視を開始
  if (window.location.href.includes('zoom.us')) {
    waitForZoomExitButton();
  }

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