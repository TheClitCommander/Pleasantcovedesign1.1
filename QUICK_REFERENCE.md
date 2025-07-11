# Pleasant Cove Design - Quick Reference

## 🔴 CRITICAL FIX APPLIED (Jan 2025)
**PROBLEM SOLVED**: Messages were disappearing after server restart!
- **Root Cause**: In-memory database wasn't saving messages to disk
- **Fix Applied**: Added `this.saveToDisk()` to message inserts in `server/db.ts`
- **Result**: Messages now persist in `data/database.json`
- **Test It**: http://localhost:8080/test-persistence

## ✅ SYSTEM STATUS: WORKING!
Based on your logs, the messaging system IS working correctly:
- Database shows 152 messages (up from 139) - messages ARE being saved
- Widget receives `newMessage` events via WebSocket
- Admin UI shows messages in real-time

## 🎯 WHY YOU THINK IT'S NOT WORKING
**You're looking at different conversations!**
- Widget is showing Ben's conversation (mc410tla_OZWbLvupcw1x8CHnSqGwtw)
- Admin UI might be showing Garth's conversation (mc516tr5_CSU4OUADdSIHB3AXxZPpbw)
- Messages sent in one conversation won't appear in the other!

## 🚀 TESTING THE MESSAGING SYSTEM

### Start Everything:
```bash
# Terminal 1 - Start backend
npm start

# Terminal 2 - Start static server
npx serve . -p 8080

# Terminal 3 - Start admin UI
npm run dev
```

### Test the System:
1. **Open Widget Test Page**: http://localhost:8080/test-instrumented-widget
2. **Check the token in console** (look for "projectToken: mc...")
3. **Open Admin UI with SAME TOKEN**: http://localhost:5173/inbox/[TOKEN-FROM-STEP-2]

### Diagnostic Tools:
- **Socket.IO Diagnostic**: http://localhost:8080/test-socket-diagnostic
- **Real Endpoints Test**: http://localhost:8080/test-real-endpoints
- **Session Persistence**: http://localhost:8080/test-session-persistence
- **Widget Debug Test**: http://localhost:8080/test-widget-debug

### Common Tokens:
- Ben Dickinson: `mc410tla_OZWbLvupcw1x8CHnSqGwtw`
- Garth: `mc516tr5_CSU4OUADdSIHB3AXxZPpbw`

### IMPORTANT: The widget and admin MUST use the SAME TOKEN to see each other's messages!

---

# 🎯 QUICK REFERENCE - FINAL WORKING SYSTEM

## 🚨 **EMERGENCY RECOVERY**
```bash
./EMERGENCY_RECOVERY.sh
```

## 📁 **CRITICAL FILES**
- **Final Widget**: `squarespace-widgets/ULTIMATE-FINAL-WORKING-messaging-widget-unified.html`
- **Current Widget**: `squarespace-widgets/messaging-widget-unified.html`
- **Server Logic**: `server/routes.ts`
- **Database**: `data/database.json`

## 🔧 **START SYSTEM**
```bash
npm run dev
```
- **Admin UI**: http://localhost:5173
- **Server**: http://localhost:3000
- **Widget**: Embed in Squarespace page

## ✅ **WHAT WORKS**
- ✅ Private member conversations
- ✅ Real-time messaging (both directions)
- ✅ File sharing (images + documents)
- ✅ Member authentication
- ✅ Conversation resumption
- ✅ Admin UI integration

## 🔍 **TESTING CHECKLIST**
1. Send text message from widget → Check admin UI
2. Send text message from admin UI → Check widget
3. Send file from widget → Check admin UI
4. Send file from admin UI → Check widget
5. Switch member accounts → Verify separate conversations

## 🚨 **IF SOMETHING BREAKS**
1. **Run recovery script**: `./EMERGENCY_RECOVERY.sh`
2. **Check git status**: `git status`
3. **See commit history**: `git log --oneline -5`
4. **Reset to working state**: `git reset --hard c247c27`

## 📖 **FULL DOCUMENTATION**
- `FINAL_PRODUCTION_READY_SYSTEM_STATUS.md`

## 🎊 **COMMIT HASH**
- **Final Working State**: `c247c27`
- **Branch**: `private-member-messaging-working` 