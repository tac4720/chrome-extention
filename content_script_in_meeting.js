(() => {
  const SELECTOR = 'button[aria-label="通話から退出"]';

  function attachListener(btn) {
    if (!btn || btn.dataset.meetEndListenerAttached) return;
    btn.dataset.meetEndListenerAttached = '1';

    btn.addEventListener('click', () => {
      console.log('[Meet End Watcher] End-call button clicked:', new Date().toISOString());
      chrome.runtime.sendMessage({ type: "END_CALL", time: new Date().toISOString() });
    }, true);

    console.log('[Meet End Watcher] listener attached');
  }

  function findAndAttach() {
    const btn = document.querySelector(SELECTOR);
    if (btn) attachListener(btn);
  }

  // 初回
  findAndAttach();

  // DOM が動的に変わるので監視
  const observer = new MutationObserver(() => findAndAttach());
  observer.observe(document.body, { childList: true, subtree: true });
})();
