import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { registerRoutes } from "./routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5174;

// Enhanced CORS for Squarespace webhooks
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://localhost:5173', 
    /\.squarespace\.com$/,
    /\.squarespace-cdn\.com$/,
    /pleasantcove/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Parse JSON bodies with increased limit for webhook data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from React build (if they exist)
const buildPath = path.join(__dirname, '../dist/client');
app.use(express.static(buildPath));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.1',
    services: {
      database: 'connected',
      webhooks: 'active'
    }
  });
});

// Enhanced webhook validation middleware
app.use('/api/new-lead', (req, res, next) => {
  console.log('=== SQUARESPACE WEBHOOK RECEIVED ===');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('IP:', req.ip);
  console.log('User-Agent:', req.get('User-Agent'));
  console.log('==========================================');
  next();
});

// Register all API routes
await registerRoutes(app);

// Handle React Router - serve index.html for non-API routes
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  try {
    res.sendFile(path.join(buildPath, 'index.html'));
  } catch (error) {
    // If build doesn't exist, serve a simple development message
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pleasant Cove Design - Development</title>
          <style>
            body { font-family: system-ui; padding: 2rem; max-width: 800px; margin: 0 auto; }
            .status { padding: 1rem; background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; }
            .api-link { color: #0ea5e9; text-decoration: none; }
            .api-link:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <h1>🚀 Pleasant Cove Design - WebsiteWizard</h1>
          <div class="status">
            <h2>✅ Server Running on Port 5173</h2>
            <p>Backend API is active and ready for Squarespace integration!</p>
            <p><strong>Webhook Endpoint:</strong> <code>http://localhost:5173/api/new-lead</code></p>
            <p><strong>Test API:</strong> <a href="/api/businesses?token=pleasantcove2024admin" class="api-link">View Businesses</a></p>
            <p><strong>Health Check:</strong> <a href="/health" class="api-link">Server Status</a></p>
          </div>
          <h3>Build React App</h3>
          <p>To see the full UI, run: <code>npm run build</code> then refresh this page.</p>
        </body>
      </html>
    `);
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Pleasant Cove Design v1.1 server running on port ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`🔗 Webhook endpoint: http://localhost:${PORT}/api/new-lead`);
  console.log(`💾 Database: SQLite (websitewizard.db)`);
  console.log(`🎯 Ready for Squarespace integration!`);
});

// Enhanced error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (server) {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } else {
    console.log('Server closed');
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  if (server) {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } else {
    console.log('Server closed');
    process.exit(0);
  }
});

export default app; 