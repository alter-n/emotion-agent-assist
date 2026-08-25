const API_URL = 'https://emotion-agent-assist.onrender.com/api/analyze';

// DOM Elements
const customerInput = document.getElementById('customer-input');
const sendBtn = document.getElementById('send-btn');
const customerChatWindow = document.getElementById('customer-chat-window');
const agentChatWindow = document.getElementById('agent-chat-window');
const assistContent = document.getElementById('assist-content');
const statusIndicator = document.getElementById('status-indicator');

// Emotion to color map (matching CSS variables)
const emotionColors = {
    anger: 'var(--anger)',
    disgust: 'var(--disgust)',
    fear: 'var(--fear)',
    joy: 'var(--joy)',
    neutral: 'var(--neutral)',
    sadness: 'var(--sadness)',
    surprise: 'var(--surprise)',
    unknown: 'var(--text-secondary)'
};

// Emotion to Icon map
const emotionIcons = {
    anger: 'sentiment_extremely_dissatisfied',
    disgust: 'sick',
    fear: 'sentiment_dissatisfied',
    joy: 'mood',
    neutral: 'sentiment_neutral',
    sadness: 'sentiment_sad',
    surprise: 'sentiment_excited',
    unknown: 'help'
};

// Event Listeners
sendBtn.addEventListener('click', handleSendMessage);
customerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
});

async function handleSendMessage() {
    const text = customerInput.value.trim();
    if (!text) return;

    // 1. Add message to both chat windows (simulating real-time sync)
    appendMessage(text, 'customer', customerChatWindow);
    appendMessage(text, 'customer', agentChatWindow);
    
    // Clear input
    customerInput.value = '';

    // 2. Set AI Assist to loading state
    setAssistLoadingState();

    // 3. Call backend API
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        
        // 4. Update Agent Assist Module
        updateAssistModule(data);
    } catch (error) {
        console.error('Failed to analyze emotion:', error);
        showAssistError();
    }
}

function appendMessage(text, sender, container) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${sender} animate-msg`;
    
    const avatar = sender === 'agent' ? 'A' : 'C';
    
    msgDiv.innerHTML = `
        <div class="avatar">${avatar}</div>
        <div class="message-bubble">${escapeHTML(text)}</div>
    `;
    
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

function setAssistLoadingState() {
    statusIndicator.className = 'status-indicator loading';
    assistContent.innerHTML = `
        <div class="empty-state">
            <span class="material-symbols-outlined empty-icon" style="animation: pulse 1.5s infinite;">psychiatry</span>
            <p>Analyzing customer sentiment...</p>
        </div>
    `;
}

function updateAssistModule(data) {
    const { emotion, score, suggestion } = data;
    const color = emotionColors[emotion] || emotionColors.unknown;
    const icon = emotionIcons[emotion] || emotionIcons.unknown;
    const confidence = (score * 100).toFixed(1);

    statusIndicator.className = 'status-indicator active';
    statusIndicator.style.backgroundColor = color;

    assistContent.innerHTML = `
        <div class="emotion-card" style="border-left: 4px solid ${color};">
            <div class="emotion-badge" style="background: ${color}20; color: ${color};">
                <span class="material-symbols-outlined" style="font-size: 1.1rem;">${icon}</span>
                ${emotion}
                <span class="emotion-score">(${confidence}%)</span>
            </div>
            <p class="suggestion-text">${escapeHTML(suggestion)}</p>
        </div>
    `;
}

function showAssistError() {
    statusIndicator.className = 'status-indicator idle';
    statusIndicator.style.backgroundColor = 'var(--anger)';
    assistContent.innerHTML = `
        <div class="empty-state">
            <span class="material-symbols-outlined empty-icon" style="color: var(--anger);">error</span>
            <p>Failed to connect to the analysis engine. Is the FastAPI backend running?</p>
        </div>
    `;
}

// Utility to prevent XSS
function escapeHTML(str) {
    const p = document.createElement('p');
    p.appendChild(document.createTextNode(str));
    return p.innerHTML;
}
