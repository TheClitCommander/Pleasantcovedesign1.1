# 🧪 Pleasant Cove Design - Testing Checklist

## 🎯 **SYSTEM OVERVIEW**

**Goal:** Squarespace widget → Backend API → React Admin UI (localhost:5173)

**Key Files:**
- ✅ **Widget:** `squarespace-widgets/messaging-widget-unified.html`
- ✅ **React UI:** `src/pages/ProjectInbox.tsx` (FIXED API endpoints)
- ✅ **Backend:** `server/routes.ts` (API endpoints working)

---

## 🔧 **SETUP STEPS**

### 1. Start the System
```bash
# In terminal:
./Pleasant\ Cove\ Launcher.command

# This should start:
# - Backend API on localhost:3000
# - React UI on localhost:5173
```

### 2. Open React Admin UI
- Navigate to: `http://localhost:5173`
- Go to "Project Inbox" page
- Should see list of projects on the left

### 3. Open Widget for Testing
- Open: `squarespace-widgets/messaging-widget-unified.html` in browser
- Should show pre-chat form

---

## ✅ **TESTING CHECKLIST**

### **Phase 1: Basic Connection**
- [ ] React UI loads at localhost:5173
- [ ] ProjectInbox page shows projects list
- [ ] Widget loads and shows pre-chat form
- [ ] Backend API responds to health check: `http://localhost:3000/health`

### **Phase 2: New Session Creation**
- [ ] Fill out widget pre-chat form (name + email)
- [ ] Form submits successfully (no error message)
- [ ] Widget shows messaging interface
- [ ] New project appears in React UI ProjectInbox

### **Phase 3: Client → Admin Messaging**
- [ ] Send test message from widget
- [ ] Message appears in React UI ProjectInbox
- [ ] Message shows correct sender name
- [ ] Timestamp is accurate

### **Phase 4: Admin → Client Messaging**
- [ ] Select project in React UI ProjectInbox
- [ ] Send reply from React UI
- [ ] Reply appears in widget
- [ ] Reply shows as admin message

### **Phase 5: File Attachments**
- [ ] Upload file from widget
- [ ] File appears in React UI
- [ ] File can be downloaded from React UI
- [ ] Send file from React UI
- [ ] File appears in widget

### **Phase 6: Session Persistence**
- [ ] Refresh widget page
- [ ] Previous messages still visible
- [ ] Can continue conversation
- [ ] React UI still shows all messages

---

## 🐛 **TROUBLESHOOTING**

### **Widget Shows "Failed to start conversation"**
- Check backend is running on localhost:3000
- Check `/api/new-lead` endpoint is working
- Check browser console for errors

### **Messages Don't Appear in React UI**
- Check ProjectInbox is using correct API endpoints
- Check project has valid accessToken
- Check browser console for API errors

### **WebSocket Connection Issues**
- Widget should fall back to HTTP polling
- Check "Connected" status in widget header
- Real-time updates may be delayed but should work

### **File Upload Issues**
- Check file size (10MB limit)
- Check file types (images, PDFs, docs allowed)
- Check uploads directory exists and is writable

---

## 🎉 **SUCCESS CRITERIA**

**The system is working when:**
1. ✅ Client can start conversation via widget
2. ✅ Messages flow both directions (client ↔ admin)
3. ✅ Files can be shared both directions
4. ✅ All messages appear in React UI ProjectInbox
5. ✅ Sessions persist across page refreshes

**Once this works, you can:**
- Embed the widget on your Squarespace site
- Manage all client conversations from localhost:5173
- Handle file sharing seamlessly
- Scale to multiple simultaneous conversations

---

## 📝 **NOTES**

- Widget auto-detects environment (localhost vs production)
- React UI uses same backend API as widget
- All data stored in SQLite database
- WebSocket provides real-time updates with HTTP polling fallback 