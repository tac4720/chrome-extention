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
      console.log('[Zoom ContentScript] 退出ボタン検出開始');
      
      // より具体的なZoom要素の検出
      const zoomIndicators = [
        // Zoom特有のUI要素
        '[data-testid*="leave"]',
        '[data-testid*="end"]', 
        '[data-testid*="hangup"]',
        '.footer-button-base__button',
        '.footer-button__button',
        '.zm-btn--danger',
        // 一般的な退出ボタン
        'button[aria-label*="Leave"]',
        'button[aria-label*="End"]',
        'button[aria-label*="退出"]',
        'button[title*="Leave"]',
        'button[title*="End"]',
        'button[title*="退出"]',
        // Zoomミーティングが開始されている場合の特徴的要素
        '.join-audio-container',
        '.meeting-client-inner',
        '.zm-video-container',
        '#wc-container-left',
        '#wc-footer'
      ];
      
      // まず、Zoomミーティングページかどうかを判定
      const isZoomMeeting = zoomIndicators.some(selector => {
        const elements = document.querySelectorAll(selector);
        return elements.length > 0;
      });
      
      if (isZoomMeeting) {
        console.log('[Zoom ContentScript] Zoomミーティング要素を検出、バナーを表示');
        return true;
      }
      
      // より広範囲な検索（退出ボタン特定）
      const allElements = document.querySelectorAll('*');
      let exitButtonFound = false;
      
      allElements.forEach((element) => {
        if (element.tagName === 'BUTTON' || 
            element.getAttribute('role') === 'button' ||
            element.onclick ||
            element.className.includes('button') ||
            element.className.includes('btn')) {
          
          const ariaLabel = element.getAttribute('aria-label') || '';
          const textContent = (element.textContent || '').trim().toLowerCase();
          const className = element.className || '';
          const title = element.title || '';
          
          // より幅広い退出ボタンの検出
          if (element.offsetParent !== null && (
              ariaLabel.includes('退出') ||
              ariaLabel.toLowerCase().includes('leave') ||
              ariaLabel.toLowerCase().includes('end meeting') ||
              ariaLabel.toLowerCase().includes('end call') ||
              textContent.includes('退出') ||
              textContent.includes('leave') ||
              textContent.includes('end meeting') ||
              textContent.includes('end call') ||
              title.toLowerCase().includes('leave') ||
              title.toLowerCase().includes('end') ||
              className.includes('footer-button-base__button') ||
              className.includes('zm-btn--danger')
            )) {
            console.log('[Zoom ContentScript] 退出ボタンを発見:', element);
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
              const textContent = (btn.textContent || '').trim().toLowerCase();
              
              if (ariaLabel.includes('退出') || ariaLabel.toLowerCase().includes('leave') ||
                  textContent.includes('退出') || textContent.includes('leave')) {
                console.log('[Zoom ContentScript] iframe内で退出ボタンを発見:', btn);
                exitButtonFound = true;
              }
            });
          }
        } catch (e) {
          // iframe アクセス不可
        }
      });
      
      console.log('[Zoom ContentScript] 退出ボタン検出結果:', exitButtonFound);
      return exitButtonFound;
    } catch (error) {
      console.error('[Zoom ContentScript] 退出ボタン検出エラー:', error);
      return false;
    }
  }

  /**
   * Zoom会議の退出ボタンを監視
   */
  function setupZoomEndCallMonitoring() {
    const endCallSelectors = [
      // 基本的な退出ボタン
      'button[aria-label="退出"]',
      'button[aria-label*="退出"]',
      'button[aria-label*="Leave"]',
      'button[aria-label*="End"]',
      'button[aria-label*="leave"]',
      'button[aria-label*="end"]',
      'button[title*="Leave"]',
      'button[title*="End"]',
      'button[title*="退出"]',
      'button[title*="leave"]',
      'button[title*="end"]',
      // Zoom特有のクラス
      '.footer-button-base__button[aria-label*="退出"]',
      '.footer-button__button[aria-label*="退出"]',
      'button.footer-button-base__button',
      'button[data-testid*="leave"]',
      'button[data-testid*="end"]',
      'button[data-testid*="exit"]',
      // より広範囲の検索
      '.leave-btn',
      '.end-btn',
      '.exit-btn',
      'button[class*="leave"]',
      'button[class*="end"]',
      'button[class*="exit"]',
      // 赤色のボタン（通常退出ボタンは赤）
      'button[style*="background-color: rgb(255"]',
      'button[style*="background-color:#ff"]',
      'button[class*="danger"]',
      'button[class*="error"]'
    ];

    function attachEndCallListener(btn) {
      if (!btn || btn.dataset.zoomEndListenerAttached) return;
      btn.dataset.zoomEndListenerAttached = '1';

      console.log('[Zoom ContentScript] 退出ボタンにリスナーを追加:', btn.outerHTML.substring(0, 100));
      btn.addEventListener('click', () => {
        console.log('[Zoom ContentScript] 退出ボタンがクリックされました - Paratalkに終了メッセージを送信');
        chrome.runtime.sendMessage({ type: "END_CALL", time: new Date().toISOString(), source: "zoom" });
      }, true);
    }

    function findAndAttachEndCallListeners() {
      console.log('[Zoom ContentScript] 退出ボタンを検索中...');
      let foundButtons = 0;
      
      try {
        // hasZoomExitButton()と同じロジックを使用：すべての要素を検索
        const allElements = document.querySelectorAll('*');
        console.log(`[Zoom ContentScript] 全要素数: ${allElements.length}`);
        
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
            
            // 退出ボタンの検出（hasZoomExitButton()と同じ条件）
            if (element.offsetParent !== null && (
                ariaLabel.includes('退出') ||
                textContent.includes('退出') ||
                ariaLabel.toLowerCase().includes('leave') ||
                textContent.toLowerCase().includes('leave') ||
                className.includes('footer-button-base__button')
              )) {
              
              console.log('[Zoom ContentScript] 退出ボタンを発見:', {
                tagName: element.tagName,
                ariaLabel,
                textContent: textContent.substring(0, 50),
                className: className.substring(0, 100),
                outerHTML: element.outerHTML.substring(0, 200)
              });
              
              attachEndCallListener(element);
              foundButtons++;
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
                
                if (ariaLabel.includes('退出') || textContent.includes('退出') || 
                    ariaLabel.toLowerCase().includes('leave') || textContent.toLowerCase().includes('leave')) {
                  console.log('[Zoom ContentScript] iframe内で退出ボタンを発見:', {
                    ariaLabel,
                    textContent: textContent.substring(0, 50)
                  });
                  attachEndCallListener(btn);
                  foundButtons++;
                }
              });
            }
          } catch (e) {
            // iframe アクセス不可
          }
        });
        
      } catch (error) {
        console.error('[Zoom ContentScript] 退出ボタン検索エラー:', error);
      }
      
      console.log(`[Zoom ContentScript] ${foundButtons}個の退出ボタンにリスナーを追加`);
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
        if (!bannerShown && !window.__zoomBannerShown__) {
          bannerShown = true;
          window.__zoomBannerShown__ = true;
          console.log('[Zoom ContentScript] Zoomミーティング検出、バナーを表示');
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
    console.log('[Zoom ContentScript] showZoomBanner関数開始');
    const banner = createBanner('paratalkを起動させますか？', () => {
      console.log('[Zoom ContentScript] 「はい」ボタンがクリックされました');
      banner.remove();
      
      // 先にParatalkミーティングページを開く
      console.log('[Zoom ContentScript] openParatalkMeetingアクションを送信');
      
      // openParatalkMeetingを試行するが、エラーが発生しても処理を続行
      const executeNextStep = () => {
        console.log('[Zoom ContentScript] 2秒待機後にpublicIdチェック開始');
        setTimeout(() => {
          console.log('[Zoom ContentScript] checkPublicIdアクションを送信');
          chrome.runtime.sendMessage({ action: 'checkPublicId' }, (response) => {
            console.log('[Zoom ContentScript] checkPublicId応答:', response);
            console.log('[Zoom ContentScript] chrome.runtime.lastError:', chrome.runtime.lastError);
            
            if (chrome.runtime.lastError) {
              console.error('[Zoom ContentScript] checkPublicIdエラー:', chrome.runtime.lastError);
              // エラーの場合はログイン必要バナーを表示
              console.log('[Zoom ContentScript] エラーのためログイン必要バナーを表示');
              setTimeout(() => createLoginRequiredBanner(), 1000);
              return;
            }
            
            if (response && response.hasPublicId) {
              console.log('[Zoom ContentScript] publicIdあり - 拡張機能クリックプロンプトを表示');
              // public_idがある場合：拡張機能アイコンクリックを促すメッセージを表示
              try {
                showExtensionClickPrompt();
                console.log('[Zoom ContentScript] showExtensionClickPrompt実行完了');
              } catch (error) {
                console.error('[Zoom ContentScript] showExtensionClickPromptエラー:', error);
              }
            } else {
              console.log('[Zoom ContentScript] publicIdなし - ログイン必要バナーを表示');
              // public_idがない場合：ログイン必要バナーを表示
              setTimeout(() => createLoginRequiredBanner(), 1000);
            }
          });
        }, 2000); // Paratalkページが開かれるのを2秒待つ
      };
      
      try {
        chrome.runtime.sendMessage({ action: 'openParatalkMeeting' }, (openResponse) => {
          console.log('[Zoom ContentScript] openParatalkMeeting応答:', openResponse);
          
          if (chrome.runtime.lastError) {
            console.error('[Zoom ContentScript] openParatalkMeetingエラー（処理は続行）:', chrome.runtime.lastError);
          }
          
          // エラーがあってもなくても次のステップを実行
          executeNextStep();
        });
      } catch (error) {
        console.error('[Zoom ContentScript] openParatalkMeeting送信エラー:', error);
        // エラーでも次のステップを実行
        executeNextStep();
      }
    }, () => {
      console.log('[Zoom ContentScript] 「いいえ」ボタンがクリックされました');
      chrome.runtime.sendMessage({ action: 'promptResponse', response: 'no', url: location.href });
      banner.remove();
    });
  }

  // Zoom URLの場合は退出ボタンの監視を開始
  if (window.location.href.includes('zoom.us')) {
    console.log('[Zoom ContentScript] Zoom URLを検出:', window.location.href);
    waitForZoomExitButton();
    
    // フォールバック: 10秒後に退出ボタンが見つからない場合でもバナーを表示
    setTimeout(() => {
      if (!window.__zoomBannerShown__) {
        console.log('[Zoom ContentScript] フォールバック: 10秒後にバナーを表示');
        window.__zoomBannerShown__ = true;
        showZoomBanner();
      }
    }, 10000);
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
    console.log('[Zoom ContentScript] showExtensionClickPrompt関数開始');
    
    // 既存のプロンプトがある場合は削除
    const existingPrompt = document.getElementById('paratalk-extension-prompt');
    if (existingPrompt) {
      console.log('[Zoom ContentScript] 既存のプロンプトを削除');
      existingPrompt.remove();
    }

    const container = document.createElement('div');
    container.id = 'paratalk-extension-prompt';
    container.style.cssText = `
      position: fixed !important;
      top: 16px !important;
      right: 16px !important;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      color: white !important;
      padding: 20px !important;
      border-radius: 12px !important;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
      z-index: 2147483647 !important;
      max-width: 350px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 14px !important;
      line-height: 1.5 !important;
      animation: slideInFromRight 0.3s ease-out !important;
      backdrop-filter: blur(10px) !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      width: auto !important;
      height: auto !important;
      overflow: visible !important;
      pointer-events: auto !important;
      transform: none !important;
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

    console.log('[Zoom ContentScript] プロンプト要素を構築中');
    container.appendChild(title);
    container.appendChild(message);
    container.appendChild(iconHint);
    container.appendChild(closeButton);
    
    console.log('[Zoom ContentScript] DOMにプロンプト要素を追加');
    console.log('[Zoom ContentScript] 現在のwindow情報:', {
      isIframe: window !== window.top,
      href: window.location.href,
      parentHref: window.parent ? (window.parent !== window ? 'iframe detected' : 'same window') : 'no parent'
    });
    
    // 複数の場所に要素を追加を試行
    const targetElements = [
      document.documentElement,
      document.body,
      document.querySelector('body'),
      document.querySelector('html')
    ].filter(Boolean);
    
    let added = false;
    for (const target of targetElements) {
      try {
        if (target && typeof target.appendChild === 'function') {
          target.appendChild(container);
          console.log('[Zoom ContentScript] プロンプト要素を追加:', target.tagName);
          added = true;
          break;
        }
      } catch (e) {
        console.warn('[Zoom ContentScript] 追加失敗:', target.tagName, e);
      }
    }
    
    if (!added) {
      console.error('[Zoom ContentScript] どの要素にも追加できませんでした');
    } else {
      console.log('[Zoom ContentScript] プロンプト要素追加完了:', container);
      
      // z-indexを強制的に最大値に設定
      container.style.zIndex = '2147483647';
      container.style.position = 'fixed';
      
      // 1秒後に要素が実際に表示されているかチェック
      setTimeout(() => {
        const rect = container.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0 && 
                         container.offsetParent !== null &&
                         getComputedStyle(container).display !== 'none';
        console.log('[Zoom ContentScript] プロンプト可視性チェック:', {
          rect,
          isVisible,
          offsetParent: container.offsetParent,
          computedDisplay: getComputedStyle(container).display,
          computedVisibility: getComputedStyle(container).visibility
        });
        
        if (!isVisible) {
          console.warn('[Zoom ContentScript] プロンプトが見えない可能性があります');
          
          // iframe内で表示できない場合の代替案として、background scriptに表示要請
          if (window !== window.top) {
            console.log('[Zoom ContentScript] iframe内のため、background scriptに表示要請');
            chrome.runtime.sendMessage({
              action: 'showExtensionClickPrompt',
              source: 'zoom-iframe'
            });
          }
        }
      }, 1000);
    }

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