# 🏖️ Pleasant Cove Design - Squarespace Member Portal Widgets

## 📦 What's Included

This package contains everything you need to integrate appointment booking and messaging functionality into your Squarespace member area, connecting seamlessly with your Pleasant Cove Design backend.

### 📁 Files Overview

```
squarespace-widgets/
├── appointment-booking.html    # Appointment booking widget
├── messaging-widget.html      # Real-time messaging widget  
├── demo.html                  # Interactive demo page
├── SETUP_GUIDE.md            # Complete integration guide
└── README.md                 # This file
```

---

## 🎯 Quick Demo

To see the widgets in action:

1. **Start your Pleasant Cove backend**: `npm run dev`
2. **Open the demo**: Visit `squarespace-widgets/demo.html` in your browser
3. **Try the features**:
   - Book a consultation appointment
   - Send messages with file attachments
   - See real-time updates

---

## ✨ Features

### 📅 Appointment Booking Widget
- **Date & time selection** with availability checking
- **Client information capture** (name, email, phone, project details)
- **Real-time validation** and error handling
- **Automatic sync** with your admin dashboard
- **Mobile responsive** design
- **Professional styling** that matches your brand

### 💬 Messaging Widget
- **Real-time messaging** with 3-second polling
- **File attachments** (images, PDFs, documents)
- **Message history** with timestamps
- **Connection status** indicator
- **Auto-scroll** to new messages
- **Professional chat interface**

---

## 🚀 Integration Overview

### How It Works:

1. **Client visits** your Squarespace member area
2. **Widgets load** and connect to your Pleasant Cove backend
3. **Actions sync** automatically with your admin dashboard:
   - Appointments → Schedule page
   - Messages → Project Messaging page
4. **You manage everything** from your existing admin interface

### What You Get:

✅ **No hosting responsibility** - widgets run in Squarespace
✅ **Complete control** - all data in your admin dashboard  
✅ **Professional experience** - branded, mobile-responsive design
✅ **Real-time communication** - instant message delivery
✅ **File sharing** - images, PDFs, documents
✅ **Automated workflows** - appointments auto-create leads

---

## 🛠️ Next Steps

1. **Review the demo**: Open `demo.html` to see the widgets working
2. **Read the setup guide**: Follow `SETUP_GUIDE.md` for integration
3. **Test the connection**: Ensure your backend is running
4. **Customize styling**: Match your brand colors and fonts
5. **Deploy to Squarespace**: Follow the integration steps

---

## 📋 Setup Checklist

Before integrating with Squarespace:

- [ ] Pleasant Cove backend is running and accessible
- [ ] You have Squarespace Business Plan or higher
- [ ] You have admin access to your Squarespace site
- [ ] You've tested the widgets with the demo page
- [ ] You understand the member authentication flow

---

## 🎨 Customization

The widgets are designed to be easily customizable:

### Brand Colors
Update the CSS variables in the widget headers:
```css
--primary-color: #your-brand-color;
--secondary-color: #your-secondary-color;
```

### Fonts
Change the font family:
```css
font-family: 'Your-Brand-Font', sans-serif;
```

### Layout
Adjust spacing, sizes, and mobile breakpoints as needed.

---

## 🔧 Technical Details

### Backend Requirements
- Pleasant Cove Design backend running on port 5174 (or your custom URL)
- CORS configured to allow Squarespace domain
- Project messaging and appointment endpoints active

### Browser Support
- Chrome, Firefox, Safari, Edge (modern versions)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Internet Explorer 11+ (with polyfills)

### Security Features
- Input validation and sanitization
- XSS protection
- File upload restrictions (type, size)
- Connection status monitoring

---

## 🆘 Troubleshooting

### Common Issues:

**Widgets not loading?**
- Check that your backend is running
- Verify CORS settings include your domain
- Check browser console for errors

**Appointments not appearing?**
- Verify webhook URL is correct
- Check backend logs for errors
- Test endpoint with Postman

**Messages not sending?**
- Check project token is set correctly
- Verify API endpoints are accessible
- Check network requests in browser dev tools

### Debug Mode:
Add this to enable detailed logging:
```javascript
window.DEBUG_MODE = true;
```

---

## 📞 Support

For setup assistance:

1. **Check the demo** works with your backend running
2. **Review browser console** for error messages  
3. **Test API endpoints** individually
4. **Follow the setup guide** step by step
5. **Check Squarespace documentation** for code injection

---

## 🎉 Ready to Launch?

Once you've tested the demo and reviewed the setup guide, you're ready to create a professional member portal that integrates seamlessly with your Pleasant Cove Design workflow!

**Next**: Open `SETUP_GUIDE.md` for detailed integration instructions. 