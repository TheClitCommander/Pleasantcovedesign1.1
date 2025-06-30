# Important Files Quick Reference

## 🚨 Critical Files - DO NOT DELETE

### Production Widget
```
squarespace-widgets/messaging-widget-unified.html
```
- **Purpose**: The main widget deployed on Squarespace sites
- **Status**: Production-ready, tested, and working
- **Note**: Has synchronous backend URL detection (critical for initialization)

### Backend Core
```
server/index.ts         # Main server - handles everything
server/routes.ts        # API endpoints
server/db.ts           # In-memory database
server/uploadRoutes.ts  # File upload handling
```

### Admin UI Core
```
src/pages/Inbox.tsx     # Main messaging interface (just fixed!)
src/Layout.tsx          # App wrapper
src/App.tsx            # Route definitions
```

### Configuration Files
```
package.json           # Dependencies and scripts
server/schema.sql      # PostgreSQL schema
shared/schema.ts       # TypeScript types
```

## 📁 File Organization

### `/server/` - Backend Code
- All TypeScript files that run on Node.js
- Handles API, WebSocket, database, file storage

### `/src/` - Admin UI Code  
- React components and pages
- This is what business owners see

### `/squarespace-widgets/` - Client Widgets
- HTML files that get embedded in Squarespace
- What members/clients see

### `/archive/` - Historical Files
- Old documentation and backups
- Safe to ignore but don't delete

### `/uploads/` - Local File Storage
- Where uploaded files go in development
- Production uses R2 cloud storage

### `/data/` - Database Files
- `database.json` - Persistent data storage

## 🔧 Key Scripts

```bash
npm run dev    # Starts everything (recommended)
npm start      # Backend only (production mode)
npm run build  # Build for deployment
```

## 🌟 Most Recently Modified

1. `src/pages/Inbox.tsx` - Fixed unread counts and real-time updates
2. `server/index.ts` - Image proxy improvements
3. `squarespace-widgets/messaging-widget-unified.html` - Widget stability

## ⚠️ Known Issues

1. R2 storage needs environment variables to work
2. Widget must be tested in actual Squarespace environment
3. Some backup files in `/uploads/` can be cleaned periodically

## 💡 Tips for New Developers

1. Start with `npm run dev` to see everything working
2. Check `ARCHITECTURE_OVERVIEW.md` for detailed explanations
3. Test widget at `http://localhost:8080/test-instrumented-widget.html`
4. Admin UI is at `http://localhost:5173`
5. Don't modify backup widget files - they're safety nets

## 🚀 Production URLs

- Backend API: https://pleasantcovedesign-production.up.railway.app
- Squarespace Site: https://www.pleasantcovedesign.com

## 📝 Environment Variables Needed

For R2 file storage:
- R2_ENDPOINT
- R2_BUCKET  
- R2_ACCESS_KEY_ID
- R2_SECRET_ACCESS_KEY
- R2_REGION

For production database:
- DATABASE_URL (PostgreSQL connection string) 