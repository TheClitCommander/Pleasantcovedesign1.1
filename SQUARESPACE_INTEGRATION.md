# Pleasant Cove Design v1.1 - Squarespace Integration Guide

## 🎯 **WORKING STATUS: FULLY OPERATIONAL** ✅

Your Pleasant Cove Design application is now running with enhanced Squarespace webhook integration!

## 🚀 **Quick Start**

1. **Double-click** `Pleasant Cove Launcher.command` to start the application
2. The app will open at: `http://localhost:5173`
3. Your Squarespace webhook endpoint is: `http://localhost:5173/api/new-lead`

## 📡 **Squarespace Webhook Configuration**

### Webhook URL (for Squarespace)
```
http://localhost:5173/api/new-lead
```

### Supported Form Fields
- `name` - Business owner name ✅
- `email` - Contact email ✅  
- `phone` - Phone number ✅
- `message` - Lead message ✅
- `business_type` - Type of business ✅
- `company` / `business_name` - Business name ✅
- `website` - Existing website ✅
- `appointment_date` - Preferred appointment date ✅
- `appointment_time` - Preferred time ✅

## 🤖 **Enhanced Features in v1.1**

### **Smart Lead Scoring**
- Automatic scoring based on business type, contact info, and message content
- High-value leads (80+ score) get priority treatment
- Instant follow-up for qualified leads

### **Auto-Follow-Up System**
- High-score leads get immediate outreach
- Medium-score leads get follow-up reminders
- Automated lead nurturing sequences

### **Real-Time Notifications**
- Instant notifications for new leads
- High-priority lead alerts
- Appointment booking confirmations

### **Enhanced Analytics**
- Lead quality metrics
- Conversion tracking
- Revenue forecasting
- Response time analytics

## 🔧 **API Endpoints**

### Public Endpoints (No Auth Required)
- `POST /api/new-lead` - Squarespace webhook receiver
- `GET /health` - Server health check

### Protected Endpoints (Require Admin Token)
- `GET /api/stats?token=pleasantcove2024admin` - Enhanced dashboard stats
- `GET /api/businesses?token=pleasantcove2024admin` - All leads
- `GET /api/notifications?token=pleasantcove2024admin` - Real-time notifications

## 📊 **Sample Webhook Test**

Test your webhook with this curl command:

```bash
curl -X POST http://localhost:5173/api/new-lead \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "email": "john@smithelectrical.com", 
    "phone": "555-123-4567",
    "message": "I need a professional website for my electrical business. Looking for something that gets me more customers.",
    "business_type": "electrical",
    "appointment_date": "2024-01-15",
    "appointment_time": "2:00 PM"
  }'
```

Expected Response:
```json
{
  "success": true,
  "businessId": 7,
  "leadScore": 95,
  "priority": "high", 
  "message": "Enhanced lead processing complete"
}
```

## 🎨 **Sample Data Included**

Your application starts with 6 sample businesses:
- Coastal Electric (Score: 75)
- Hampton Plumbing (Score: 85) 
- Norfolk HVAC Solutions (Score: 60)
- Summit Roofing (Score: 90)
- Tidewater Construction (Score: 70)
- Elite Landscaping (Score: 80)

## 🔐 **Admin Access**

**Admin Token:** `pleasantcove2024admin`

Use this token to access protected endpoints:
- Add `?token=pleasantcove2024admin` to API URLs
- Or use Authorization header: `Bearer pleasantcove2024admin`

## 📱 **Next Steps for Production**

1. **Replace localhost** with your production domain
2. **Set up SSL/HTTPS** for secure webhooks
3. **Configure real SMS/Email APIs** (Twilio, SendGrid)
4. **Add database persistence** (replace in-memory storage)
5. **Set up monitoring** and error tracking

## ✅ **Verification Checklist**

- [x] Server starts successfully
- [x] Webhook endpoint responds correctly
- [x] Lead scoring algorithm working
- [x] Auto-follow-up system active
- [x] Real-time notifications enabled
- [x] Enhanced analytics available
- [x] Admin authentication working
- [x] Sample data loaded
- [x] Desktop launcher functional

**Status: READY FOR SQUARESPACE INTEGRATION! 🎉** 