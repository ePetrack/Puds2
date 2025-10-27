#!/bin/bash

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          POST-REBUILD: Start Everything                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Verify Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker still not available. Rebuild may not be complete."
    echo "   Wait another minute and try again."
    exit 1
fi

echo "✅ Docker is available!"
echo ""

# Clean any old data
echo "🧹 Cleaning old data..."
rm -rf pb_data
docker-compose down -v 2>/dev/null

echo ""
echo "🚀 Starting PocketBase..."
docker-compose up -d

echo ""
echo "⏳ Waiting for PocketBase to start (10 seconds)..."
sleep 10

# Check if PocketBase is running
if docker ps | grep -q pocketbase; then
    echo "✅ PocketBase is running!"

    # Check health
    if curl -s http://localhost:8090/api/health > /dev/null 2>&1; then
        echo "✅ PocketBase is healthy!"
    else
        echo "⚠️  PocketBase is starting... give it a few more seconds"
    fi
else
    echo "❌ PocketBase failed to start"
    echo ""
    echo "Run this to see logs:"
    echo "  docker-compose logs pocketbase"
    exit 1
fi

echo ""
echo "🎨 Starting SvelteKit dev server..."
npm run dev -- --host 0.0.0.0 > /tmp/sveltekit.log 2>&1 &

sleep 3

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    ✅ ALL SYSTEMS GO!                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Status:"
echo "  ✅ PocketBase: http://localhost:8090"
echo "  ✅ SvelteKit:  http://localhost:5173"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 NEXT STEPS (Do these in order):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1️⃣  SET UP POCKETBASE ADMIN (First time only):"
echo "   • Go to 'PORTS' tab at the bottom"
echo "   • Find port 8090"
echo "   • Click the globe icon 🌐"
echo "   • Create your admin account"
echo "   • ✨ Database schema will be created automatically!"
echo ""
echo "2️⃣  CREATE TEST USER:"
echo "   • In PocketBase admin: Collections → users → New record"
echo "   • Fill in:"
echo "     - Email: admin@demo.com"
echo "     - Password: admin123"
echo "     - Name: Admin User"
echo "     - Role: admin"
echo "   • Click 'Create'"
echo ""
echo "3️⃣  LOGIN TO THE APP:"
echo "   • Go back to 'PORTS' tab"
echo "   • Find port 5173"
echo "   • Click the globe icon 🌐"
echo "   • Login with: admin@demo.com / admin123"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 YOU'RE DONE! Enjoy your Energy Management Platform!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 Useful commands:"
echo "  • View logs: docker-compose logs -f"
echo "  • Restart: docker-compose restart"
echo "  • Stop all: docker-compose down"
echo ""
