// Open sidebar when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

// Enable the side panel for all Atlassian pages
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Route messages between sidebar <-> content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target === 'content') {
    // Forward from sidebar to ALL frames in the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab) return;

      const sendMessageToFrame = (tabId, msg, options = {}) => {
        chrome.tabs.sendMessage(tabId, msg, options, () => {
          // Check for errors to prevent "Uncaught (in promise)" or "Receiving end does not exist"
          if (chrome.runtime.lastError) {
            // Silence "Receiving end does not exist" as we expect some frames won't have the script
            const errMsg = chrome.runtime.lastError.message;
            if (!errMsg.includes('Receiving end does not exist')) {
              console.warn('[JiraHelper] Messaging error:', errMsg, 'Frame:', options.frameId || 0);
            }
          }
        });
      };

      // 1. Send to main frame
      sendMessageToFrame(activeTab.id, message);
      
      // 2. Send to all other frames
      if (chrome.webNavigation) {
        chrome.webNavigation.getAllFrames({ tabId: activeTab.id }, (frames) => {
          if (frames) {
            frames.forEach(frame => {
              if (frame.frameId !== 0) {
                sendMessageToFrame(activeTab.id, message, { frameId: frame.frameId });
              }
            });
          }
        });
      }
    });

    sendResponse({ status: 'broadcast_started' });
    return true; // async
  }

  if (message.target === 'sidebar') {
    // Forward from content script to sidebar — sidebar listens directly
    // No routing needed, sidebar uses chrome.runtime.onMessage
  }
});
