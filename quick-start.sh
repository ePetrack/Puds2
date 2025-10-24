#!/bin/bash

echo "🚀 Quick Start - Energy Management Platform"
echo "============================================"
echo ""

# Check if Docker is available
if command -v docker >/dev/null 2>&1; then
    echo "✅ Docker is available!"
    echo ""
    echo "Starting services..."
    docker-compose up -d
    
    echo ""
    echo "⏳ Waiting for PocketBase to start..."
    sleep 5
    
    # Check if PocketBase is running
    if docker ps | grep -q pocketbase; then
        echo "✅ PocketBase is running!"
    else
        echo "⚠️  PocketBase may still be starting..."
    fi
    
    echo ""
    echo "Starting SvelteKit..."
    npm run dev -- --host 0.0.0.0 > /tmp/sveltekit.log 2>&1 &
    sleep 3
    
    echo ""
    echo "============================================"
    echo "✅ ALL DONE!"
    echo "============================================"
    echo ""
    echo "📱 Next Steps:"
    echo ""
    echo "1. Go to PORTS tab (bottom of VS Code)"
    echo "2. Open port 8090 (PocketBase Admin)"
    echo "   - Create admin account"
    echo "   - Schema will be created automatically"
    echo ""
    echo "3. Create test user:"
    echo "   - Collections → users → New record"
    echo "   - Email: admin@demo.com"
    echo "   - Password: admin123"
    echo "   - Role: admin"
    echo ""
    echo "4. Open port 5173 (The App)"
    echo "   - Login with: admin@demo.com / admin123"
    echo ""
    echo "🎉 You're all set!"
    
else
    echo "❌ Docker is NOT available"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔧 FIX REQUIRED: Rebuild Codespace"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "To enable Docker:"
    echo ""
    echo "1. Press: Ctrl+Shift+P (or Cmd+Shift+P)"
    echo "2. Type: rebuild"
    echo "3. Select: 'Codespaces: Rebuild Container'"
    echo "4. Wait 2-3 minutes"
    echo "5. Run this script again: bash quick-start.sh"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "See GET_IT_WORKING.md for detailed instructions"
    exit 1
fi
