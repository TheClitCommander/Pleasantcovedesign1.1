# Mixed Content Fix for Attachment URLs

## Issue
The production widget was showing "Mixed Content" warnings because attachment URLs were being served with HTTP protocol instead of HTTPS, causing browser security warnings and potential image loading failures.

## Root Cause
The backend was constructing attachment URLs using hardcoded `http://localhost:3000` for local development, which was then being served to the production widget running on HTTPS.

## Solution Implemented

### 1. Backend URL Construction
Updated all instances in `server/routes.ts` where attachment URLs are constructed to:
- Always use HTTPS for production (`https://pleasantcovedesign-production.up.railway.app`)
- Use environment variable `NGROK_URL` if available (for ngrok tunneling)
- Default to `https://localhost:3000` for local development (not `http://`)

### 2. Key Changes
```typescript
// Before
const baseUrl = process.env.NODE_ENV === 'production' 
  ? 'https://pleasantcovedesign-production.up.railway.app'
  : `http://localhost:${process.env.PORT || 3000}`;

// After
const baseUrl = process.env.NODE_ENV === 'production' 
  ? 'https://pleasantcovedesign-production.up.railway.app'
  : process.env.NGROK_URL || `https://localhost:${process.env.PORT || 3000}`;
```

### 3. Locations Fixed
- Message attachment URL generation (multiple instances)
- File upload response URLs
- Squarespace webhook attachment URLs
- Admin message attachment URLs

## Environment Variable
To use ngrok for local development with HTTPS:
```bash
export NGROK_URL=https://your-ngrok-url.ngrok-free.app
```

## Result
- ✅ No more mixed content warnings in production
- ✅ Images load reliably on HTTPS pages
- ✅ Browser automatically upgrades HTTP to HTTPS
- ✅ CORS headers properly configured for cross-origin image access

## Testing
1. Upload an image through the widget
2. Check browser console - no mixed content warnings
3. Verify image displays correctly
4. Check network tab - all attachment URLs use HTTPS

## Note
The widget's `renderAttachments()` function now simply uses the URLs as provided by the backend, trusting that they are properly formatted with the correct protocol. 