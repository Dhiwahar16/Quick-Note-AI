// Listen for messages from content.js or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getCurrentTabUrl") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
              sendResponse({ url: tabs[0].url });
          } else {
              sendResponse({ url: null });
          }
      });
      return true; // Keeps the async response open
  }
});
