#!/bin/bash

echo "🔄 Resetting PocketBase Database..."
echo "========================================="
echo ""
echo "⚠️  WARNING: This will DELETE ALL DATA!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Cancelled."
    exit 0
fi

echo ""
echo "Stopping PocketBase..."

# Stop PocketBase process
pkill -f pocketbase 2>/dev/null && echo "✅ Stopped PocketBase process"

# Stop Docker container if running
if command -v docker >/dev/null 2>&1; then
    docker-compose down 2>/dev/null && echo "✅ Stopped Docker containers"
fi

echo ""
echo "Removing old database..."

# Remove pb_data directory
if [ -d "pb_data" ]; then
    rm -rf pb_data
    echo "✅ Removed pb_data directory"
else
    echo "ℹ️  No pb_data directory found"
fi

# Remove Docker volume if exists
if command -v docker >/dev/null 2>&1; then
    docker volume rm puds2_pb_data 2>/dev/null && echo "✅ Removed Docker volume"
fi

echo ""
echo "Temporarily disabling migrations..."

# Backup migrations
if [ -d "pb_migrations" ] && [ ! -d "pb_migrations_backup" ]; then
    mv pb_migrations pb_migrations_backup
    echo "✅ Backed up migrations to pb_migrations_backup"
fi

echo ""
echo "========================================="
echo "✅ Reset Complete!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Start PocketBase:"
echo "   Manual: ./pocketbase serve --http=127.0.0.1:8090"
echo "   Docker: docker-compose up -d pocketbase"
echo ""
echo "2. Open PocketBase Admin: http://localhost:8090/_/"
echo ""
echo "3. Create admin account"
echo ""
echo "4. Set up schema using ONE of these methods:"
echo "   a) Import pb_schema.json (if available)"
echo "   b) Follow MIGRATION_FIX.md for manual setup"
echo "   c) Restore migrations: mv pb_migrations_backup pb_migrations"
echo ""
echo "5. Create test user:"
echo "   - Email: admin@demo.com"
echo "   - Password: admin123"
echo "   - Role: admin"
echo ""
echo "6. Login to app: http://localhost:5173"
echo ""
