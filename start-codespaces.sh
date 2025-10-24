#!/bin/bash

echo "🚀 Energy Management Platform - Codespaces Startup"
echo "=================================================="
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    netstat -tuln 2>/dev/null | grep -q ":$1 " || lsof -i ":$1" >/dev/null 2>&1
}

# Check Node.js
if command_exists node; then
    echo "✅ Node.js $(node -v) installed"
else
    echo "❌ Node.js not found!"
    exit 1
fi

# Check npm packages
if [ -d "node_modules" ]; then
    echo "✅ npm packages installed"
else
    echo "📦 Installing npm packages..."
    npm install
fi

# Check .env file
if [ -f ".env" ]; then
    echo "✅ .env file exists"
else
    echo "📝 Creating .env file..."
    cat > .env << 'EOF'
VITE_POCKETBASE_URL=http://127.0.0.1:8090
VITE_APP_NAME=Energy Management Platform
VITE_APP_VERSION=1.0.0
VITE_ENABLE_DARK_MODE=true
VITE_ENABLE_REPORTS=true
EOF
    echo "✅ .env file created"
fi

echo ""
echo "🔍 Checking for PocketBase..."
echo "=================================================="

# Check for Docker
if command_exists docker; then
    echo "✅ Docker is available"
    echo "📦 Starting PocketBase with Docker..."

    if [ -f "docker-compose.yml" ]; then
        docker-compose up -d pocketbase 2>/dev/null || docker compose up -d pocketbase

        if [ $? -eq 0 ]; then
            echo "✅ PocketBase container started"
            echo "⏳ Waiting for PocketBase to be ready..."
            sleep 3

            if curl -s http://localhost:8090/api/health >/dev/null 2>&1; then
                echo "✅ PocketBase is running and healthy!"
            else
                echo "⚠️  PocketBase container started but not responding yet"
                echo "   It may take a few more seconds..."
            fi
        else
            echo "❌ Failed to start Docker container"
            echo "   Try: docker-compose up -d"
        fi
    else
        echo "❌ docker-compose.yml not found"
    fi

elif [ -f "./pocketbase" ]; then
    echo "✅ PocketBase binary found"
    echo "🗄️  Starting PocketBase..."

    if port_in_use 8090; then
        echo "✅ PocketBase already running on port 8090"
    else
        chmod +x pocketbase
        ./pocketbase serve --http=127.0.0.1:8090 > /tmp/pocketbase.log 2>&1 &
        sleep 2

        if port_in_use 8090; then
            echo "✅ PocketBase started successfully"
        else
            echo "❌ Failed to start PocketBase"
            echo "   Check logs: tail -f /tmp/pocketbase.log"
        fi
    fi

else
    echo "❌ PocketBase not found"
    echo ""
    echo "⚠️  SETUP REQUIRED:"
    echo "   Option 1 (Recommended): Rebuild this Codespace to enable Docker"
    echo "     • Press Ctrl+Shift+P (or Cmd+Shift+P)"
    echo "     • Type: 'Codespaces: Rebuild Container'"
    echo "     • After rebuild, run: docker-compose up -d"
    echo ""
    echo "   Option 2: Manually upload PocketBase binary"
    echo "     • Download from: https://pocketbase.io"
    echo "     • Upload pocketbase file to this directory"
    echo "     • Run: chmod +x pocketbase && ./pocketbase serve"
    echo ""
    echo "   For now, only the frontend will start (you'll see connection errors)"
    echo ""
fi

echo ""
echo "🎨 Starting SvelteKit Dev Server..."
echo "=================================================="

if port_in_use 5173; then
    echo "✅ SvelteKit already running on port 5173"
else
    npm run dev -- --host 0.0.0.0 > /tmp/sveltekit.log 2>&1 &
    echo "⏳ Starting dev server..."
    sleep 3

    if port_in_use 5173; then
        echo "✅ SvelteKit started successfully"
    else
        echo "⚠️  SvelteKit may still be starting..."
        echo "   Check logs: tail -f /tmp/sveltekit.log"
    fi
fi

echo ""
echo "=================================================="
echo "✨ Startup Complete!"
echo "=================================================="
echo ""

# Check final status
echo "📊 Current Status:"
if port_in_use 5173; then
    echo "  ✅ SvelteKit: http://localhost:5173"
else
    echo "  ❌ SvelteKit: Not running"
fi

if port_in_use 8090; then
    echo "  ✅ PocketBase: http://localhost:8090"
else
    echo "  ❌ PocketBase: Not running (see setup instructions above)"
fi

echo ""
echo "📋 Next Steps:"
echo "  1. Go to PORTS tab at the bottom"
echo "  2. Click the globe icon (🌐) next to port 5173"
echo "  3. If PocketBase is running, also open port 8090"
echo "  4. Set up PocketBase admin account (first time only)"
echo "  5. Create test user: admin@demo.com / admin123"
echo ""
echo "📚 Documentation:"
echo "  • README.md - Full instructions"
echo "  • TROUBLESHOOTING.md - Fix common issues"
echo "  • CODESPACES.md - Codespaces guide"
echo ""
echo "🔧 Useful Commands:"
echo "  • View logs: tail -f /tmp/*.log"
echo "  • Restart: bash start-codespaces.sh"
echo "  • Stop all: pkill pocketbase vite"
echo ""
