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

echo -e "${BLUE}🚀 Pleasant Cove Design - WebsiteWizard Launcher${NC}"
echo -e "${BLUE}===============================================${NC}"

# Kill any existing processes on port 5173
echo -e "${YELLOW}🔧 Cleaning up existing processes...${NC}"
pkill -f "tsx server" 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Wait for cleanup
sleep 2

# Start the unified server (React + API)
echo -e "${YELLOW}🚀 Starting WebsiteWizard on port 5173...${NC}"
npm run server &
SERVER_PID=$!

# Wait for server to start
echo -e "${YELLOW}⏳ Waiting for server to initialize...${NC}"
sleep 8

# Test if server is running
if curl -s http://localhost:5173/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is running successfully!${NC}"
    echo -e "${GREEN}📍 WebsiteWizard: http://localhost:5173${NC}"
    echo -e "${GREEN}🔗 API Endpoints: http://localhost:5173/api/*${NC}"
    echo -e "${GREEN}🎯 Webhook URL: http://localhost:5173/api/new-lead${NC}"
    echo ""
    echo -e "${BLUE}📋 Quick Access:${NC}"
    echo -e "${BLUE}• Main Dashboard: http://localhost:5173${NC}"
    echo -e "${BLUE}• Leads Page: http://localhost:5173 (click Leads tab)${NC}"
    echo -e "${BLUE}• Progress Tracker: http://localhost:5173 (click Progress tab)${NC}"
    echo ""
    
    # Open the application in default browser
    echo -e "${YELLOW}🌐 Opening WebsiteWizard in your browser...${NC}"
    open http://localhost:5173
    
    echo -e "${GREEN}🎉 WebsiteWizard is ready! Happy lead management!${NC}"
    echo -e "${YELLOW}💡 Press Ctrl+C in terminal to stop the server${NC}"
    
    # Keep the script running so user can see the output
    wait $SERVER_PID
else
    echo -e "${RED}❌ Failed to start server on port 5173${NC}"
    echo -e "${RED}Please check for errors above and try again${NC}"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi 