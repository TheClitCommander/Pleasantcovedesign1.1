# Pleasant Cove Design - Current System Status

## 🎯 **ACTIVE SYSTEM (What We're Actually Using)**

### **React Admin UI** - `localhost:5173` ⭐ **PRIMARY INTERFACE**
- **Entry Point:** `src/main.tsx` → `src/App.tsx`
- **Key Pages:**
  - `src/pages/Dashboard.tsx` - Main dashboard
  - `src/pages/ProjectInbox.tsx` - **MESSAGE MANAGEMENT** (where client messages appear)
  - `src/pages/Leads.tsx` - Lead management
  - `src/pages/ClientProfile.tsx` - Individual client details
  - `src/pages/Schedule.tsx` - Appointment scheduling
- **Launcher:** `Pleasant Cove Launcher.command`
- **Status:** ✅ **WORKING** - This is your main business interface

### **Backend API** - `localhost:3000`
- **Main File:** `server/index.ts`
- **Routes:** `server/routes.ts`
- **Key Endpoints:**
  - `POST /api/new-lead` - Creates new client sessions
  - `GET /api/public/project/:token/messages` - Fetches messages
  - `POST /api/public/project/:token/messages` - Sends messages
- **Status:** ✅ **WORKING** - Handles all data and API calls

### **Squarespace Widget** - `squarespace-widgets/messaging-widget-unified.html`
- **Purpose:** Client-facing chat widget embedded on your website
- **Features:** Pre-chat form, real-time messaging, file uploads
- **Status:** 🔧 **NEEDS TESTING** - Recently fixed API endpoints

---

## 🔄 **THE FLOW (How It Should Work)**

```
1. Client visits Squarespace site
2. Fills out pre-chat form in widget
3. Widget calls: POST /api/new-lead → Creates projectToken
4. Client sends messages via widget
5. Messages stored in backend database
6. You see messages in React UI (ProjectInbox page)
7. You reply from React UI
8. Client sees your replies in widget
```

---

## 🧪 **WHAT NEEDS TO BE TESTED**

### **Priority 1: End-to-End Message Flow**
- [ ] Widget creates new session (pre-chat form)
- [ ] Widget sends test message to backend
- [ ] Message appears in React UI ProjectInbox
- [ ] Reply from React UI appears in widget

### **Priority 2: File Attachments**
- [ ] Client uploads file via widget
- [ ] File appears in React UI
- [ ] Admin sends file from React UI
- [ ] File appears in widget

### **Priority 3: Session Persistence**
- [ ] Returning clients see previous messages
- [ ] localStorage token handling works

---

## 📁 **FILES WE'RE NOT USING (Archive These)**

### **Old/Test Widgets:**
- `squarespace-widgets/messaging-widget.html` (older version)
- `squarespace-widgets/websocket-messaging-widget.html`
- `squarespace-widgets/smart-client-portal.html`
- `ENHANCED_CLIENT_ONBOARDING_WIDGET.html`

### **Test Files:**
- `test-*.html` (all test files)
- `portal-session-test.html`
- `session-debug-test.html`
- `quick-test.html`
- `ngrok-test.html`

### **Documentation Files (Keep but not priority):**
- `SQUARESPACE_*.md`
- `BACKEND_*.md`
- `TOKEN_*.md`
- `ZAPIER_*.md`

---

## 🎯 **IMMEDIATE NEXT STEPS**

1. **Test the widget** → backend → React UI flow
2. **Verify ProjectInbox page** shows client messages
3. **Test replying** from React UI to widget
4. **Archive unused files** to `archive/` folder

---

## 🔧 **KEY CONFIGURATION**

### **Widget Backend URL:**
```javascript
// Auto-detects environment in messaging-widget-unified.html
detectBackendUrl() {
  if (hostname.includes('pleasantcovedesign.com')) {
    return 'https://pleasantcovedesign-production.up.railway.app';
  } else {
    return 'http://localhost:3000';
  }
}
```

### **React UI API Calls:**
```typescript
// Should be calling same backend endpoints
GET /api/public/project/:token/messages
POST /api/public/project/:token/messages
```

---

## 🚨 **FOCUS AREAS**

1. **ProjectInbox.tsx** - Make sure it's fetching messages correctly
2. **messaging-widget-unified.html** - The only widget that matters
3. **Backend message endpoints** - Ensure they're working for both directions

**Everything else is noise until this core flow works perfectly.** 