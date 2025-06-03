# 🚀 Pleasant Cove Design - Start Guide

## ✅ **Quick Start (Reliable Launcher)**

### **1. Start Development Environment**
```bash
npm run dev
```

This command will:
- ✅ Clean up any existing processes
- ✅ Start the backend server (port 5174)
- ✅ Start the frontend app (port 5173) 
- ✅ Set up proxy for API calls

### **2. Access Your Application**

**🎯 Main Application (Your Dashboard):**
```
http://localhost:5173
```

**⚙️ Backend API (For testing/webhooks):**
```
http://localhost:5174
```

---

## 📱 **What You'll See**

### **Tab Navigation**
- **Dashboard** - Overview with stats, appointments, leads
- **Leads** - Manage all your business leads
- **Progress** - Track project progress
- **Appointments** - Calendar with Squarespace bookings
- **Settings** - Configuration

### **Appointment Scheduling**
- **Available slots**: 8:30 AM & 9:00 AM daily (25 min each)
- **7 days a week**, all year round
- **Squarespace integration** ready

---

## 🔧 **Troubleshooting**

### **Port Conflicts?**
```bash
npm run clean
npm run dev
```

### **Still Having Issues?**
```bash
# Kill all processes manually
pkill -f "node.*5173"
pkill -f "node.*5174" 
pkill -f "vite"
pkill -f "tsx"

# Wait a moment, then start
sleep 2
npm run dev
```

### **Check Services Running**
```bash
lsof -i :5173 -i :5174
```
Should show both ports active.

---

## 🎯 **URLs Quick Reference**

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | `http://localhost:5173` | Your main dashboard |
| **Backend** | `http://localhost:5174` | API & webhooks |
| **Health** | `http://localhost:5174/health` | Server status |
| **Leads API** | `http://localhost:5174/api/businesses?token=pleasantcove2024admin` | Raw data |

---

## 📋 **Development Workflow**

1. **Start**: `npm run dev`
2. **Access**: Go to `http://localhost:5173`
3. **Test Squarespace**: Send webhooks to `http://localhost:5174/api/new-lead`
4. **Stop**: `Ctrl+C` in terminal

**✅ Your reliable launcher is now fixed!** 🎉 