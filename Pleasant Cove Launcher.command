#!/bin/bash

# Pleasant Cove Design - WebsiteWizard Launcher
# Everything runs on port 5173 - React frontend and Express backend unified

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Pleasant Cove Design - Backend UI Launcher${NC}"
echo -e "${BLUE}===========================================${NC}"

# Kill any existing processes on both ports
echo -e "${YELLOW}🔧 Cleaning up existing processes...${NC}"
pkill -f "tsx server" 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Wait for cleanup
sleep 2

# Start ONLY the backend server (port 3000)
echo -e "${YELLOW}🚀 Starting Backend Server ONLY...${NC}"
npm run server &
SERVER_PID=$!

# Wait for backend server to start
echo -e "${YELLOW}⏳ Waiting for backend server to initialize...${NC}"
sleep 5

# Test if backend server is running
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend server is running successfully!${NC}"
    echo -e "${GREEN}📍 Main UI: http://localhost:3000${NC}"
    echo -e "${GREEN}🔗 Backend API: http://localhost:3000/api/*${NC}"
    echo -e "${GREEN}🎯 Webhook URL: http://localhost:3000/api/new-lead${NC}"
    echo ""
    echo -e "${BLUE}📋 Quick Access:${NC}"
    echo -e "${BLUE}• Main Dashboard: http://localhost:3000${NC}"
    echo -e "${BLUE}• Admin Panel: http://localhost:3000${NC}"
    echo ""
    
    # Open the backend UI in default browser
    echo -e "${YELLOW}🌐 Opening backend UI in your browser...${NC}"
    open http://localhost:3000
    
    echo -e "${GREEN}🎉 Backend UI is ready! Dashboard at http://localhost:3000${NC}"
    echo -e "${YELLOW}💡 Press Ctrl+C in terminal to stop the server${NC}"
    
    # Keep the script running so user can see the output
    wait $SERVER_PID
else
    echo -e "${RED}❌ Failed to start backend server${NC}"
    echo -e "${RED}Please check for errors above and try again${NC}"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi 