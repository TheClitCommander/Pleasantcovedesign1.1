# Environment Variables Setup

To enable automatic Acuity appointment backup sync, create a `.env` file in your project root with the following variables:

```env
# Pleasant Cove Design CRM Environment Variables

# Acuity Scheduling API Configuration
# Get these from: https://acuityscheduling.com/api
ACUITY_USER_ID=your_acuity_user_id_here
ACUITY_API_KEY=your_acuity_api_key_here

# Server Configuration  
PORT=5174
NODE_ENV=development

# Database Configuration
DATABASE_URL=sqlite:./websitewizard.db

# Admin Token for API access
ADMIN_TOKEN=pleasantcove2024admin
```

## How to Get Acuity API Credentials

1. **Log into your Acuity Scheduling account**
2. Go to **Settings** > **Integrations** > **API** 
3. Your **User ID** will be displayed on the API page
4. Click **"Show API Key"** to reveal your **API Key**
5. Copy both values into your `.env` file

## Automatic Sync Features

Once configured, your system will:
- ✅ **Automatically sync** every 15 minutes
- ✅ **Recover missed appointments** from server downtime  
- ✅ **Prevent duplicates** through intelligent deduplication
- ✅ **Create business records** for new clients automatically
- ✅ **Track appointment history** with activity logs

## Security Notes

- Never commit your `.env` file to version control
- Keep your API credentials secure and private
- The system uses Basic Auth as recommended by Acuity 