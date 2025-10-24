#!/bin/bash

echo "🔧 Starting servers..."

# Start PocketBase in the background
if [ -f "./pocketbase" ]; then
  echo "🗄️  Starting PocketBase on port 8090..."
  ./pocketbase serve --http=127.0.0.1:8090 > /tmp/pocketbase.log 2>&1 &
  echo "✅ PocketBase started (logs: /tmp/pocketbase.log)"
fi

# Wait a moment for PocketBase to start
sleep 2

# Start SvelteKit dev server in the background
echo "🎨 Starting SvelteKit dev server on port 5173..."
npm run dev -- --host 0.0.0.0 > /tmp/sveltekit.log 2>&1 &
echo "✅ SvelteKit dev server started (logs: /tmp/sveltekit.log)"

echo ""
echo "✨ Both servers are running!"
echo ""
echo "📱 Access your application:"
echo "  • SvelteKit App: http://localhost:5173"
echo "  • PocketBase Admin: http://localhost:8090/_/"
echo ""
echo "📋 View logs:"
echo "  • PocketBase: tail -f /tmp/pocketbase.log"
echo "  • SvelteKit: tail -f /tmp/sveltekit.log"
echo ""
