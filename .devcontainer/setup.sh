#!/bin/bash

echo "🚀 Setting up Energy Management Platform..."

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install

# Download PocketBase if not exists
if [ ! -f "./pocketbase" ]; then
  echo "📥 Downloading PocketBase..."
  wget -q https://github.com/pocketbase/pocketbase/releases/download/v0.22.0/pocketbase_0.22.0_linux_amd64.zip
  unzip -q pocketbase_0.22.0_linux_amd64.zip
  rm pocketbase_0.22.0_linux_amd64.zip
  chmod +x pocketbase
  echo "✅ PocketBase downloaded"
else
  echo "✅ PocketBase already exists"
fi

# Create pb_data directory if not exists
mkdir -p pb_data

# Create .env file if not exists
if [ ! -f ".env" ]; then
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

echo "✅ Setup complete!"
echo ""
echo "📚 Next steps:"
echo "  1. Wait for servers to start automatically"
echo "  2. Open the app at http://localhost:5173"
echo "  3. Set up PocketBase admin at http://localhost:8090/_/"
echo ""
