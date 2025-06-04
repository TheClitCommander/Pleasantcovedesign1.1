# 🚀 Squarespace Integration Setup Guide

## Complete setup instructions for Pleasant Cove Design member portal widgets

---

## 📋 Overview

This guide will help you integrate the **Appointment Booking** and **Messaging** widgets into your Squarespace member area, creating a seamless client experience that connects directly to your Pleasant Cove Design backend.

## 🎯 What You'll Accomplish

✅ **Appointment Booking**: Clients can book consultations directly from the member area
✅ **Real-time Messaging**: Two-way communication with file attachments
✅ **Automatic Integration**: All data flows to your admin dashboard
✅ **Professional Experience**: Branded widgets that match your design

---

## 🛠️ Prerequisites

Before starting, ensure you have:

- [ ] Squarespace Business Plan or higher (required for code injection)
- [ ] Pleasant Cove Design backend running (your current system)
- [ ] Admin access to your Squarespace site
- [ ] Your backend URL (e.g., `https://yourdomain.com` or for testing: `http://localhost:5174`)

---

## 📦 Part 1: Backend Preparation

### 1.1 Update Backend Configuration

First, update your Pleasant Cove backend to allow Squarespace connections:

```javascript
// In server/routes.ts - Update CORS settings
app.use(cors({
  origin: [
    'https://your-squarespace-site.squarespace.com',
    'https://yourdomain.com', // Your custom domain
    'http://localhost:5173' // For development
  ],
  credentials: true
}));
```

### 1.2 Set Up Project Tokens

Each client needs a unique project token. You can either:

**Option A: Manual Setup**
1. Go to your admin dashboard → Project Messaging
2. Copy the project token for each client
3. Provide tokens to clients during onboarding

**Option B: Automatic Setup (Recommended)**
1. Add this endpoint to generate tokens automatically:

```javascript
// In server/routes.ts
app.post("/api/projects/:id/generate-token", async (req: Request, res: Response) => {
  const projectId = parseInt(req.params.id);
  const project = await storage.getProjectById(projectId);
  
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }
  
  const token = crypto.randomUUID();
  await storage.updateProject(projectId, { accessToken: token });
  
  res.json({ token, projectId });
});
```

---

## 🏗️ Part 2: Squarespace Setup

### 2.1 Create Member Area Pages

1. **Go to Squarespace Admin** → Pages → Add Page
2. **Create these pages:**
   - `Book Consultation` (for appointment booking)
   - `Project Messages` (for messaging)
3. **Set permissions** to "Members Only"

### 2.2 Add Code Injection

For each page, follow these steps:

#### 📅 Appointment Booking Page

1. **Edit Page** → Click gear icon → **Advanced** → **Page Header Code Injection**
2. **Paste this code:**

```html
<!-- Pleasant Cove Appointment Booking Widget -->
<script>
// Configuration - UPDATE THESE VALUES
window.memberEmail = '{member-email}'; // Squarespace will replace this
window.backendUrl = 'https://yourdomain.com'; // Replace with your backend URL
</script>

<style>
/* Hide default Squarespace page elements if needed */
.content-wrapper {
  padding: 0 !important;
}
</style>
```

3. **In Page Content**, add a **Code Block** and paste the entire contents of `appointment-booking.html`

#### 💬 Messaging Page

1. **Edit Page** → Click gear icon → **Advanced** → **Page Header Code Injection**
2. **Paste this code:**

```html
<!-- Pleasant Cove Messaging Widget -->
<script>
// Configuration - UPDATE THESE VALUES
window.memberEmail = '{member-email}'; // Squarespace will replace this
window.projectToken = '{project-token}'; // You'll need to set this per member
window.backendUrl = 'https://yourdomain.com'; // Replace with your backend URL
</script>

<style>
/* Hide default Squarespace page elements */
.content-wrapper {
  padding: 0 !important;
}
.page-section {
  padding: 0 !important;
}
</style>
```

3. **In Page Content**, add a **Code Block** and paste the entire contents of `messaging-widget.html`

### 2.3 Member Variables Setup

Since Squarespace doesn't have built-in member variable injection, you have a few options:

#### Option A: URL Parameters (Simplest)
Direct members to pages like:
- `https://yoursite.com/book-consultation?email=client@email.com`
- `https://yoursite.com/project-messages?email=client@email.com&token=project-token-123`

#### Option B: Custom Member Database
Create a simple lookup system in your backend:

```javascript
// Add to server/routes.ts
app.get("/api/member/:email/project-token", async (req: Request, res: Response) => {
  const email = req.params.email;
  // Look up project token by member email
  const project = await storage.getProjectByMemberEmail(email);
  res.json({ projectToken: project?.accessToken });
});
```

#### Option C: Squarespace Member Areas Plugin
Use a third-party plugin to inject member-specific data.

---

## 🔗 Part 3: Webhook Integration

### 3.1 Set Up Squarespace Form Webhooks

For the appointment booking to work seamlessly:

1. **Go to Squarespace** → Settings → Advanced → External API Keys
2. **Create a webhook** that points to: `https://yourdomain.com/api/scheduling/appointment-created`
3. **Test the webhook** with sample appointment data

### 3.2 Configure Webhook Authentication

Add webhook verification to your backend:

```javascript
// In server/routes.ts
app.post("/api/scheduling/appointment-created", async (req: Request, res: Response) => {
  // Verify webhook signature (recommended for production)
  const signature = req.headers['x-squarespace-signature'];
  if (!verifyWebhookSignature(req.body, signature)) {
    return res.status(401).json({ error: "Invalid signature" });
  }
  
  // Your existing appointment creation logic here...
});
```

---

## 🎨 Part 4: Customization

### 4.1 Brand Styling

Customize the widgets to match your brand:

```css
/* Add to Page Header Code Injection */
<style>
.pcd-booking-widget,
.pcd-messaging-widget {
  --primary-color: #your-brand-color;
  --secondary-color: #your-secondary-color;
  font-family: 'Your-Brand-Font', sans-serif;
}

.pcd-booking-header,
.pcd-messaging-header {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
}
</style>
```

### 4.2 Custom Domain Setup

For production, replace all `http://localhost:5174` references with your actual domain:

1. **Update widget configurations**
2. **Update CORS settings**
3. **Update webhook URLs**
4. **Test all functionality**

---

## 🧪 Part 5: Testing

### 5.1 Test Appointment Booking

1. **Visit the booking page** as a logged-in member
2. **Select a date and time slot**
3. **Fill out the form** and submit
4. **Check your admin dashboard** to see the appointment appear
5. **Verify webhook** fired correctly

### 5.2 Test Messaging

1. **Visit the messaging page** as a logged-in member
2. **Send a test message**
3. **Check admin dashboard** → Project Messaging
4. **Reply from admin** and verify client sees the response
5. **Test file uploads** (images, PDFs, etc.)

### 5.3 Test Real-time Features

1. **Open messaging page** in one browser tab
2. **Open admin dashboard** in another tab
3. **Send messages from both sides**
4. **Verify real-time updates** (3-second polling)

---

## 🚨 Troubleshooting

### Common Issues & Solutions

#### Issue: "Unable to load project information"
**Solution:** Check that `projectToken` is being set correctly in the page header.

#### Issue: CORS errors in browser console
**Solution:** Update your backend CORS settings to include your Squarespace domain.

#### Issue: Appointments not appearing in admin
**Solution:** Check webhook URL and verify the endpoint is receiving POST requests.

#### Issue: Messages not sending
**Solution:** Verify the backend API endpoints are accessible and authentication is working.

#### Issue: File uploads failing
**Solution:** Check file size limits and ensure upload endpoint is working.

### Debug Mode

Enable debug mode by adding this to page header:

```javascript
<script>
window.DEBUG_MODE = true;
</script>
```

This will show additional console logs to help troubleshoot issues.

---

## 🚀 Going Live

### Production Checklist

- [ ] Replace all localhost URLs with production URLs
- [ ] Update CORS settings for production domain
- [ ] Set up SSL certificates for secure connections
- [ ] Test all functionality on production environment
- [ ] Set up monitoring for webhook endpoints
- [ ] Configure proper error handling and logging
- [ ] Test member onboarding flow
- [ ] Verify email notifications are working
- [ ] Set up backup/recovery procedures

### Security Considerations

- [ ] Implement webhook signature verification
- [ ] Use HTTPS for all connections
- [ ] Validate all user inputs
- [ ] Implement rate limiting
- [ ] Set up proper authentication tokens
- [ ] Regular security audits
- [ ] Monitor for suspicious activity

---

## 🆘 Support

If you need help with setup:

1. **Check the console logs** in your browser developer tools
2. **Verify all URLs** are pointing to the correct backend
3. **Test webhook endpoints** using tools like Postman
4. **Check network requests** in browser dev tools
5. **Review server logs** for error messages

### Contact Information

For technical support with Pleasant Cove Design integration, include:
- Squarespace site URL
- Backend URL
- Browser console errors
- Server log excerpts
- Steps to reproduce the issue

---

## 📚 Additional Resources

- [Squarespace Developer Documentation](https://developers.squarespace.com/)
- [Code Injection Guide](https://support.squarespace.com/hc/en-us/articles/205815928)
- [Member Areas Documentation](https://support.squarespace.com/hc/en-us/articles/206543617)
- [Webhook Testing Tools](https://webhook.site/)

---

🎉 **Congratulations!** Once set up, your clients will have a professional, integrated experience for booking appointments and communicating about their projects, all while keeping you in control through your Pleasant Cove Design admin dashboard. 