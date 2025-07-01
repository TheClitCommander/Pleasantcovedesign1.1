# Token Synchronization Fix - Widget to Admin UI

## Problem Summary

The messaging widget and admin UI were not properly synchronized because:
1. The admin UI was using a hardcoded route `/business/1/inbox` instead of dynamic token-based routing
2. The widget creates project-specific tokens but the admin UI wasn't using them
3. Both systems joined different Socket.IO rooms, preventing real-time message sync

## Solution Implemented

### 1. **Dynamic Token-Based Routing**
Added new routes to support token-based navigation:
```javascript
// src/App.tsx
<Route path="inbox" element={<Inbox />} />
<Route path="inbox/:projectToken" element={<Inbox />} />
```

### 2. **URL Parameter Support in Inbox**
The Inbox component now reads the project token from the URL:
```javascript
const { projectToken } = useParams<{ projectToken?: string }>()
```

### 3. **Auto-Selection Based on Token**
When conversations load, the system automatically selects the conversation matching the URL token:
```javascript
if (projectToken) {
  conversationToSelect = conversationList.find(c => c.projectToken === projectToken);
}
```

### 4. **Debug Panel**
Added `TokenDebugPanel` component to show:
- URL token vs Widget token comparison
- Current Socket.IO room
- Connection status
- Quick navigation to correct token

## How to Use

### For Testing:

1. **Start the servers:**
   ```bash
   npm run dev
   ```

2. **Open the token sync test page:**
   ```bash
   npx serve . -p 8080
   # Visit http://localhost:8080/test-token-sync.html
   ```

3. **Test the flow:**
   - Widget authenticates and gets token (e.g., `mc410tla_OZWbLvupcw1x8CHnSqGwtw`)
   - Open admin UI with: `http://localhost:5173/inbox/mc410tla_OZWbLvupcw1x8CHnSqGwtw`
   - Messages sent from widget appear instantly in admin UI

### For Production:

1. **Widget Side:**
   - After authentication, widget stores token in `localStorage.setItem('pcd_project_token', token)`
   - Widget joins Socket.IO room with this token

2. **Admin Side:**
   - Access conversations via `/inbox/:projectToken`
   - Admin UI automatically joins the same Socket.IO room
   - Real-time sync works seamlessly

## Key Files Modified

1. **src/App.tsx** - Added dynamic routing
2. **src/pages/Inbox.tsx** - Added URL parameter support and auto-selection
3. **src/components/TokenDebugPanel.tsx** - New debug component
4. **test-token-sync.html** - Test page for verification

## Debugging Tips

### Check Token Mismatch:
1. Open browser console in both widget and admin
2. Look for `pcd_project_token` in localStorage
3. Verify URL matches: `/inbox/{token}`

### Use Debug Panel:
- Shows all tokens in real-time
- Red = mismatch, Green = synchronized
- "Go to Widget Token" button for quick fix

### Socket.IO Rooms:
Both widget and admin must join the same room:
- Widget: `socket.emit('join', projectToken)`
- Admin: Automatically joins based on URL token

## Common Issues & Solutions

**Issue:** Messages don't appear in admin UI
**Solution:** Ensure URL token matches widget token

**Issue:** Admin shows wrong conversation
**Solution:** Use `/inbox/{correct-token}` URL format

**Issue:** Real-time sync not working
**Solution:** Check Socket.IO connection and room joining in console logs

## Next Steps

1. **Automatic Navigation:** Add logic to auto-navigate admin to correct token
2. **Token Persistence:** Store last viewed token for admin convenience
3. **Multi-Tab Support:** Handle multiple admin tabs with different tokens
4. **Production Deployment:** Ensure Railway backend handles dynamic tokens properly 