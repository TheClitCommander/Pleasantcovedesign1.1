# Pleasant Cove Design - API Documentation

## ⚠️ **IMPORTANT UPDATE: Zapier Now Optional**

**You have a superior direct webhook system!** Zapier integration is now **optional** for additional automation only.

### **✅ Your Current System (Recommended)**
```
Squarespace Form → /api/new-lead → Auto-creates everything
```

### **🔀 Optional Zapier Enhancement**  
```
Squarespace Form → Zapier → /api/new-lead → Additional automations
```

---

## 🎯 **Direct Integration (Primary Approach)**

### **Webhook URL for Squarespace:**
```
https://yourdomain.com/api/new-lead
```

### **What Happens Automatically:**
1. ✅ Lead scored and prioritized
2. ✅ Project token generated  
3. ✅ Company/project records created
4. ✅ Client portal instantly available
5. ✅ Admin dashboard updated
6. ✅ Activity logging activated

### **Example Response:**
```json
{
  "success": true,
  "businessId": 17,
  "leadScore": 90,
  "priority": "high", 
  "projectToken": "4Ku8OFRWEteXc...",
  "messagingUrl": "/squarespace-widgets/messaging-widget.html?token=...",
  "clientPortalUrl": "/api/public/project/..."
}
```

---

## 🔧 **Optional Zapier Enhancements**

**Only use Zapier if you want additional automation beyond your core system.**

### **🔐 Authentication for Zapier**
**Admin Token:** `pleasantcove2024admin`

Add to requests as:
- **Query Parameter:** `?token=pleasantcove2024admin`
- **Authorization Header:** `Authorization: Bearer pleasantcove2024admin`

### **📡 Base URLs**
- **Development:** `http://localhost:5174`
- **Production:** `https://yourdomain.com`

---

## 🚀 **Primary Endpoints (No Zapier Required)**

### **1. Lead Creation (PUBLIC - No Auth)**
```http
POST /api/new-lead
```

**Direct from Squarespace forms:**
```json
{
  "name": "John Smith",
  "email": "john@business.com", 
  "phone": "555-123-4567",
  "message": "I need a new website",
  "service_type": "website",
  "appointment_date": "2024-12-15",
  "budget": "10k-25k"
}
```

### **2. Client Messaging (PUBLIC - Token Auth)**
```http
GET  /api/public/project/:token/messages
POST /api/public/project/:token/messages
```

**Client sends message:**
```json
{
  "content": "Hi! When can we schedule our consultation?",
  "senderName": "John Smith"
}
```

### **3. Project Data Access (PUBLIC - Token Auth)**
```http
GET /api/public/project/:token
```

Returns complete project information for client portal.

---

## 🔄 **Optional Zapier Workflows**

### **Workflow 1: Lead Notifications**
```
Trigger: New Squarespace submission
Action 1: POST to /api/new-lead  
Action 2: Send SMS via Twilio
Action 3: Post to Slack channel
```

### **Workflow 2: Data Backup**
```
Trigger: New lead in your system
Action 1: Add row to Google Sheets
Action 2: Create Mailchimp contact  
Action 3: Send welcome email
```

### **Workflow 3: Appointment Reminders**
```
Trigger: New appointment scheduled
Action 1: Wait 24 hours
Action 2: Send reminder email
Action 3: Send SMS reminder
```

---

## 📊 **Additional Admin Endpoints (For Zapier)**

### **Search & Lookup**
```http
GET /api/search/businesses?email=client@email.com
GET /api/businesses/by-email/:email
GET /api/activities/recent?since=2024-12-01
```

### **Business Management** 
```http
PATCH /api/businesses/:id/stage
POST  /api/businesses/:id/tags
PATCH /api/businesses/bulk
```

### **Webhook Testing**
```http
POST /api/webhook/test
```

---

## 🎯 **Recommendation: Start Direct, Add Zapier Later**

### **Phase 1: Direct Integration (Complete ✅)**
- Squarespace forms → `/api/new-lead`
- Client portal with messaging
- Admin dashboard management
- Appointment scheduling

### **Phase 2: Optional Zapier Enhancements** 
- SMS notifications
- Google Sheets backup
- Email marketing automation
- Slack/Discord alerts

---

## 💡 **Why Your Direct System is Better**

| Feature | Your Direct System | Zapier Alternative |
|---------|-------------------|-------------------|
| **Speed** | ⚡ Instant | 🐌 15-30 second delays |
| **Cost** | 💰 Free | 💸 $20-100/month |
| **Control** | 🛠 Complete customization | 🔒 Limited templates |
| **Security** | 🔐 Your infrastructure | 🌐 External access required |
| **Reliability** | 🎯 Direct connection | 🔄 Multi-hop dependencies |
| **Data** | 📊 All in your database | 📈 Spread across services |

---

## 🚀 **Final Recommendation**

**Your webhook-driven backend is already enterprise-grade.** 

Zapier is now just an **optional enhancement** for external integrations you can't build directly.

**You've built something better than what most companies achieve with Zapier alone!** 🎉 