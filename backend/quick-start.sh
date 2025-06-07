#!/bin/bash

echo "🚀 Pleasant Cove Design - Appointment System Setup"
echo "================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "📄 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your email settings!"
else
    echo "✅ .env file already exists"
fi

# Create database directory
mkdir -p data

echo ""
echo "✅ Setup complete!"
echo ""
echo "📖 Next steps:"
echo "   1. Edit .env file with your email settings"
echo "   2. Run 'npm run dev' to start the development server"
echo "   3. Run 'npm run tunnel' in another terminal for ngrok tunnel"
echo "   4. Update your Squarespace widget with the ngrok URL"
echo ""
echo "🔗 For detailed instructions, see README.md" 