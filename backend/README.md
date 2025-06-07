# Pleasant Cove Design - Appointment Booking Backend

This backend server handles appointment bookings from the Squarespace widget and integrates with your CRM system.

## Features

- ✅ Accept appointment bookings from Squarespace widget
- ✅ Check time slot availability
- ✅ Send email confirmations (client & admin)
- ✅ Store appointments in SQLite database
- ✅ REST API for CRM integration
- ✅ CORS configured for Squarespace

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy `env.example` to `.env` and update with your settings:

```bash
cp env.example .env
```

Edit `.env` with your email settings:
- `EMAIL_USER`: Your email address
- `EMAIL_PASS`: App-specific password (not regular password)

### 3. Run the Server

For development:
```bash
npm run dev
```

For production:
```bash
npm start
```

### 4. Testing with Squarespace

To test the widget in Squarespace before deploying:

1. Start the local server:
   ```bash
   npm run dev
   ```

2. Create a public tunnel using ngrok:
   ```bash
   npm run tunnel
   ```

3. Copy the ngrok URL (e.g., `https://abc123.ngrok-free.app`)

4. Update the widget code in Squarespace:
   - Find the `getApiUrl()` function
   - Update the `NGROK_API_URL` constant with your new ngrok URL

## API Endpoints

### Book Appointment
```
POST /api/book-appointment
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "(555) 123-4567",
  "businessName": "Acme Corp",
  "services": "website, branding",
  "projectDescription": "Need a new website",
  "budget": "5k-10k",
  "timeline": "2-3-months",
  "appointmentDate": "2024-01-15",
  "appointmentTime": "10:00 AM",
  "additionalNotes": "Looking forward to discussing"
}
```

### Check Availability
```
GET /api/availability/2024-01-15

Response:
{
  "success": true,
  "date": "2024-01-15",
  "availableSlots": ["9:00 AM", "10:00 AM", ...],
  "bookedSlots": ["11:00 AM", "2:00 PM"]
}
```

### Get All Appointments (Admin)
```
GET /api/appointments

Response:
{
  "success": true,
  "appointments": [...]
}
```

### Update Appointment Status
```
PATCH /api/appointments/123/status
Content-Type: application/json

{
  "status": "confirmed"
}
```

## Deployment Options

### Option 1: Heroku (Free tier available)

1. Install Heroku CLI
2. Create a new Heroku app:
   ```bash
   heroku create pleasant-cove-appointments
   ```

3. Set environment variables:
   ```bash
   heroku config:set EMAIL_USER=your-email@gmail.com
   heroku config:set EMAIL_PASS=your-app-password
   ```

4. Deploy:
   ```bash
   git push heroku main
   ```

### Option 2: Railway.app (Simple deployment)

1. Visit [railway.app](https://railway.app)
2. Connect your GitHub repo
3. Add environment variables in the dashboard
4. Deploy automatically

### Option 3: VPS (DigitalOcean, Linode, etc.)

1. Set up a Ubuntu server
2. Install Node.js and PM2
3. Clone your repo
4. Run with PM2:
   ```bash
   pm2 start appointment-server.js --name appointments
   ```

## Database

The server uses SQLite for simplicity. The database file (`appointments.db`) is created automatically.

To view appointments directly:
```bash
sqlite3 appointments.db
.tables
SELECT * FROM appointments;
```

## Email Configuration

### Gmail Setup
1. Enable 2-factor authentication
2. Generate app-specific password
3. Use the app password in `.env`

### Alternative: SendGrid (Recommended for production)
1. Sign up at sendgrid.com
2. Get API key
3. Update the email configuration in the server

## Troubleshooting

### CORS Issues
- Make sure your domain is listed in the CORS configuration
- Check browser console for specific CORS errors

### Email Not Sending
- Verify app-specific password is correct
- Check spam folder
- Consider using SendGrid for better deliverability

### Database Errors
- Ensure write permissions for the backend directory
- Check SQLite is installed: `npm install sqlite3 --save`

## Security Considerations

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Use HTTPS in production** - Required for Squarespace
3. **Validate all inputs** - Already implemented
4. **Rate limiting** - Consider adding for production
5. **Backup database regularly** - Set up automated backups

## Support

For issues or questions:
- Email: pleasantcovedesign@gmail.com
- Phone: (207) 380-5680 