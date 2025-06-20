# Pleasant Cove Design - Squarespace Widget Integration Guide

## Overview
This guide explains how to integrate the Pleasant Cove Design messaging widget into your Squarespace member areas to provide private, secure messaging for each logged-in member.

## How It Works

1. **Member Detection**: The widget automatically detects logged-in Squarespace members
2. **Individual Conversations**: Each member gets their own private conversation thread
3. **Real-time Messaging**: Messages appear instantly in both the widget and admin dashboard
4. **File Uploads**: Members can share files and images
5. **Message History**: All conversations are saved and accessible

## Installation Steps

### Step 1: Add the Widget to Your Member Page

1. Go to your Squarespace member-only page
2. Add a **Code Block** where you want the messaging widget
3. Paste this code:

```html
<!-- Pleasant Cove Design Messaging Widget -->
<div id="pcd-widget-container" style="width: 100%; height: 600px;">
    <iframe 
        id="pcd-messaging-widget"
        src="https://pleasantcovedesign-production.up.railway.app/squarespace-widgets/messaging-widget-unified.html"
        style="width: 100%; height: 100%; border: none; border-radius: 8px;"
        allow="clipboard-write"
    ></iframe>
</div>

<script>
// Detect Squarespace member and initialize widget
(function() {
    // Function to get Squarespace member info
    function getSquarespaceMember() {
        // Method 1: Check window.Static.SQUARESPACE_CONTEXT
        if (window.Static && window.Static.SQUARESPACE_CONTEXT) {
            const ctx = window.Static.SQUARESPACE_CONTEXT;
            if (ctx.authenticatedAccount) {
                return {
                    email: ctx.authenticatedAccount.email,
                    name: ctx.authenticatedAccount.displayName || ctx.authenticatedAccount.firstName + ' ' + ctx.authenticatedAccount.lastName,
                    id: ctx.authenticatedAccount.id
                };
            }
        }
        
        // Method 2: Check for member cookies
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'crumb' && value) {
                // Member is logged in but we need to get their info another way
                // You may need to make an API call to get member details
                return null; // Will trigger pre-chat form
            }
        }
        
        return null;
    }
    
    // Wait for widget to load
    const widget = document.getElementById('pcd-messaging-widget');
    
    widget.addEventListener('load', function() {
        console.log('PCD Widget loaded, checking for member...');
        
        const member = getSquarespaceMember();
        
        if (member) {
            console.log('Member detected:', member.name);
            // Send member info to widget
            widget.contentWindow.postMessage({
                type: 'PCD_MEMBER_INFO',
                member: member
            }, '*');
        } else {
            console.log('No member detected - widget will show pre-chat form');
        }
    });
    
    // Listen for widget ready signal
    window.addEventListener('message', function(event) {
        if (event.data.type === 'PCD_WIDGET_READY') {
            console.log('Widget is ready');
            // Re-send member info if available
            const member = getSquarespaceMember();
            if (member) {
                event.source.postMessage({
                    type: 'PCD_MEMBER_INFO',
                    member: member
                }, '*');
            }
        }
    });
})();
</script>
```

### Step 2: Alternative - Direct Initialization (Recommended)

If you know your members' information, you can initialize the widget directly:

```html
<!-- Pleasant Cove Design Messaging Widget - Direct Init -->
<div id="pcd-widget-container" style="width: 100%; height: 600px;">
    <div id="pcd-messaging-root"></div>
</div>

<script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
<script>
// Initialize widget with known member info
(function() {
    // Get member info from your Squarespace context
    const memberEmail = "{{customer.email}}"; // Squarespace variable
    const memberName = "{{customer.name}}"; // Squarespace variable
    
    // Create messaging widget
    class PCDMessaging {
        constructor(config) {
            this.projectToken = null;
            this.userEmail = config.email;
            this.userName = config.name;
            this.socket = null;
            this.messages = [];
            this.backendUrl = 'https://pleasantcovedesign-production.up.railway.app';
            
            this.init();
        }
        
        async init() {
            // Get or create conversation token
            const response = await fetch(`${this.backendUrl}/api/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'member',
                    email: this.userEmail,
                    name: this.userName
                })
            });
            
            const data = await response.json();
            this.projectToken = data.token;
            
            // Initialize UI and WebSocket
            this.createUI();
            this.connectWebSocket();
            this.loadMessages();
        }
        
        createUI() {
            const root = document.getElementById('pcd-messaging-root');
            root.innerHTML = `
                <div style="display: flex; flex-direction: column; height: 100%; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                        <h3 style="margin: 0;">Messages with Pleasant Cove Design</h3>
                    </div>
                    <div id="pcd-messages" style="flex: 1; overflow-y: auto; padding: 20px;"></div>
                    <div style="padding: 20px; border-top: 1px solid #eee;">
                        <form id="pcd-message-form" style="display: flex; gap: 10px;">
                            <input type="text" id="pcd-message-input" placeholder="Type your message..." style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                            <button type="submit" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">Send</button>
                        </form>
                    </div>
                </div>
            `;
            
            // Bind events
            document.getElementById('pcd-message-form').addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendMessage();
            });
        }
        
        connectWebSocket() {
            this.socket = io(this.backendUrl);
            
            this.socket.on('connect', () => {
                console.log('Connected to PCD messaging');
                this.socket.emit('join', this.projectToken);
            });
            
            this.socket.on('newMessage', (message) => {
                this.addMessage(message);
            });
        }
        
        async loadMessages() {
            const response = await fetch(`${this.backendUrl}/api/public/project/${this.projectToken}/messages`);
            const data = await response.json();
            this.messages = data.messages || data;
            this.renderMessages();
        }
        
        async sendMessage() {
            const input = document.getElementById('pcd-message-input');
            const content = input.value.trim();
            if (!content) return;
            
            const response = await fetch(`${this.backendUrl}/api/public/project/${this.projectToken}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    senderName: this.userName,
                    senderType: 'client'
                })
            });
            
            if (response.ok) {
                input.value = '';
            }
        }
        
        addMessage(message) {
            this.messages.push(message);
            this.renderMessages();
        }
        
        renderMessages() {
            const container = document.getElementById('pcd-messages');
            container.innerHTML = this.messages.map(msg => `
                <div style="margin-bottom: 10px; ${msg.senderType === 'client' ? 'text-align: right;' : ''}">
                    <div style="display: inline-block; max-width: 70%; padding: 10px; background: ${msg.senderType === 'client' ? '#667eea' : '#f0f0f0'}; color: ${msg.senderType === 'client' ? 'white' : 'black'}; border-radius: 8px;">
                        <strong>${msg.senderName}</strong><br>
                        ${msg.content}
                    </div>
                </div>
            `).join('');
            container.scrollTop = container.scrollHeight;
        }
    }
    
    // Initialize widget
    if (memberEmail && memberEmail !== '{{customer.email}}') {
        new PCDMessaging({
            email: memberEmail,
            name: memberName
        });
    } else {
        // Fallback to iframe version
        document.getElementById('pcd-messaging-root').innerHTML = `
            <iframe 
                src="https://pleasantcovedesign-production.up.railway.app/squarespace-widgets/messaging-widget-unified.html"
                style="width: 100%; height: 100%; border: none;"
            ></iframe>
        `;
    }
})();
</script>
```

## Testing Your Integration

1. **Test as a Member**: Log in as a member and check if the widget detects you
2. **Test Messages**: Send a test message and verify it appears in the admin dashboard
3. **Test File Uploads**: Try uploading an image or document
4. **Test Multiple Members**: Log in as different members to verify separate conversations

## Troubleshooting

### Widget Shows "Waiting for Authentication"
- The widget isn't detecting the member properly
- Check browser console for errors
- Verify the member detection code is working

### Messages Not Appearing
- Check if the backend is running: https://pleasantcovedesign-production.up.railway.app/health
- Verify WebSocket connection in browser dev tools
- Check for CORS errors in console

### File Uploads Failing
- Maximum file size is 10MB
- Supported formats: images, PDFs, documents
- Check browser console for specific errors

## Security Notes

- Each member's conversation is private and isolated
- Messages are encrypted in transit
- Project tokens are unique per conversation
- Admin access is required to view all conversations

## Support

For assistance with integration:
- Email: support@pleasantcovedesign.com
- Documentation: https://github.com/pleasantcovedesign/docs
- Admin Dashboard: https://pleasantcovedesign-production.up.railway.app 