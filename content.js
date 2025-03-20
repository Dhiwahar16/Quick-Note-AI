// content.js
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // Listen for messages from the popup to start speech recognition
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "startSpeechRecognition") {
            console.log("Content script: Starting speech recognition...");
            try {
                recognition.start();
                sendResponse({ status: "started" });
            } catch (err) {
                console.error("Content script: Speech recognition start error:", err);
                sendResponse({ status: "error", message: err.message });
            }
        } else if (message.action === "getPageInfo") {
            // Handle the getPageInfo request for AI suggestions
            const pageInfo = {
                title: document.title || "Unknown",
                url: window.location.href || "Unknown",
                selectedText: window.getSelection().toString() || "None"
            };
            sendResponse(pageInfo);
        }
        return true; // Keep the message channel open for async responses
    });

    recognition.onstart = () => {
        console.log("Content script: Speech recognition started.");
        chrome.runtime.sendMessage({ action: "speechStatus", status: "listening" });
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log("Content script: Transcription successful:", transcript);
        chrome.runtime.sendMessage({ action: "speechResult", transcript: transcript });
    };

    recognition.onerror = (event) => {
        console.error("Content script: Speech recognition error:", event.error);
        let errorMessage;
        switch (event.error) {
            case "no-speech":
                errorMessage = "No speech detected.";
                break;
            case "audio-capture":
                errorMessage = "Microphone access failed.";
                break;
            case "not-allowed":
                errorMessage = "Microphone permission denied.";
                break;
            case "network":
                errorMessage = "Network issue with speech service.";
                break;
            default:
                errorMessage = `Speech recognition failed: ${event.error}`;
        }
        chrome.runtime.sendMessage({ action: "speechError", error: errorMessage });
    };

    recognition.onend = () => {
        console.log("Content script: Speech recognition ended.");
        chrome.runtime.sendMessage({ action: "speechStatus", status: "ended" });
    };
} else {
    console.error("Content script: Speech Recognition API not supported.");
    chrome.runtime.sendMessage({ action: "speechError", error: "Voice input not supported in this browser." });
}