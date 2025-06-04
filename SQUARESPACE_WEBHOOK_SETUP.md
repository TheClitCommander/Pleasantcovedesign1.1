# Squarespace Webhook Integration Guide

## 🎯 Overview
Your Pleasant Cove Design admin can now send messages that automatically push to Squarespace member sections via webhooks.

## ✅ What's Already Built

### 1. **File Upload System**
- Working paperclip button in Project Messaging
- Uploads files to `/api/upload` endpoint
- Supports images, PDFs, docs, zip files
- Shows upload progress and attachment previews

### 2. **Webhook Endpoints**
- **`/api/push-client-message`** - Pushes messages to Squarespace
- **`/api/projects/:id/messages/with-push`** - Send admin message + auto-push

### 3. **Message Format for Squarespace**
```json
{
  "project_title": "Business Website Redesign",
  "company_name": "Coastal Electric", 
  "client_email": "info@coastalelectric.com",
  "message_content": "Your wireframes are ready!",
  "attachments": [
    {
      "url": "/uploads/wireframes.pdf",
      "name": "wireframes.pdf"
    }
  ],
  "timestamp": "2024-01-20T15:30:00Z",
  "sender": "Ben Dickinson",
  "message_type": "admin_update",
  "project_stage": "in_progress"
}
```

## 🔧 Setup Steps

### Step 1: Get Your Squarespace Webhook URL
1. Go to your Squarespace site
2. Find the Members area/section where you want messages to appear
3. Set up a webhook URL or Zapier integration
4. Copy the webhook URL

### Step 2: Configure the Webhook
In `server/routes.ts`, find line ~890 and replace:
```typescript
// You would integrate with Zapier/webhook here:
// await fetch('YOUR_SQUARESPACE_WEBHOOK_URL', {
//   method: 'POST',
//   headers: { 'Content-Type': 'application/json' },
//   body: JSON.stringify(squarespaceMessage)
// });
```

With your actual webhook:
```typescript
await fetch('https://your-squarespace-webhook-url.com', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN' // if needed
  },
  body: JSON.stringify(squarespaceMessage)
});
```

### Step 3: Test the Integration
1. Go to `/project-inbox` in your admin dashboard
2. Select a project
3. Type a message and attach a file
4. Click "Send" - it will automatically push to Squarespace!

## 🎨 Squarespace Display Options

### Option A: Direct HTML Injection
Use the webhook to inject HTML directly into a code block:
```html
<div class="client-message">
  <h4>{project_title}</h4>
  <p><strong>{sender}:</strong> {message_content}</p>
  <div class="attachments">
    <!-- Loop through attachments -->
  </div>
  <small>{timestamp}</small>
</div>
```

### Option B: Member Area Update
Push to a member-specific page or section that shows:
- Latest project updates
- File downloads
- Message history

### Option C: Email Notification + Page Update
Webhook triggers both:
1. Email to client: "You have a new project update"
2. Page update with the message content

## 📱 Testing Workflow

1. **Admin sends message** → Project Messaging interface
2. **Files upload** → `/api/upload` endpoint  
3. **Message saves** → Project database
4. **Webhook fires** → Squarespace receives formatted payload
5. **Client sees update** → In their member section

## 🔧 Advanced Features

### Auto-Push Toggle
In the admin interface, you can disable auto-push for specific messages:
```typescript
// Send without Squarespace push
api.post(`/projects/${projectId}/messages`, { 
  pushToSquarespace: false 
});
```

### Custom Message Types
Add different message types for different Squarespace layouts:
- `admin_update` - Regular project updates
- `milestone_reached` - Project milestones  
- `payment_request` - Payment reminders
- `file_delivery` - File deliveries

### Webhook Security
Add webhook verification in production:
```typescript
const signature = req.headers['x-webhook-signature'];
// Verify signature matches expected value
```

## 🚀 Ready to Use!

Your system is now ready! The admin can:
- ✅ Send messages with file attachments
- ✅ Auto-push to Squarespace member sections  
- ✅ Track all communication in one place
- ✅ Eliminate email chains and confusion

Just configure your Squarespace webhook URL and you're live! 🎉 