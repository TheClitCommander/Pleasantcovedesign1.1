# Acuity Backup Sync Setup Guide

## 🎯 **CRITICAL FEATURE: Appointment Recovery System**

Your Pleasant Cove Design CRM now includes a **backup sync system** that prevents lost appointments when your server is down. This system automatically recovers any missed appointments by syncing with Acuity's API.

## 🚨 **Why This Is Important**

**Problem**: If your server is down when someone books through Acuity on Squarespace, the webhook fails and the appointment is **permanently lost**.

**Solution**: The backup sync system periodically checks Acuity for new appointments and automatically adds any that were missed due to server downtime.

## ⚙️ **Setup Instructions**

### **Step 1: Get Acuity API Credentials**

1. **Log into your Acuity Scheduling account**
2. Go to **Settings** > **Integrations** > **API**
3. Click **"Show API Credentials"**
4. Copy your **User ID** and **API Key**

### **Step 2: Configure Environment Variables**

Create a `.env` file in your project root with:

```bash
# Acuity Scheduling API Configuration
ACUITY_USER_ID=your_user_id_from_step_1
ACUITY_API_KEY=your_api_key_from_step_1
```

### **Step 3: Restart Your Server**

```bash
npm run dev
```

You should see:
```
🔄 Initializing Acuity backup sync system...
🔄 Starting continuous Acuity sync every 15 minutes
```

## 🔄 **How It Works**

### **Automatic Sync**
- **Runs every 15 minutes** automatically
- **Checks last 30 days** of appointments from Acuity
- **Deduplicates** - won't create duplicate appointments
- **Creates business records** for new clients
- **Logs all activity** for audit trail

### **Manual Sync Options**
- **Dashboard button**: Trigger sync manually
- **API endpoint**: `POST /api/acuity/sync`
- **Test connection**: `GET /api/acuity/test`

## 🛠️ **API Endpoints**

### **Manual Sync**
```bash
curl -X POST http://localhost:5174/api/acuity/sync?token=pleasantcove2024admin \
  -H "Content-Type: application/json" \
  -d '{
    "minDate": "2024-12-01",
    "maxDate": "2024-12-31"
  }'
```

### **Check Status**
```bash
curl http://localhost:5174/api/acuity/status?token=pleasantcove2024admin
```

### **Test Connection**
```bash
curl http://localhost:5174/api/acuity/test?token=pleasantcove2024admin
```

## 📊 **Dashboard Integration**

The system includes a dashboard interface to:
- ✅ **View sync status** and last sync time
- ✅ **Trigger manual sync** for specific date ranges
- ✅ **Test Acuity connection** 
- ✅ **View sync logs** and recovered appointments
- ✅ **Monitor sync health** and error alerts

## 🔍 **Monitoring & Logs**

### **Console Logs**
```
🔄 Starting Acuity backup sync...
📅 Found 3 appointments in Acuity
⏭️ Appointment 123456 already exists, skipping
🆕 Processing new appointment: John Doe - 2024-12-15T10:00:00Z
✨ Created new business: John Doe
📅 Created appointment 1 for John Doe
✅ Acuity backup sync completed!
📊 Results: 1 recovered, 2 skipped, 0 errors
```

### **Activity Tracking**
All recovered appointments create activity logs:
- **Type**: `appointment_recovered`
- **Description**: Details about the recovered appointment
- **Business ID**: Links to the business record

## 🚨 **Error Handling**

### **Common Issues**

**No Credentials Configured**
```
⚠️ Acuity credentials not configured. Add ACUITY_USER_ID and ACUITY_API_KEY to .env file
```
**Solution**: Add credentials to `.env` file

**API Connection Failed**
```
❌ Failed to fetch Acuity appointments: Acuity API error: 401 Unauthorized
```
**Solution**: Check credentials are correct

**Rate Limiting**
```
❌ Acuity API error: 429 Too Many Requests
```
**Solution**: System will retry automatically, reduce sync frequency if needed

### **Graceful Degradation**
- **No credentials**: System runs without Acuity sync, webhooks still work
- **API unavailable**: System continues, will retry on next cycle
- **Partial failures**: System logs errors but continues processing other appointments

## 📈 **Benefits**

### **Zero Data Loss**
- **Never miss appointments** due to server downtime
- **Automatic recovery** of missed bookings
- **Complete audit trail** of all sync operations

### **Redundancy**
- **Primary**: Webhook integration (real-time)
- **Backup**: API sync (every 15 minutes)
- **Manual**: On-demand sync for specific periods

### **Business Continuity**
- **Server maintenance**: Appointments still captured
- **Outages**: Automatic recovery when back online
- **Data integrity**: Deduplication prevents duplicates

## 🔧 **Advanced Configuration**

### **Custom Sync Interval**
Modify in `server/index.ts`:
```typescript
// Change from 15 minutes to 5 minutes
acuitySync.startContinuousSync(5);
```

### **Date Range Limits**
Default: Last 30 days. Modify in `acuity-backup-sync.ts`:
```typescript
const defaultMinDate = minDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
```

### **Manual Recovery**
For specific date ranges:
```bash
curl -X POST http://localhost:5174/api/acuity/sync?token=pleasantcove2024admin \
  -H "Content-Type: application/json" \
  -d '{
    "minDate": "2024-12-01",
    "maxDate": "2024-12-31"
  }'
```

## ✅ **Setup Checklist**

- [ ] **Get Acuity API credentials** from Settings > Integrations > API
- [ ] **Add credentials** to `.env` file
- [ ] **Restart server** to activate sync
- [ ] **Test connection** via API endpoint
- [ ] **Verify logs** show sync activity
- [ ] **Monitor dashboard** for sync status
- [ ] **Test recovery** by creating appointment in Acuity

## 🎉 **You're Protected!**

With the Acuity backup sync system active, your appointment booking is now **bulletproof**:

1. **Real-time webhooks** capture appointments instantly
2. **Backup sync** recovers any missed appointments
3. **Manual sync** handles any specific recovery needs
4. **Complete monitoring** ensures system health

**Never lose another appointment booking again!** 🚀 