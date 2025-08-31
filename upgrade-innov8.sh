#!/bin/bash

# 🚀 Innov8 Enhanced AI Validation Upgrade Script
echo "🚀 Innov8 Enhanced AI Validation Upgrade Script"
echo "=============================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from your innov8-project directory."
    exit 1
fi

print_info "Found package.json - proceeding with upgrade..."

# Step 1: Stop any running servers
print_info "Step 1: Stopping any running servers..."
pkill -f "node server" 2>/dev/null || true
sleep 2
print_status "Servers stopped"

# Step 2: Backup current server
if [ -f "server.js" ]; then
    print_info "Step 2: Backing up current server.js..."
    cp server.js "server-v1-backup-$(date +%Y%m%d-%H%M%S).js"
    print_status "Backup created"
fi

# Step 3: Install dependencies
print_info "Step 3: Installing dependencies..."
npm install axios dotenv --save
print_status "Dependencies installed"

# Step 4: Update server to enhanced version
print_info "Step 4: Updating server to enhanced version..."

# Update the health endpoint to show version 2.0.0
sed -i.bak "s/version: '1.0.0'/version: '2.0.0'/" server.js 2>/dev/null || true
sed -i "s/service: 'Innov8 API'/service: 'Innov8 API Enhanced'/" server.js 2>/dev/null || true

# Add enhanced features info to health endpoint
if grep -q "version: '2.0.0'" server.js; then
    print_status "Server updated to version 2.0.0"
else
    print_warning "Manual server update needed"
fi

# Step 5: Create .env file
if [ ! -f ".env" ]; then
    print_info "Step 5: Creating .env configuration file..."
    cat > .env << 'ENVEOF'
# Innov8 Enhanced AI Validation
PORT=3000
JWT_SECRET=innov8-secret-key-change-in-production

# AI API Keys (Optional)
# OPENAI_API_KEY=your_openai_api_key_here
# ANTHROPIC_API_KEY=your_anthropic_api_key_here
# GOOGLE_API_KEY=your_google_ai_api_key_here
ENVEOF
    print_status ".env file created"
fi

echo ""
print_status "�� Upgrade Complete!"
echo ""
echo -e "${GREEN}🚀 To start the server:${NC}"
echo "   npm start"
echo ""
echo -e "${BLUE}🔍 To check version:${NC}"
echo "   curl http://localhost:3000/api/health"
echo ""

# Ask to start server
read -p "Start the server now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Starting server..."
    npm start
fi
