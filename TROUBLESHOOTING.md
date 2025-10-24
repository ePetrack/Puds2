# Codespaces Troubleshooting Guide

## Issue: 502 Error / PocketBase Not Running

### Current Status
- ✅ SvelteKit dev server: Running on port 5173
- ❌ PocketBase: Not running (causing 502 errors)

### Root Cause
Network restrictions in your Codespace are blocking direct downloads from GitHub releases.

---

## Solutions

### **Solution 1: Use Docker Compose (Recommended)**

Since the Codespace has Docker-in-Docker configured, rebuild the container:

1. **Rebuild Container**:
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Type: "Codespaces: Rebuild Container"
   - Select it and wait 2-3 minutes

2. **Start PocketBase with Docker**:
   ```bash
   docker-compose up -d pocketbase
   ```

3. **Verify it's running**:
   ```bash
   docker ps
   curl http://localhost:8090/api/health
   ```

4. **Access PocketBase Admin**:
   - Go to PORTS tab at bottom
   - Find port 8090
   - Click globe icon 🌐
   - Create admin account

---

### **Solution 2: Manual PocketBase Setup**

If Docker doesn't work, manually upload PocketBase:

1. **On your local machine**, download PocketBase:
   - Visit: https://pocketbase.io/docs/
   - Download the Linux AMD64 version (v0.22.0)

2. **Upload to Codespace**:
   - In VS Code, drag the `pocketbase` file into the file explorer
   - Drop it in the project root directory

3. **Make it executable and run**:
   ```bash
   chmod +x pocketbase
   ./pocketbase serve --http=127.0.0.1:8090
   ```

---

### **Solution 3: Quick Preview (No Backend)**

View the UI only (you'll see "connection error" messages):

1. **The frontend is already running** on port 5173
2. Go to PORTS tab → Click port 5173 → Open in browser
3. You'll see the login page and UI design
4. Backend features won't work without PocketBase

---

## Verifying Setup

### Check What's Running:
```bash
# Check processes
ps aux | grep -E "(pocketbase|vite|node)"

# Check ports
netstat -tlnp | grep -E "(5173|8090)"

# Test connections
curl http://localhost:5173  # Should return HTML
curl http://localhost:8090/api/health  # Should return {"code":200}
```

### View Logs:
```bash
# SvelteKit logs
tail -f /tmp/sveltekit.log

# PocketBase logs (if running via script)
tail -f /tmp/pocketbase.log

# Docker logs (if using Docker)
docker-compose logs -f pocketbase
```

---

## Quick Commands

### Start Servers:
```bash
# Using Docker (recommended):
docker-compose up -d

# Or manually:
./pocketbase serve --http=127.0.0.1:8090 &
npm run dev -- --host 0.0.0.0
```

### Stop Servers:
```bash
# Docker:
docker-compose down

# Manual:
pkill pocketbase
pkill vite
```

### Restart Everything:
```bash
# Stop all
docker-compose down
pkill pocketbase vite

# Start fresh
docker-compose up -d
npm run dev -- --host 0.0.0.0
```

---

## Testing the Full Stack

Once both servers are running:

1. **Access Frontend**: http://localhost:5173
2. **Access PocketBase Admin**: http://localhost:8090/_/
3. **Create Admin Account** in PocketBase
4. **Create Test User**:
   - Collections → users → New record
   - Email: `admin@demo.com`
   - Password: `admin123`
   - Role: `admin`
5. **Login to App** with test credentials

---

## Common Issues

### Issue: "Connection refused" or 502
**Cause**: PocketBase isn't running
**Fix**: Start PocketBase (see commands above)

### Issue: "Port 5173 already in use"
**Cause**: Multiple dev servers running
**Fix**: `pkill vite && npm run dev -- --host 0.0.0.0`

### Issue: "Cannot download PocketBase"
**Cause**: Network restrictions
**Fix**: Use Docker Compose or manual upload (Solution 1 or 2 above)

### Issue: Docker commands don't work
**Cause**: Container needs Docker feature
**Fix**: Rebuild container (Ctrl+Shift+P → Rebuild Container)

---

## Alternative: Local Development

If Codespaces issues persist, you can develop locally:

1. Clone the repo to your machine
2. Follow README.md instructions
3. Use Docker Compose or manual PocketBase setup
4. Push changes back to GitHub

---

## Current State of Your Codespace

✅ **Working**:
- Node.js and npm installed
- All dependencies installed
- SvelteKit dev server running on port 5173
- .env file configured

❌ **Not Working**:
- PocketBase not running
- Docker not yet activated (requires rebuild)

**Recommended Next Step**: Rebuild container to enable Docker, then run `docker-compose up -d`

---

## Need Help?

Check these files:
- `README.md` - Full setup instructions
- `CODESPACES.md` - Codespaces-specific guide
- `docker-compose.yml` - Docker configuration
- `.devcontainer/devcontainer.json` - Container config

View the Phase 3 completion docs for feature overview:
- `PHASE3_COMPLETE.md`
