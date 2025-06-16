# File Upload Setup Guide

## ✅ Your File Upload System is Ready!

Your backend has **complete file upload support** with both cloud storage (R2) and local fallback. Here's how to set it up:

## 🚀 Quick Start (Local Storage)

**Files are now working with local storage!** Just restart your server:

```bash
npm run server
```

Files will be:
- ✅ Uploaded to `./uploads/` directory
- ✅ Accessible at `http://localhost:3000/uploads/filename`
- ✅ Automatically included in messages
- ✅ Broadcast via WebSocket

## ☁️ Production Setup (Cloudflare R2)

For production, set up R2 for better performance:

### 1. Create R2 Bucket
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2 Object Storage**
3. Create a new bucket (e.g., `pleasant-cove-files`)

### 2. Get R2 Credentials
1. Go to **R2 > Manage R2 API tokens**
2. Create token with **Object Read & Write** permissions
3. Note down your credentials

### 3. Set Environment Variables
Create a `.env` file (or update Railway/production environment):

```bash
# Cloudflare R2 Storage
R2_ENDPOINT=https://YOUR-ACCOUNT-ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET=your-bucket-name
R2_REGION=auto
```

### 4. Restart Server
Your server will automatically detect R2 and use it for uploads.

## 🔧 How It Works

### Frontend (Widget)
```javascript
// Your widget correctly sends files via FormData
const formData = new FormData();
formData.append('content', messageContent);
formData.append('senderName', this.userName);
formData.append('files', file); // ✅ Correct for your backend
```

### Backend (Routes)
```typescript
// Your route handles both R2 and local storage
app.post("/api/public/project/:token/messages", 
  upload.array('files'),  // ✅ Multer configured
  async (req, res) => {
    // ✅ Processes req.files automatically
    // ✅ Saves to R2 or local storage
    // ✅ Returns URLs in message
    // ✅ Broadcasts via WebSocket
  }
);
```

## 📁 File Storage Locations

### Local Development
- **Location:** `./uploads/project-[token]-[timestamp]-[filename]`
- **URL:** `http://localhost:3000/uploads/project-[token]-[timestamp]-[filename]`

### Production (R2)
- **Location:** R2 bucket with key `[token]/[timestamp]-[filename]`
- **URL:** `https://your-account.r2.cloudflarestorage.com/bucket/[key]`

## 🧪 Testing File Uploads

1. **Start your server:** `npm run server`
2. **Open widget:** Visit your messaging widget
3. **Send a message with file:** Click attach icon, select file, send
4. **Check console:** Should see `📎 Multer uploads processed: [...]`
5. **Verify file:** Check `./uploads/` directory for saved file

## 🎯 Supported File Types

- **Images:** jpg, jpeg, png, gif, webp
- **Documents:** pdf, doc, docx, txt
- **Archives:** zip
- **Spreadsheets:** xls, xlsx
- **Size Limit:** 10MB per file
- **Count Limit:** 5 files per message

## 🔍 Troubleshooting

### Files Not Uploading?
- Check server logs for multer errors
- Verify `uploads/` directory exists
- Check file size (10MB limit)

### Files Not Accessible?
- Verify static serving: `http://localhost:3000/uploads/[filename]`
- Check file permissions

### R2 Not Working?
- Verify all environment variables are set
- Check R2 credentials and bucket permissions
- Server will fall back to local storage

## ✅ Current Status

- ✅ **Multer configured** with R2 and local fallback
- ✅ **Route setup** for `/api/public/project/:token/messages`
- ✅ **File processing** for both FormData and JSON
- ✅ **Static serving** for local files
- ✅ **WebSocket broadcasting** with attachments
- ✅ **Security** with file type validation and size limits
- ✅ **Widget integration** with correct FormData structure

Your file upload system is **production-ready**! 🚀 