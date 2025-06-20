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