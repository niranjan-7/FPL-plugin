import type { ExtensionMessage, PageContext } from '@fpl-companion/shared';

// Open the Side Panel when user clicks on the extension action icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('[Background] Failed to set sidePanel behavior:', error));

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] FPL AI Companion installed successfully.');
  chrome.storage.local.set({
    backendUrl: 'http://localhost:3001',
    appMode: 'classic',
    lastSync: Date.now(),
    pageContext: {
      mode: 'classic',
      url: '',
      managerId: 481920,
      activeGameweek: 9,
    },
  });
});

// Relay messages between content script and side panel
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  if (message.action === 'PAGE_STATE_UPDATED') {
    const pageContext = message.payload as PageContext;
    console.log('[Background] Received PAGE_STATE_UPDATED:', pageContext);

    chrome.storage.local.set({
      pageContext,
      appMode: 'classic',
      lastSync: Date.now(),
    });

    sendResponse({ received: true });
    return true;
  }

  if (message.action === 'PING_BACKEND') {
    fetch('http://localhost:3001/api/health')
      .then((res) => res.json())
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true; // Keep message port open for async response
  }
});
