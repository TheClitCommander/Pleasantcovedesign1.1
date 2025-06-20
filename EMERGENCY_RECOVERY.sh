#!/bin/bash

# 🚨 EMERGENCY RECOVERY SCRIPT
# This script restores the final working state of the messaging system

echo "🚨 EMERGENCY RECOVERY STARTING..."
echo "📍 Current directory: $(pwd)"

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "squarespace-widgets" ]; then
    echo "❌ ERROR: Please run this script from the project root directory"
    exit 1
fi

echo "✅ Project directory confirmed"

# 1. Restore the final working widget
echo "📁 Restoring final working widget..."
if [ -f "squarespace-widgets/ULTIMATE-FINAL-WORKING-messaging-widget-unified.html" ]; then
    cp squarespace-widgets/ULTIMATE-FINAL-WORKING-messaging-widget-unified.html squarespace-widgets/messaging-widget-unified.html
    echo "✅ Widget restored from ULTIMATE-FINAL-WORKING backup"
else
    echo "❌ ERROR: ULTIMATE-FINAL-WORKING backup not found!"
    exit 1
fi

# 2. Check if server files are intact
echo "🔧 Checking server files..."
if [ -f "server/routes.ts" ]; then
    echo "✅ Server routes file exists"
else
    echo "❌ ERROR: server/routes.ts missing!"
    exit 1
fi

# 3. Check database
echo "💾 Checking database..."
if [ -f "data/database.json" ]; then
    echo "✅ Database file exists"
else
    echo "❌ WARNING: database.json missing - creating empty one"
    mkdir -p data
    echo '{"companies":[],"projects":[],"messages":[]}' > data/database.json
fi

# 4. Check uploads directory
echo "📎 Checking uploads directory..."
if [ ! -d "uploads" ]; then
    echo "📁 Creating uploads directory..."
    mkdir uploads
fi
echo "✅ Uploads directory ready"

# 5. Install dependencies if needed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

# 6. Display recovery status
echo ""
echo "🎉 EMERGENCY RECOVERY COMPLETE!"
echo ""
echo "📋 RECOVERY SUMMARY:"
echo "✅ Widget restored from ULTIMATE-FINAL-WORKING backup"
echo "✅ Server files verified"
echo "✅ Database checked"
echo "✅ Upload directory ready"
echo "✅ Dependencies verified"
echo ""
echo "🚀 TO START THE SYSTEM:"
echo "   npm run dev"
echo ""
echo "🔧 IF STILL NOT WORKING:"
echo "1. Check git status: git status"
echo "2. See last working commit: git log --oneline -5"
echo "3. Reset to last working state: git reset --hard c247c27"
echo ""
echo "📖 FOR FULL DETAILS:"
echo "   cat FINAL_PRODUCTION_READY_SYSTEM_STATUS.md"
echo ""
echo "✅ System should now be fully functional!" 