function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    tabId: parseInt(params.get('tabId'), 10),
    url: params.get('url') || ''
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const { tabId, url } = getQueryParams();
  const urlEl = document.getElementById('url');
  if (urlEl) urlEl.textContent = url;

  document.getElementById('yes').addEventListener('click', () => {
    chrome.runtime.sendMessage({
      action: 'promptResponse',
      response: 'yes',
      tabId,
      url
    });
    window.close();
  });

  document.getElementById('no').addEventListener('click', () => {
    chrome.runtime.sendMessage({
      action: 'promptResponse',
      response: 'no',
      tabId,
      url
    });
    window.close();
  });
});

