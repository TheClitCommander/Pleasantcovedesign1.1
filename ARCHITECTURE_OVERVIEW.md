# Pleasant Cove Design - Architecture Overview

## System Overview

Pleasant Cove Design is a private member messaging system built for Squarespace sites. It provides real-time, Facebook Messenger-style communication between business owners and their clients/members, with persistent message storage and file sharing capabilities.

## Core Components

### 1. Backend Server (`/server/`)
**Technology**: Node.js + Express + TypeScript + Socket.IO

#### Key Files:
- **`index.ts`** - Main server entry point
  - Handles CORS configuration
  - Sets up Express middleware
  - Initializes Socket.IO for real-time messaging
  - Manages file upload/download routes
  - Configures R2 storage integration

- **`routes.ts`** - API route definitions
  - `/api/token` - Authentication endpoint for admin/member tokens
  - `/api/messages` - Message CRUD operations
  - `/api/admin/inbox` - Admin conversation list
  - `/api/unified/send` - Unified message sending endpoint

- **`db.ts`** - In-memory database implementation
  - Stores companies, projects, and messages
  - Persists data to `data/database.json`
  - Provides data access methods

- **`storage.ts`** - Abstract storage interface
- **`postgres-storage.ts`** - PostgreSQL implementation (for production)
- **`r2-storage.ts`** - Cloudflare R2 file storage integration

- **`uploadRoutes.ts`** - File upload handling
  - Multer configuration
  - File type validation
  - R2/local storage routing

- **`middleware/validateToken.ts`** - Token validation middleware

### 2. Admin UI (`/src/`)
**Technology**: React + TypeScript + Vite + TailwindCSS

#### Key Components:
- **`pages/Inbox.tsx`** - Main messaging interface
  - Real-time message display
  - Conversation list with unread indicators
  - File upload/download
  - Socket.IO integration

- **`pages/Dashboard.tsx`** - Business overview dashboard
- **`pages/ClientProfile.tsx`** - Client information management
- **`pages/Schedule.tsx`** - Appointment scheduling interface
- **`Layout.tsx`** - Main app layout wrapper

### 3. Squarespace Widget (`/squarespace-widgets/`)
**Technology**: Vanilla JavaScript + HTML

#### Main File:
- **`messaging-widget-unified.html`** - Production-ready widget
  - Self-contained HTML/CSS/JS
  - Squarespace member detection
  - Real-time messaging via Socket.IO
  - File upload capabilities
  - Auto-reconnection logic

#### Backup Files:
- Multiple backup versions preserved as safety nets
- Each represents a working state at different development stages

### 4. Database Schema (`/server/schema.sql`)
PostgreSQL schema for production:
- `companies` - Client/member accounts
- `projects` - Conversation threads
- `messages` - Individual messages with attachments

### 5. Shared Types (`/shared/schema.ts`)
TypeScript type definitions shared between frontend and backend

## Data Flow

1. **Member Authentication**:
   - Widget detects Squarespace member context
   - Requests token from backend `/api/token`
   - Backend validates and returns project-specific token

2. **Message Flow**:
   - Messages sent via Socket.IO for real-time delivery
   - Stored in database (in-memory or PostgreSQL)
   - Broadcast to all connected clients in the same "room"
   - Admin UI receives via `admin-room` subscription

3. **File Upload**:
   - Files uploaded via multipart form to `/api/unified/upload`
   - Stored in R2 (production) or local `/uploads` (development)
   - URLs returned and attached to messages
   - Served via proxy endpoint to handle CORS

## Environment Configuration

### Development:
- Backend: `http://localhost:3000`
- Admin UI: `http://localhost:5173`
- Widget testing: `http://localhost:8080`

### Production (Railway):
- Backend: `https://pleasantcovedesign-production.up.railway.app`
- Uses PostgreSQL for data persistence
- R2 for file storage

## Key Features

1. **Real-time Messaging**: Socket.IO enables instant message delivery
2. **File Sharing**: Support for images and documents
3. **Member Detection**: Automatic Squarespace member authentication
4. **Persistent Storage**: Messages saved to database
5. **Admin Management**: Comprehensive UI for business owners
6. **Multi-tenant**: Supports multiple companies and projects
7. **Responsive**: Works on desktop and mobile devices

## Deployment

### Backend (Railway):
```bash
git push origin main  # Auto-deploys via Railway
```

### Widget:
- Copy contents of `messaging-widget-unified.html`
- Paste into Squarespace Code Block
- No build process required

### Admin UI:
```bash
npm run build  # Creates production build in /dist
```

## Common Issues & Solutions

1. **CORS Errors**: Check allowed origins in `server/index.ts`
2. **Socket Connection**: Ensure proper room joining logic
3. **File Upload**: Verify R2 credentials or local storage path
4. **Member Detection**: Test in actual Squarespace environment

## Development Commands

```bash
# Install dependencies
npm install

# Run full development environment
npm run dev

# Run backend only
npm start

# Run with R2 storage
export R2_ENDPOINT=... && npm start

# Test widget locally
npx serve . -p 8080
```

## Security Considerations

1. Token-based authentication for all endpoints
2. CORS configured for specific domains
3. File type validation on uploads
4. SQL injection prevention (when using PostgreSQL)
5. Rate limiting on API endpoints

## Future Enhancements

1. Email notifications for new messages
2. Read receipts
3. Typing indicators
4. Message search functionality
5. Webhook integrations with other services
6. Mobile app development

## Support Files

- `PRODUCTION_DEPLOYMENT_GUIDE.md` - Deployment instructions
- `WIDGET_INTEGRATION_GUIDE.md` - Widget setup guide
- `CURRENT_SYSTEM_STATUS.md` - Latest system state
- `TESTING_CHECKLIST.md` - QA procedures
- Various backup and documentation files in `/archive/` 