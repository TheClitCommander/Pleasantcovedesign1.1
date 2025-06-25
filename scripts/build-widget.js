import fs from 'fs';
import path from 'path';

console.log('🔧 Building production widget...');

const widgetSource = 'squarespace-widgets/messaging-widget-unified.html';
const widgetDist = 'dist/messaging-widget-production.html';

if (!fs.existsSync(widgetSource)) {
  console.error('❌ Widget source file not found:', widgetSource);
  process.exit(1);
}

// Read the widget template
let widgetContent = fs.readFileSync(widgetSource, 'utf8');

// Replace development URLs with production URLs
const productionUrl = process.env.RAILWAY_URL || process.env.FRONTEND_URL || 'https://your-railway-app.up.railway.app';

console.log(`🌐 Configuring widget for production URL: ${productionUrl}`);

// Replace localhost and ngrok URLs with production URL
widgetContent = widgetContent.replace(/http:\/\/localhost:3000/g, productionUrl);
widgetContent = widgetContent.replace(/https:\/\/.*\.ngrok-free\.app/g, productionUrl);

// Add production configuration flag
const productionConfig = `
    // Production Configuration
    const PRODUCTION_MODE = true;
    const PRODUCTION_URL = '${productionUrl}';
    const USE_HTTPS = true;
`;

// Insert production config after the existing configuration
widgetContent = widgetContent.replace(
  '// Configuration flags',
  `// Configuration flags\n${productionConfig}`
);

// Ensure dist directory exists
const distDir = path.dirname(widgetDist);
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Write production widget
fs.writeFileSync(widgetDist, widgetContent);

console.log('✅ Production widget built successfully!');
console.log(`📄 Output: ${widgetDist}`);
console.log(`🔗 Production URL: ${productionUrl}`);

// Also create a backup with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = `dist/messaging-widget-backup-${timestamp}.html`;
fs.writeFileSync(backupPath, widgetContent);

console.log(`💾 Backup created: ${backupPath}`); 