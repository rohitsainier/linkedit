chrome.action.onClicked.addListener((tab) => {
  if (tab.url && tab.url.includes('linkedin.com')) {
    chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
  }
});
