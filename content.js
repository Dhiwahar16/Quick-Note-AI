// Extract page information
function getPageInfo() {
    const title = document.title || "No title available";
    const url = window.location.href || "No URL available";
    const selectedText = window.getSelection().toString().trim() || "No text selected";
    return { title, url, selectedText };
}

// Listen for messages from the popup to send page info
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getPageInfo") {
        const pageInfo = getPageInfo();
        sendResponse(pageInfo);
    }
});