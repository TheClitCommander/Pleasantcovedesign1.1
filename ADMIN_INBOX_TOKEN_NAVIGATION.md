# Admin Inbox Token Navigation Guide

## 🚨 The Problem
Your widget is working perfectly and sending messages, but the Admin UI appears blank because it's not viewing the correct project token.

## ✅ Quick Solution

### Step 1: Find Your Project Token
Open your widget test page and run this in DevTools Console:
```javascript
localStorage.getItem('pcd_project_token')
```

Example output: `mc516tr5_CSU4OUADdSIHB3AXxZPpbw`

### Step 2: Navigate to Correct Admin URL
Replace the token in this URL:
```
http://localhost:5173/inbox/YOUR_TOKEN_HERE
```

Example:
```
http://localhost:5173/inbox/mc516tr5_CSU4OUADdSIHB3AXxZPpbw
```

## 🛠️ Helper Tools

### 1. Quick Navigation Page
Open `test-quick-navigation.html` in your browser:
```bash
# If using the same server as your widget test
http://localhost:8080/test-quick-navigation.html
```

This page will:
- Automatically detect tokens in localStorage
- Let you paste a token and navigate directly
- Show you the correct URL format

### 2. In-App Project Helper
In the Admin UI, click the **"Projects"** button in the inbox header to:
- See all available conversations and their tokens
- Navigate between different project conversations
- View current URL token vs selected conversation token

## 📋 Understanding the Flow

1. **Widget Creates Project** → Generates token like `mc516tr5_CSU4OUADdSIHB3AXxZPpbw`
2. **Messages Sent to Project** → Backend stores messages under this token
3. **Admin UI Must Match** → URL must include the same token to view messages

## 🔍 Debugging Tips

### Check if Messages Exist
In your backend logs, look for:
```
📤 [SEND] Sent text message
✅ Message created with attachments
```

### Verify Socket Connection
In Admin UI DevTools, you should see:
```
✅ [WEBSOCKET] Connected with ID: xxxxx
🏠 [WEBSOCKET] Joining universal admin room...
```

### Common Issues

1. **Wrong URL Format**
   - ❌ `http://localhost:5173/business/1/inbox`
   - ✅ `http://localhost:5173/inbox/mc516tr5_CSU4OUADdSIHB3AXxZPpbw`

2. **Token Mismatch**
   - Widget token: `mc516tr5_CSU4OUADdSIHB3AXxZPpbw`
   - Admin viewing: Different or no token
   - Solution: Use the exact token from the widget

3. **Multiple Projects**
   - Each member/test creates a new project
   - Use the Project Helper to switch between them

## 🚀 Long-Term Improvements

The system now supports:
- Dynamic token-based routing (`/inbox/:projectToken`)
- Auto-selection of conversations based on URL token
- Project navigation helper for easy switching
- Real-time synchronization between widget and admin

## 📝 Testing Workflow

1. Open widget test page
2. Send a test message
3. Get the project token from localStorage
4. Navigate to `http://localhost:5173/inbox/[TOKEN]`
5. See your messages appear in real-time!

## 🎯 Next Steps

To make this even smoother, consider:
- Adding a project search/filter in the admin UI
- Creating a dashboard that shows all active projects
- Adding deep links from notification emails
- Implementing a "Copy Admin Link" button in the widget (dev mode) 