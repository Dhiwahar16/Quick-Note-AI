// API Key (for now, replace with secure storage in production)
const API_KEY = "AIzaSyAFy1PE-NhZsIslFeRTvQwPN1XcjdQdAF8"; // Ensure this key is valid

async function fetchAIResponse(promptText) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    const requestData = {
        contents: [
            {
                parts: [
                    {
                        text: promptText
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500
        }
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("API Error:", errorData);
            return `API Error: ${errorData.error.message}`;
        }

        const data = await response.json();
        console.log("AI Response:", data);

        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts) {
            return data.candidates[0].content.parts[0].text;
        } else {
            console.warn("No valid candidates in API response:", data);
            return "AI could not generate a response.";
        }
    } catch (error) {
        console.error("Error fetching AI response:", error);
        return "Error fetching AI response: " + error.message;
    }
}

function saveNote() {
    const noteInput = document.getElementById("noteInput");
    const noteText = noteInput.innerHTML.trim();

    if (noteText && noteText !== '<br>') {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const currentUrl = tabs[0].url;
            const currentTitle = tabs[0].title;
            let notes = JSON.parse(localStorage.getItem("notes")) || [];
            notes.push({ text: noteText, url: currentUrl, urlname: currentTitle });
            localStorage.setItem("notes", JSON.stringify(notes));
            displayNotes();
            noteInput.innerHTML = '';
            noteInput.setAttribute('data-placeholder', "Note saved! Type another...");
            setTimeout(() => noteInput.setAttribute('data-placeholder', "Type your note..."), 2000);
        });
    }
}

function displayNotes() {
    const noteList = document.getElementById("noteList");
    const notes = JSON.parse(localStorage.getItem("notes")) || [];
    noteList.innerHTML = '';
    
    notes.slice().reverse().forEach((note, index) => {
        const li = document.createElement("li");
        
        const noteText = document.createElement("p");
        noteText.innerHTML = note.text;
        
        const noteUrl = document.createElement("small");
        noteUrl.innerHTML = `<a href="${note.url}" target="_blank">${note.urlname}</a>`;
        
        const deleteBtn = document.createElement("button");
        deleteBtn.innerHTML = `<img src="assets/delete.jpg" alt="Delete" style="width: 20px; height: 20px;">`;
        deleteBtn.classList.add("delete-btn");
        deleteBtn.addEventListener("click", () => deleteNote(notes.length - 1 - index));

        li.appendChild(noteUrl);
        li.appendChild(noteText);
        li.appendChild(deleteBtn);

        noteList.appendChild(li);
    });
}

function deleteNote(index) {
    let notes = JSON.parse(localStorage.getItem("notes")) || [];
    notes.splice(index, 1);
    localStorage.setItem("notes", JSON.stringify(notes));
    displayNotes();
}

async function initializeChat() {
    const pageData = await getPageContent();
    const pageContent = pageData.content;
    const pageUrl = pageData.url;
    
    loadChatHistory();
    
    document.getElementById("send-btn").addEventListener("click", async () => {
        const inputText = document.getElementById("user-text");
        const userInput = inputText.value.trim();
    
        if (!userInput) return;
        
        updateChat("You: ", userInput);
        saveChatHistory("You: ", userInput);
        inputText.value = "";
    
        const response = await getResponse(userInput, pageContent, pageUrl);
        updateChat("Black AI: ", response);
        saveChatHistory("Black AI: ", response);
    });
    
    document.getElementById("clear-btn").addEventListener("click", clearChat);
}


const input = document.getElementById('user-text')
const button = document.getElementById('send-btn');

input.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        button.click();
    }
})

document.addEventListener('keydown', function (event) {
    if (event.key) {
        input.focus();
    }
})

function updateChat(sender, message) {
    const chatBox = document.getElementById("chat-box");
    const messageP = document.createElement("p");
    const formattedMessage = formatAIResponse(message);
    // Include <strong> inside the <span> to apply background to both sender and message
    messageP.innerHTML = `<span><strong>${sender}</strong> ${formattedMessage}</span>`;

    // Add class based on sender
    if (sender === "Black AI: ") {
        messageP.classList.add("ai-message");
    } else if (sender === "You: ") {
        messageP.classList.add("user-message");
    }

    chatBox.appendChild(messageP);
    chatBox.scrollTop = chatBox.scrollHeight;
}
function loadChatHistory() {
    chrome.storage.local.get(["chatHistory"], (result) => {
        const chatHistory = result.chatHistory || [];
        chatHistory.forEach(entry => {
            updateChat(entry.sender, entry.message);
        });
    });
}

function saveChatHistory(sender, message) {
    const chatEntry = {
        sender,
        message,
        timestamp: Date.now()
    };
    chrome.storage.local.get(["chatHistory"], (result) => {
        let chatHistory = result.chatHistory || [];
        chatHistory.push(chatEntry);
        chrome.storage.local.set({ chatHistory }, () => {
            console.log("Chat updated chatbox", chatEntry);
        });
    });
}

async function getPageContent() {
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tabs[0].id },
                    function: () => document.body.innerText
                },
                (results) => {
                    if (results && results[0] && results[0].result) {
                        resolve({
                            content: results[0].result,
                            url: tabs[0].url
                        });
                    } else {
                        resolve({
                            content: "Unable to fetch content",
                            url: tabs[0].url || "Unknown URL"
                        });
                    }
                }
            );
        });
    });
}

function getChatHistoryForAI() {
    return new Promise((resolve) => {
        chrome.storage.local.get(["chatHistory"], (result) => {
            resolve(result.chatHistory || []);
        });
    });
}

async function getResponse(prompt, pageContent, pageUrl) {
    try {
        // Fetch the chat history for context
        const chatHistoryForAI = await getChatHistoryForAI();
        let contextForAI = "Previous conversation:\n";
        chatHistoryForAI.forEach((entry) => {
            contextForAI += `${entry.sender}:${entry.message}\n`;
        });
        contextForAI += "\nNow respond to current question.\n";

        // Detect if the prompt is code-related using a regex
        const isCodeRelated = /function|class|\{|\}|=>|var|let|const/i.test(prompt);
        let enhancedPrompt = prompt;

        // Adjust the prompt if it’s code-related for a more tailored response
        if (isCodeRelated) {
            enhancedPrompt = `
            This seems like a coding-related question. Provide a detailed solution with code examples if applicable, 
            and explain the solution step-by-step: ${prompt}
            `;
        }

        // Base system instruction for the AI, including webpage context
        const systemInstruction = `
        You are an AI assistant that answers questions related to the domain of the current webpage (e.g., programming, learning, applications) and can solve problems within that domain. 
        Here is the webpage content for context: "${pageContent.substring(0, 6000)}" (limited to 6000 characters for brevity).
        Here is the webpage URL for analysis: "${pageUrl}".
        Answer the user's question based on the webpage content, its domain, and the URL. If the user asks about the current website (e.g., its features, usage, advantages, disadvantages, or alternatives), analyze the URL and provide relevant insights. 
        If the user asks to solve a problem mentioned on the webpage or related to its domain (e.g., coding issues, learning strategies, app functionality), provide a detailed solution using the content as a starting point and your understanding of the domain.
        For domain-specific questions (e.g., programming languages, software engineering, learning platforms, app usage), answer broadly within the domain, referencing similar websites or concepts only if supported by the webpage content or URL context—do not speculate beyond this.
        Respond to basic greetings (e.g., "Hi") appropriately. If the question is unrelated to the webpage’s domain (e.g., cooking on a programming site), reply with: "I can only answer questions related to the domain of this webpage."
        Do not include previous chat history in your answers unless the user explicitly asks about it (e.g., "What did I ask before?"). 
        Provide concise, accurate, and detailed responses, diving into specifics with insights, explanations, or examples tied to the webpage content, domain, or URL analysis. Avoid external information beyond what’s provided or implied by the domain.
        `;

        // Fetch the main AI response
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: systemInstruction },
                        { text: `${contextForAI}User question: ${enhancedPrompt}` }
                    ]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                }
            })
        });

        if (!res.ok) {
            throw new Error(`HTTP error status: ${res.status}`);
        }

        const data = await res.json();
        const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from AI";

        const followUpPrompt = `
        Based on this response: "${aiText}", suggest 2-3 concise follow-up questions the user might ask next. 
        Format the suggestions as a numbered list (e.g., "1. [question]"). 
        Keep them relevant to the response and the webpage domain.ask questions with 3 or 4 words for user understanding.
        `;
        const followUpRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: followUpPrompt }]
                }],
                generationConfig: {
                    temperature: 0.9,
                    maxOutputTokens: 100
                }
            })
        });

        const followUpData = await followUpRes.json();
        const followUps = followUpData?.candidates?.[0]?.content?.parts?.[0]?.text || "No follow-up suggestions available.";

        const fullResponse = `${aiText}\n\n\n**Suggested Follow-ups:**\n${followUps}`;

        return fullResponse;

    } catch (err) {
        console.error("Error talking to AI:", err);
        return `Something went wrong: ${err.message}`;
    }
}

function clearChat() {
    const chatBoxHistory = document.getElementById("chat-box");
    chatBoxHistory.innerHTML = "";

    chrome.storage.local.remove("chatHistory", () => {
        console.log("Chat history cleared");
    });
}

function formatAIResponse(rawResponse) {
    const cleanedResponse = rawResponse.replace(/\*\*/g, '').trim();
    const lines = cleanedResponse.split('\n').filter(line => line.trim() !== '');
    
    let formatted = '';
    let inCodeBlock = false;
    let inList = false;
    let listCounter = 1;

    lines.forEach((line, index) => {
        const trimmedLine = line.trim();

        // Detect start/end of code block
        if (trimmedLine.startsWith('```')) {
            if (inCodeBlock) {
                formatted += '</code></pre>';
                inCodeBlock = false;
            } else {
                formatted += '<pre><code>';
                inCodeBlock = true;
            }
            return;
        }

        // Handle code block content
        if (inCodeBlock) {
            formatted += `${line}\n`; // Keep original indentation
            return;
        }

        // Detect list items
        if (trimmedLine.match(/^\d+\.\s/) || trimmedLine.startsWith('* ')) {
            if (!inList) {
                formatted += '<br>';
                inList = true;
            }
            const listContent = trimmedLine.replace(/^\d+\.\s|\*\s/, '');
            formatted += `${listCounter++}. ${listContent}<br>`;
            return;
        } else if (inList) {
            inList = false;
            listCounter = 1;
        }

        // Handle bold text
        if (trimmedLine.includes('Note:') || trimmedLine.includes('Title:')) {
            const parts = trimmedLine.split(':');
            formatted += `<b>${parts[0]}:</b> ${parts.slice(1).join(':').trim()}<br><br>`;
            return;
        }

        // Default: Plain text
        formatted += `${trimmedLine}<br>`;
    });

    if (inCodeBlock) {
        formatted += '</code></pre>';
    }

    return formatted || cleanedResponse.replace(/\n/g, '<br>');
}

document.addEventListener("DOMContentLoaded", function () {
    const quickNotesBtn = document.getElementById("quickNotesBtn");
    const previousNotesBtn = document.getElementById("previousNotesBtn");
    const blackAIBtn = document.getElementById("black-ai");
    const quickNotesSection = document.getElementById("quickNotesSection");
    const previousNotesSection = document.getElementById("previousNotesSection");
    const blackAISection = document.getElementById("blackAISection");
    const aiSuggestBtn = document.getElementById("aiSuggestBtn");
    const noteInput = document.getElementById("noteInput");
    const saveBtn = document.getElementById("saveBtn");

    if (!aiSuggestBtn || !noteInput || !saveBtn || !blackAIBtn) {
        console.error("Required elements not found.");
        return;
    }

    function showQuickNotes() {
        quickNotesSection.style.display = "block";
        previousNotesSection.style.display = "none";
        blackAISection.style.display = "none";
        quickNotesBtn.classList.add("active");
        previousNotesBtn.classList.remove("active");
        blackAIBtn.classList.remove("active");
    }

    function showPreviousNotes() {
        quickNotesSection.style.display = "none";
        previousNotesSection.style.display = "block";
        blackAISection.style.display = "none";
        quickNotesBtn.classList.remove("active");
        previousNotesBtn.classList.add("active");
        blackAIBtn.classList.remove("active");
    }

    function showBlackAI() {
        quickNotesSection.style.display = "none";
        previousNotesSection.style.display = "none";
        blackAISection.style.display = "block";
        quickNotesBtn.classList.remove("active");
        previousNotesBtn.classList.remove("active");
        blackAIBtn.classList.add("active");
    }

    quickNotesBtn.addEventListener("click", showQuickNotes);
    previousNotesBtn.addEventListener("click", showPreviousNotes);
    blackAIBtn.addEventListener("click", showBlackAI);
    saveBtn.addEventListener("click", saveNote);

    aiSuggestBtn.addEventListener("click", async function () {
        console.log("AI Suggestion button clicked.");
        aiSuggestBtn.textContent = "Loading...";

        const userNote = noteInput.innerHTML.trim();
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]) {
                console.error("No active tab found.");
                aiSuggestBtn.textContent = "Get AI Suggestion";
                noteInput.innerHTML = "Error: Could not access the current tab.";
                return;
            }

            chrome.tabs.sendMessage(tabs[0].id, { action: "getPageInfo" }, async (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error getting page info:", chrome.runtime.lastError.message);
                    response = { title: "Unknown", url: "Unknown", selectedText: "None" };
                }
                console.log("Page info:", response);

                const isContextEmpty = response.title === "Unknown" && response.url === "Unknown" && response.selectedText === "None";
                let prompt;

                if (userNote) {
                    if (isContextEmpty) {
                        prompt = `Enhance the following note by improving its clarity, adding relevant details, or rephrasing it for better understanding:\n- User's Note: ${userNote}\nNote: No page context is available, so provide a general enhancement.`;
                    } else {
                        prompt = `Enhance the following note by improving its clarity, adding relevant details, or rephrasing it for better understanding. Use the page context to add relevant information if applicable:\n- User's Note: ${userNote}\n- Page Context:\n  - Page Title: ${response.title}\n  - URL: ${response.url}\n  - Selected Text: ${response.selectedText}`;
                    }
                } else {
                    if (isContextEmpty) {
                        prompt = `Suggest a general note idea for taking notes on a web page, since no specific page context is available.`;
                    } else {
                        prompt = `Suggest a note idea based on the following page context:\n- Page Title: ${response.title}\n- URL: ${response.url}\n- Selected Text: ${response.selectedText}`;
                    }
                }
                console.log("Prompt:", prompt);

                const aiSuggestion = await fetchAIResponse(prompt);
                console.log("Raw AI suggestion:", aiSuggestion);

                const formattedSuggestion = formatAIResponse(aiSuggestion);
                console.log("Formatted suggestion:", formattedSuggestion);

                aiSuggestBtn.textContent = "Get AI Suggestion";
                noteInput.innerHTML = formattedSuggestion;
            });
        });
    });

    initializeChat();
    showQuickNotes();
    displayNotes();
});