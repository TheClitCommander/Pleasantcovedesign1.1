# Squarespace Scheduling Integration Setup

## 🎯 **INTEGRATION STATUS: READY FOR SQUARESPACE** ✅

Your Pleasant Cove Design application now has full **Squarespace Scheduling** integration! Public clients can book appointments through Squarespace, and they automatically sync to your dashboard.

## 📅 **Features**

### **Calendar Scheduler**
- ✅ **FullCalendar view** with month/week/day views
- ✅ **Real-time appointment display** from Squarespace
- ✅ **Click-to-view details** for each appointment
- ✅ **Color-coded bookings** (Blue = Squarespace, Green = Manual)
- ✅ **Appointment stats** and analytics
- ✅ **Client information** integration with leads
- ✅ **Specific time slots**: 8:30 AM & 9:00 AM daily (25 minutes each)
- ✅ **Year-round availability**: 7 days a week, all year long

### **Squarespace Integration**
- ✅ **Webhook receiver** for new appointments
- ✅ **Auto-lead creation** from appointment bookings
- ✅ **Client-to-business linking** 
- ✅ **Real-time notifications** for new bookings
- ✅ **Activity tracking** for all appointments

## 🔗 **Squarespace Scheduling Webhook URLs**

Configure these webhook URLs in your **Squarespace Scheduling** dashboard:

### **New Appointment Webhook**
```
POST http://localhost:5174/api/scheduling/appointment-created
```

### **Appointment Updated Webhook**
```
POST http://localhost:5174/api/scheduling/appointment-updated
```

### **Appointment Cancelled Webhook**
```
POST http://localhost:5174/api/scheduling/appointment-cancelled
```

## ⚙️ **Squarespace Scheduling Setup**

### **Step 1: Access Scheduling Settings**
1. Go to your **Squarespace dashboard**
2. Navigate to **Scheduling** > **Settings**
3. Click **Integrations** or **Webhooks**

### **Step 2: Configure Webhooks**
Add these webhook endpoints:

| Event | Webhook URL | Method |
|-------|-------------|---------|
| Appointment Created | `http://localhost:5174/api/scheduling/appointment-created` | POST |
| Appointment Updated | `http://localhost:5174/api/scheduling/appointment-updated` | POST |
| Appointment Cancelled | `http://localhost:5174/api/scheduling/appointment-cancelled` | POST |

### **Step 3: Expected Webhook Data Format**
The system expects these fields from Squarespace:

```json
{
  "id": "12345",
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john@business.com",
  "phone": "555-123-4567",
  "datetime": "2025-01-15T14:30:00Z",
  "endTime": "2025-01-15T15:30:00Z",
  "appointmentTypeID": "consultation",
  "notes": "Initial website consultation",
  "status": "scheduled"
}
```

### **Step 4: Configure Squarespace Time Slots**
Pleasant Cove offers **limited availability** for focused consultations:

**Available Time Slots:**
- 🌅 **Morning Slot**: 8:30 AM - 8:55 AM (25 minutes)
- 🌅 **Early Slot**: 9:00 AM - 9:25 AM (25 minutes)

**Availability:**
- ✅ **7 days a week** (Monday - Sunday)
- ✅ **All year round** (365 days)
- ✅ **No holidays or blackout dates**

**Configure in Squarespace Scheduling:**
1. Set **Service Duration**: 25 minutes
2. Set **Available Times**: 8:30 AM and 9:00 AM only
3. Set **Days Available**: Monday through Sunday
4. **Buffer Time**: 5 minutes between slots (built-in)

## 🎯 **How It Works**

### **Public Booking Flow**
1. **Client visits** your Squarespace scheduling page
2. **Client books** an appointment slot
3. **Squarespace sends** webhook to Pleasant Cove
4. **System automatically**:
   - Creates/finds client in your lead database
   - Creates appointment record
   - Sends you a real-time notification
   - Updates the calendar dashboard

### **Dashboard Management**
1. **View calendar** at `/schedule` page
2. **Click any appointment** to see client details
3. **Manage appointment** status and notes
4. **Access client info** with direct lead integration

## 📊 **Calendar Dashboard Features**

### **Calendar Views**
- **Month View**: Overview of all appointments
- **Week View**: Detailed weekly schedule  
- **Day View**: Hour-by-hour appointment slots

### **Appointment Details Modal**
- **Client contact** information
- **Appointment time** and duration
- **Booking notes** from client
- **Booking source** (Squarespace vs Manual)
- **Quick actions** (Reschedule, View Client, etc.)

### **Quick Stats Cards**
- **Total Appointments**: All scheduled appointments
- **This Week**: Upcoming appointments  
- **Squarespace Bookings**: Auto-scheduled vs manual

## 🔧 **Development & Testing**

### **Test Webhook Locally**
```bash
curl -X POST http://localhost:5174/api/scheduling/appointment-created \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test_123",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@testbusiness.com",
    "phone": "555-987-6543",
    "datetime": "2025-01-20T10:00:00Z",
    "notes": "Test appointment booking",
    "status": "scheduled"
  }'
```

### **View Results**
1. **Calendar**: Visit http://localhost:5173/schedule
2. **Leads**: Check http://localhost:5173/leads for new client
3. **Activities**: See appointment activity logged

## 🌐 **Production Deployment**

### **For Production Use:**
1. **Replace localhost** with your domain:
   ```
   https://yourdomain.com/api/scheduling/appointment-created
   ```

2. **Set up SSL** for secure webhooks

3. **Configure authentication** if needed (currently public endpoints)

4. **Monitor webhook logs** for troubleshooting

## 📱 **Mobile & Responsive**

The calendar scheduler is **fully responsive**:
- ✅ **Mobile-friendly** calendar navigation
- ✅ **Touch-optimized** event clicking
- ✅ **Responsive modals** for appointment details
- ✅ **Mobile stats cards** layout

## 🔔 **Notifications**

When appointments are booked:
- ✅ **Real-time dashboard** notifications
- ✅ **Activity stream** updates
- ✅ **High-priority leads** for scheduled clients
- ✅ **Lead scoring boost** (85 points for appointments)

## ✅ **Integration Checklist**

- [x] **Backend webhooks** implemented
- [x] **Calendar interface** built
- [x] **Appointment storage** working
- [x] **Client integration** functional
- [x] **Real-time notifications** active
- [x] **Mobile responsive** design
- [x] **Sample data** for testing
- [x] **Error handling** in place

**Status: READY FOR SQUARESPACE SCHEDULING INTEGRATION! 🎉**

Your appointment scheduler is fully functional and ready to receive bookings from Squarespace Scheduling. 