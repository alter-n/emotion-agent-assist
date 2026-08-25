const API_URL = 'https://emotion-agent-assist.onrender.com/api/analyze';

// DOM Elements
const customerInput = document.getElementById('customer-input');
const sendBtn = document.getElementById('send-btn');
const customerChatWindow = document.getElementById('customer-chat-window');
const agentChatWindow = document.getElementById('agent-chat-window');
const assistContent = document.getElementById('assist-content');
const statusIndicator = document.getElementById('status-indicator');

// New DOM Elements for expansion
const agentInput = document.getElementById('agent-input');
const agentSendBtn = document.getElementById('agent-send-btn');
const tempValue = document.getElementById('temp-value');
const tempBar = document.getElementById('temp-bar');

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

// --- STATE ---
let chatTemperature = 100;
let isEscalated = false;

// Triggers
const escalationKeywords = ['sue', 'lawyer', 'legal', 'media', 'news', 'twitter', 'manager', 'supervisor', 'police', 'court'];

// Event Listeners
sendBtn.addEventListener('click', handleSendMessage);
customerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
});

agentSendBtn.addEventListener('click', handleAgentMessage);
agentInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleAgentMessage();
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

    // Check for hard escalation triggers first
    const lowerText = text.toLowerCase();
    const triggeredWord = escalationKeywords.find(word => lowerText.includes(word));
    if (triggeredWord) {
        triggerEscalation(`Customer used escalation keyword: "${triggeredWord.toUpperCase()}"`);
        return; // Skip normal AI if escalated
    }

    if (isEscalated) return;

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
        
        if (data.debug) {
            updateDebugPanel(data.debug, 'customer');
        }
        
        // 4. Update Temperature and Assist Module
        updateTemperature(data.emotion);
        if (!isEscalated) {
            updateAssistModule(data);
        }
    } catch (error) {
        console.error('Failed to analyze emotion:', error);
        showAssistError();
    }
}

async function handleAgentMessage() {
    const text = agentInput.value.trim();
    if (!text) return;

    // Add agent message
    appendMessage(text, 'agent', customerChatWindow);
    appendMessage(text, 'agent', agentChatWindow);
    agentInput.value = '';

    if (isEscalated) return;
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const data = await response.json();
        
        if (data.debug) {
            updateDebugPanel(data.debug, 'agent');
        }
        
        const emotion = data.emotion;
        
        // Quick keyword trap for passive-aggressiveness that the emotion model might miss (classifying as neutral)
        const badAgentKeywords = ['joke', 'passive', 'not changing', 'deal with it', 'your problem', 'obviously', 'whatever'];
        const isPassiveAggressive = badAgentKeywords.some(word => text.toLowerCase().includes(word));
        
        if (['anger', 'disgust', 'sadness'].includes(emotion) || isPassiveAggressive) {
            // Negative agent tone
            chatTemperature -= 20; // Heavy penalty
            chatTemperature = Math.max(0, chatTemperature);
            updateTemperatureUI();
            
            // Show Agent Warning
            statusIndicator.className = 'status-indicator active';
            statusIndicator.style.backgroundColor = 'var(--surprise)';
            
            const detectedReason = isPassiveAggressive ? "PASSIVE-AGGRESSIVE" : emotion.toUpperCase();
            
            assistContent.innerHTML = `
                <div class="emotion-card" style="border-left: 4px solid var(--surprise); background: rgba(245, 158, 11, 0.1);">
                    <div class="emotion-badge" style="background: var(--surprise); color: #fff;">
                        <span class="material-symbols-outlined" style="font-size: 1.1rem;">warning</span>
                        AGENT TONE WARNING
                    </div>
                    <p class="suggestion-text">
                        <strong>Detected: ${detectedReason}</strong><br><br>
                        Your tone appears negative or dismissive and is escalating the situation. Please maintain professionalism.
                    </p>
                </div>
            `;
            
            if (chatTemperature <= 30) {
                triggerEscalation("Agent's negative tone dropped chat health below critical threshold.");
            }
            
        } else if (emotion === 'joy') {
            // Only genuinely positive agent tone heals the chat
            chatTemperature = Math.min(100, chatTemperature + 15);
            updateTemperatureUI();
        } else {
            // Neutral/Surprise/Fear -> do nothing to the health bar
            // (A blunt/neutral response doesn't heal a frustrated customer)
        }
        
    } catch (error) {
        console.error('Failed to analyze agent emotion:', error);
    }
}

function updateTemperature(emotion) {
    if (isEscalated) return;

    let drop = 0;
    switch (emotion) {
        case 'anger': drop = 20; break;
        case 'disgust': drop = 15; break;
        case 'sadness': drop = 10; break;
        case 'fear': drop = 10; break;
        case 'joy': chatTemperature = Math.min(100, chatTemperature + 15); break;
        default: break;
    }

    chatTemperature -= drop;
    chatTemperature = Math.max(0, chatTemperature);
    updateTemperatureUI();

    if (chatTemperature <= 30) {
        triggerEscalation("Chat health dropped below critical 30% threshold due to repeated negative emotions.");
    }
}

function updateTemperatureUI() {
    tempValue.textContent = `${chatTemperature}%`;
    tempBar.style.width = `${chatTemperature}%`;
    
    if (chatTemperature > 70) {
        tempBar.style.backgroundColor = 'var(--joy)';
    } else if (chatTemperature > 30) {
        tempBar.style.backgroundColor = 'var(--surprise)'; // Yellowish
    } else {
        tempBar.style.backgroundColor = 'var(--anger)';
    }
}

function triggerEscalation(reason) {
    isEscalated = true;
    chatTemperature = 0;
    updateTemperatureUI();
    
    // Add pulsing red alert effect to the whole box
    const assistModule = document.querySelector('.agent-assist-module');
    assistModule.classList.add('escalation-alert');
    
    statusIndicator.className = 'status-indicator active';
    statusIndicator.style.backgroundColor = 'var(--anger)';
    
    assistContent.innerHTML = `
        <div class="emotion-card" style="border-left: 4px solid var(--anger); background: rgba(239, 68, 68, 0.1);">
            <div class="emotion-badge" style="background: var(--anger); color: white;">
                <span class="material-symbols-outlined" style="font-size: 1.1rem;">warning</span>
                MANAGER ALERT
            </div>
            <p class="suggestion-text">
                <strong>CRITICAL ESCALATION:</strong> ${escapeHTML(reason)} <br><br>
                A supervisor has been silently notified and is now monitoring this session. Please remain calm and professional.
            </p>
        </div>
    `;
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

// --- DEBUG PANEL LOGIC ---
const debugPanel = document.getElementById('debug-panel');
const debugOutput = document.getElementById('debug-output');
const closeDebugBtn = document.getElementById('close-debug');

document.addEventListener('keydown', (e) => {
    // Ctrl + Shift + D
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        debugPanel.classList.toggle('hidden');
    }
});

if (closeDebugBtn) {
    closeDebugBtn.addEventListener('click', () => {
        debugPanel.classList.add('hidden');
    });
}

function updateDebugPanel(debugData, origin) {
    if (!debugData || !debugOutput) return;
    
    const ts = new Date().toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
    let output = `[${ts}] Request origin: ${origin.toUpperCase()}\n`;
    output += `Latency: ${debugData.latency_ms} ms\n`;
    output += `Mixed Sentiment Override: ${debugData.override_triggered}\n\n`;
    output += `Raw Model Probabilities:\n`;
    
    // Sort scores high to low
    if (debugData.raw_scores) {
        const sortedScores = Object.entries(debugData.raw_scores).sort((a, b) => b[1] - a[1]);
        sortedScores.forEach(([label, score]) => {
            const percentage = (score * 100).toFixed(2);
            output += `  - ${label.padEnd(10, ' ')}: ${percentage}%\n`;
        });
    }
    
    output += `\n-----------------------------------\n\n`;
    
    // Prepend to output if it's not the initial placeholder
    if (debugOutput.textContent.includes('Awaiting API Payload...')) {
        debugOutput.textContent = output;
    } else {
        debugOutput.textContent = output + debugOutput.textContent;
    }
}
