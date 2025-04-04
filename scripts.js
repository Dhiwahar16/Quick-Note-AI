// script.js (Updated with Copy to Clipboard)

// API Key (replace with secure storage in production)
const API_KEY = "AIzaSyAFy1PE-NhZsIslFeRTvQwPN1XcjdQdAF8"; // Ensure this key is valid

async function fetchAIResponse(promptText) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
    const requestData = {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
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
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "AI could not generate a response.";
    } catch (error) {
        console.error("Error fetching AI response:", error);
        return "Error fetching AI response: " + error.message;
    }
}

async function categorizeNote(noteText) {
    const categories = ["#code", "#article", "#research", "#tutorial", "#idea", "#task", "#question"];
    const categorizePrompt = `
    Analyze the following note content and determine the most appropriate category.
    Choose ONLY ONE category from this exact list: ${categories.join(", ")}
    If unsure, choose the most likely match.
    Return ONLY the category tag with no explanation or additional text.
    NOTE CONTENT:
    ${noteText}`;
    try {
        const categoryResult = await fetchAIResponse(categorizePrompt);
        return categories.find(cat => categoryResult.toLowerCase().includes(cat.toLowerCase())) || "#other";
    } catch (error) {
        console.error("Error categorizing note:", error);
        return "#other";
    }
}

function saveNote() {
    const noteInput = document.getElementById("noteInput");
    const noteText = noteInput.innerHTML.trim();
    if (!noteText || noteText === '<br>') return;
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const category = await categorizeNote(noteText);
        let notes = JSON.parse(localStorage.getItem("notes")) || [];
        notes.push({
            text: noteText,
            url: tabs[0].url,
            urlname: tabs[0].title,
            category: category,
            timestamp: Date.now()
        });
        localStorage.setItem("notes", JSON.stringify(notes));
        displayNotes();
        noteInput.innerHTML = '';
        noteInput.setAttribute('data-placeholder', `Note saved with ${category} tag! Type another...`);
        setTimeout(() => noteInput.setAttribute('data-placeholder', "Type your note..."), 2000);
    });
}

function displayNotes() {
    const noteList = document.getElementById("noteList");
    const notes = JSON.parse(localStorage.getItem("notes")) || [];
    noteList.innerHTML = '';

    const filterDiv = document.createElement("div");
    filterDiv.classList.add("category-filter");
    filterDiv.innerHTML = `
        <span>Filter by: </span>
        <select id="categoryFilter">
            <option value="all">All Notes</option>
            <option value="#code">#code</option>
            <option value="#article">#article</option>
            <option value="#research">#research</option>
            <option value="#tutorial">#tutorial</option>
            <option value="#idea">#idea</option>
            <option value="#task">#task</option>
            <option value="#question">#question</option>
            <option value="#other">#other</option>
        </select>
    `;
    noteList.appendChild(filterDiv);

    setTimeout(() => {
        const categoryFilter = document.getElementById("categoryFilter");
        if (categoryFilter) {
            categoryFilter.addEventListener("change", function() {
                displayFilteredNotes(this.value);
            });
        }
    }, 0);

    displayFilteredNotes("all");
}

function displayFilteredNotes(filterCategory) {
    const noteList = document.getElementById("noteList");
    const notes = JSON.parse(localStorage.getItem("notes")) || [];
    const filterDiv = noteList.querySelector(".category-filter");
    noteList.innerHTML = '';
    if (filterDiv) noteList.appendChild(filterDiv);

    const filteredNotes = filterCategory === "all" ? notes : notes.filter(note => note.category === filterCategory);
    filteredNotes.slice().reverse().forEach((note, index) => {
        const li = document.createElement("li");

        const categoryTag = document.createElement("span");
        categoryTag.textContent = note.category || "#other";
        categoryTag.classList.add("category-tag", getCategoryColorClass(note.category));

        const noteText = document.createElement("p");
        noteText.innerHTML = note.text;

        const noteUrl = document.createElement("small");
        noteUrl.innerHTML = `<a href="${note.url}" target="_blank">${note.urlname}</a>`;

        const noteTimestamp = document.createElement("small");
        noteTimestamp.classList.add("timestamp");
        noteTimestamp.textContent = formatTimestamp(note.timestamp);

        const buttonContainer = document.createElement("div");
        buttonContainer.classList.add("button-container");

        const deleteBtn = document.createElement("button");
        deleteBtn.innerHTML = `<img src="assets/delete.jpg" alt="Delete" style="width: 20px; height: 20px;">`;
        deleteBtn.classList.add("delete-btn");
        deleteBtn.addEventListener("click", () => deleteNote(notes.length - 1 - index));

        const copyBtn = document.createElement("button");
        copyBtn.innerHTML = `<img src="assets/copy.png" alt="Copy" style="width: 20px; height: 20px;">`; // Ensure copy.png exists
        copyBtn.classList.add("copy-btn");
        copyBtn.addEventListener("click", () => copyNoteToClipboard(note.text));

        buttonContainer.appendChild(copyBtn);
        buttonContainer.appendChild(deleteBtn);

        const noteHeader = document.createElement("div");
        noteHeader.classList.add("note-header");
        noteHeader.appendChild(categoryTag);
        noteHeader.appendChild(noteTimestamp);

        li.appendChild(noteHeader);
        li.appendChild(noteUrl);
        li.appendChild(noteText);
        li.appendChild(buttonContainer);

        noteList.appendChild(li);
    });

    if (filteredNotes.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.classList.add("empty-notes-message");
        emptyMessage.textContent = filterCategory === "all" ? "No notes saved yet." : `No notes with ${filterCategory} category.`;
        noteList.appendChild(emptyMessage);
    }
}

function formatTimestamp(timestamp) {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getCategoryColorClass(category) {
    const categoryColors = {
        "#code": "category-code",
        "#article": "category-article",
        "#research": "category-research",
        "#tutorial": "category-tutorial",
        "#idea": "category-idea",
        "#task": "category-task",
        "#question": "category-question",
        "#other": "category-other"
    };
    return categoryColors[category] || "category-other";
}

function deleteNote(index) {
    let notes = JSON.parse(localStorage.getItem("notes")) || [];
    notes.splice(index, 1);
    localStorage.setItem("notes", JSON.stringify(notes));
    displayNotes();
}

function copyNoteToClipboard(noteText) {
    const plainText = noteText.replace(/<[^>]+>/g, "").replace(/<br>/gi, "\n");
    navigator.clipboard.writeText(plainText)
        .then(() => {

        })
        .catch(err => {
            console.error("Failed to copy note:", err);
            alert("Failed to copy note. Please try again.");
        });
}

async function initializeChat() {
    const pageData = await getPageContent();
    const pageContent = pageData.content;
    const pageUrl = pageData.url;
    loadChatHistory();
    updateChat("Black AI: ", "Hi, how can I help you?");
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

const input = document.getElementById('user-text');
const button = document.getElementById('send-btn');
const inputNotes = document.getElementById('noteInput');
const saveBtn = document.getElementById('saveBtn');

input.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        button.click();
    }
});

inputNotes.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent default newline in contenteditable
        saveBtn.click();
    }
});

document.addEventListener('keydown', function (event) {
    if (event.key) {
        input.focus();
        inputNotes.focus();
    }
})


function updateChat(sender, message) {
    const chatBox = document.getElementById("chat-box");
    const messageP = document.createElement("p");
    const formattedMessage = formatAIResponse(message);
    messageP.innerHTML = `<span><strong>${sender}</strong> ${formattedMessage}</span>`;
    if (sender === "Black AI: ") messageP.classList.add("ai-message");
    else if (sender === "You: ") messageP.classList.add("user-message");
    chatBox.appendChild(messageP);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function loadChatHistory() {
    chrome.storage.local.get(["chatHistory"], (result) => {
        (result.chatHistory || []).forEach(entry => updateChat(entry.sender, entry.message));
    });
}

function saveChatHistory(sender, message) {
    const chatEntry = { sender, message, timestamp: Date.now() };
    chrome.storage.local.get(["chatHistory"], (result) => {
        let chatHistory = result.chatHistory || [];
        chatHistory.push(chatEntry);
        chrome.storage.local.set({ chatHistory }, () => console.log("Chat updated chatbox", chatEntry));
    });
}

async function getPageContent() {
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript(
                { target: { tabId: tabs[0].id }, function: () => document.body.innerText },
                (results) => resolve({
                    content: results?.[0]?.result || "Unable to fetch content",
                    url: tabs[0].url || "Unknown URL"
                })
            );
        });
    });
}

function getChatHistoryForAI() {
    return new Promise((resolve) => {
        chrome.storage.local.get(["chatHistory"], (result) => resolve(result.chatHistory || []));
    });
}

async function getResponse(prompt, pageContent, pageUrl) {
    try {
        const chatHistoryForAI = await getChatHistoryForAI();
        let contextForAI = "Previous conversation:\n" + chatHistoryForAI.map(entry => `${entry.sender}:${entry.message}`).join("\n") + "\nNow respond to current question.\n";
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
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: systemInstruction },
                        { text: `${contextForAI}User question: ${prompt}` }
                    ]
                }],
                generationConfig: { temperature: 0.7, topK: 40, topP: 0.95 }
            })
        });
        if (!res.ok) throw new Error(`HTTP error status: ${res.status}`);
        const data = await res.json();
        const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from AI";
        const followUpPrompt = `
        Based on this response: "${aiText}", suggest 2-3 concise follow-up questions the user might ask next. 
        Format the suggestions as a numbered list (e.g., "1. [question]"). 
        Keep them relevant to the response and the webpage domain. Ask questions with 3 or 4 words for user understanding.
        `;
        const followUpRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: followUpPrompt }] }],
                generationConfig: { temperature: 0.9, maxOutputTokens: 100 }
            })
        });
        const followUpData = await followUpRes.json();
        const followUps = followUpData?.candidates?.[0]?.content?.parts?.[0]?.text || "No follow-up suggestions available.";
        return `${aiText}\n\n\n**Suggested Follow-ups:**\n${followUps}`;
    } catch (err) {
        console.error("Error talking to AI:", err);
        return `Something went wrong: ${err.message}`;
    }
}

function clearChat() {
    const chatBoxHistory = document.getElementById("chat-box");
    chatBoxHistory.innerHTML = "";
    chrome.storage.local.remove("chatHistory", () => console.log("Chat history cleared"));
}

function formatAIResponse(rawResponse) {
    const cleanedResponse = rawResponse.replace(/\*\*/g, '').trim();
    const lines = cleanedResponse.split('\n').filter(line => line.trim() !== '');
    let formatted = '';
    let inCodeBlock = false;
    let inList = false;
    let listCounter = 1;
    lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('```')) {
            if (inCodeBlock) { formatted += '</code></pre>'; inCodeBlock = false; }
            else { formatted += '<pre><code>'; inCodeBlock = true; }
            return;
        }
        if (inCodeBlock) { formatted += `${line}\n`; return; }
        if (trimmedLine.match(/^\d+\.\s/) || trimmedLine.startsWith('* ')) {
            if (!inList) { formatted += '<br>'; inList = true; }
            const listContent = trimmedLine.replace(/^\d+\.\s|\*\s/, '');
            formatted += `${listCounter++}. ${listContent}<br>`;
            return;
        } else if (inList) { inList = false; listCounter = 1; }
        if (trimmedLine.includes('Note:') || trimmedLine.includes('Title:')) {
            const parts = trimmedLine.split(':');
            formatted += `<b>${parts[0]}:</b> ${parts.slice(1).join(':').trim()}<br><br>`;
            return;
        }
        formatted += `${trimmedLine}<br>`;
    });
    if (inCodeBlock) formatted += '</code></pre>';
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

    aiSuggestBtn.addEventListener("click", async () => {
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