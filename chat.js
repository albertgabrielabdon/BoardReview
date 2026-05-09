
const ChatSystem = {
    lastChatHash: "",
    isSending: false,
    pendingMessage: "",

    renderPage() {
        return `
            <div class="chat-page-container fade-in">
                <div class="chat-header">
                    <h2>Community Chat</h2>
                    <p style="font-size: 0.8rem; color: var(--text-muted);">Talking as: <b>${DB.stats.sync.username}</b></p>
                </div>
                <div id="chat-messages-area" class="chat-messages-area">
                    <div class="chat-loading">Loading messages...</div>
                </div>
                <div class="chat-footer">
                    <input type="text" id="chat-input-full" placeholder="Type a message..." 
                        onkeydown="if(event.key === 'Enter') window.handleChatSend()">
                    <button class="btn btn-primary" onclick="window.handleChatSend()">Send</button>
                </div>
            </div>
        `;
    },

    async fetchMessages() {
        if (this.isSending) return;
        try {
            const res = await fetch(`${CloudSync.API_URL}?action=get_chat&_t=${Date.now()}`);
            const messages = await res.json();

            if (this.pendingMessage) {
                const found = messages.some(m => m.message === this.pendingMessage);
                if (found) {
                    this.pendingMessage = "";
                } else {
                    return; 
                }
            }
            
            const currentHash = JSON.stringify(messages);
            
            if (currentHash !== this.lastChatHash) {
                this.renderMessages(messages);
                this.lastChatHash = currentHash;
            }
        } catch (e) { console.error("Chat pull failed", e); }
    },

    renderMessages(messages) {
        const area = document.getElementById('chat-messages-area');
        if (!area) return;
    
        const currentUser = DB.stats.sync.username;
        
        const newHTML = messages.map(m => {
            const isMe = m.username === currentUser;
            return `
                <div class="chat-bubble ${isMe ? 'me' : 'other'}">
                    <span class="bubble-user">${isMe ? 'You' : m.username}</span>
                    <span class="bubble-text">${this.escapeHTML(m.message)}</span>
                </div>
            `;
        }).join('');
    
        if (area.innerHTML !== newHTML) {
            area.innerHTML = newHTML;
            area.scrollTop = area.scrollHeight;
        }
    },

    async sendMessage(text) {
        if (!text.trim()) return;
        this.isSending = true;
        this.pendingMessage = text;

        const input = document.getElementById('chat-input-full');
        const username = DB.stats.sync.username || "Guest";
        
        if (input) input.value = "";

        const area = document.getElementById('chat-messages-area');
        let tempDiv;
        if (area) {
            tempDiv = document.createElement('div');
            tempDiv.className = "chat-bubble me optimistic";
            tempDiv.style.opacity = "0.6"; 
            tempDiv.innerHTML = `
                <span class="bubble-user">You</span>
                <span class="bubble-text">${this.escapeHTML(text)}</span>
            `;
            area.appendChild(tempDiv);
            area.scrollTop = area.scrollHeight;
        }
    
        // 2. Prepare Payload
        const payload = {
            action: "send_chat",
            username: username,
            message: text
        };
    
        const formBody = new URLSearchParams();
        for (const key in payload) formBody.append(key, payload[key]);
    
        try {
            await fetch(CloudSync.API_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formBody.toString(),
                keepalive: true 
            });

            if (tempDiv) {
                tempDiv.classList.remove('optimistic');
                tempDiv.style.opacity = "1"; 
            }
            setTimeout(() => {
                this.isSending = false;
                this.fetchMessages();
            }, 1000);

        } catch (e) {
            this.isSending = false;
            console.error("Send failed:", e);
            if (tempDiv) {
                tempDiv.style.background = "var(--wrong)";
                tempDiv.style.color = "white";
                tempDiv.innerHTML += " <small>(Failed to sync)</small>";
            }
        }
    },
    escapeHTML(str) {
        const p = document.createElement('p');
        p.textContent = str;
        return p.innerHTML;
    }
};

window.handleChatSend = () => {
    const input = document.getElementById('chat-input-full');
    if (input) ChatSystem.sendMessage(input.value);
};

window.ChatSystem = ChatSystem;
console.log("ChatSystem initialized.");