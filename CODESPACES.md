# Running in GitHub Codespaces

## Quick Start (Automated Setup)

The easiest way to preview and develop this application is using GitHub Codespaces. Everything is configured to work automatically!

### Steps:

1. **Open in Codespaces**
   - Go to the GitHub repository
   - Click the green "Code" button
   - Select "Codespaces" tab
   - Click "Create codespace on [branch-name]"

2. **Wait for Setup** (2-3 minutes)
   - Codespace will automatically:
     - Install Node.js dependencies
     - Download and set up PocketBase
     - Start both servers (SvelteKit + PocketBase)
   - You'll see progress in the terminal

3. **Access the Application**
   - A notification will appear: "Your application is running on port 5173"
   - Click "Open in Browser" to view the app
   - The SvelteKit dev server will be running at `http://localhost:5173`

4. **Set Up PocketBase Admin** (First Time Only)
   - Click the "PORTS" tab at the bottom of VS Code
   - Find port `8090` (PocketBase Admin)
   - Click the globe icon 🌐 to open PocketBase admin panel
   - Create your admin account when prompted
   - Database schema will be created automatically from migrations

5. **Create Your First User**

   Option A - Via PocketBase Admin:
   - In PocketBase admin, go to "Collections" > "users"
   - Click "New record"
   - Fill in:
     - Email: `admin@demo.com`
     - Password: `admin123`
     - Name: `Admin User`
     - Role: `admin`
   - Click "Create"

   Option B - Via the app:
   - Go to the login page
   - Click "Register" (if available)
   - Or use demo credentials if pre-created

6. **Start Using the Platform!**
   - Navigate to http://localhost:5173
   - Log in with your credentials
   - Explore the dashboard, clients, projects, buildings, and analysis features

## What's Included

The Codespaces environment includes:

- ✅ Node.js 20
- ✅ All npm dependencies pre-installed
- ✅ PocketBase 0.22.0 (auto-downloaded)
- ✅ VS Code extensions for Svelte, Tailwind, ESLint
- ✅ Auto-formatting on save
- ✅ Port forwarding configured (5173, 8090)
- ✅ Both servers started automatically

## Port Configuration

| Port | Service | Description | Auto-Open |
|------|---------|-------------|-----------|
| 5173 | SvelteKit | Frontend dev server | ✅ Yes |
| 8090 | PocketBase | Backend API + Admin | ❌ Manual |

## Viewing Logs

If you need to debug or see what's happening:

```bash
# View SvelteKit logs
tail -f /tmp/sveltekit.log

# View PocketBase logs
tail -f /tmp/pocketbase.log

# Or view in real-time
tail -f /tmp/*.log
```

## Restarting Servers

If you need to restart the servers:

```bash
# Stop all servers
pkill -f pocketbase
pkill -f vite

# Restart servers
bash .devcontainer/start-servers.sh
```

Or restart just one:

```bash
# Restart SvelteKit only
pkill -f vite
npm run dev -- --host 0.0.0.0 > /tmp/sveltekit.log 2>&1 &

# Restart PocketBase only
pkill -f pocketbase
./pocketbase serve --http=127.0.0.1:8090 > /tmp/pocketbase.log 2>&1 &
```

## Manual Setup (If Needed)

If automatic setup doesn't work, you can run manually:

```bash
# Install dependencies
npm install

# Download PocketBase (if not present)
wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.0/pocketbase_0.22.0_linux_amd64.zip
unzip pocketbase_0.22.0_linux_amd64.zip
chmod +x pocketbase

# Start PocketBase
./pocketbase serve --http=127.0.0.1:8090

# In a new terminal, start SvelteKit
npm run dev -- --host 0.0.0.0
```

## Environment Variables

The `.env` file is created automatically with:

```env
VITE_POCKETBASE_URL=http://127.0.0.1:8090
VITE_APP_NAME=Energy Management Platform
VITE_APP_VERSION=1.0.0
VITE_ENABLE_DARK_MODE=true
VITE_ENABLE_REPORTS=true
```

You can modify these values if needed.

## Features You Can Test

Once running in Codespaces, you can:

### Phase 1 - Foundation ✅
- [x] Dashboard with statistics
- [x] Dark mode toggle
- [x] Authentication (login/logout)

### Phase 2 - Core CRUD ✅
- [x] **Clients**: Create, read, update, delete university clients
- [x] **Projects**: Manage energy projects with budgets and ROI
- [x] Client-Project relationships

### Phase 3 - Energy Data & Analysis ✅
- [x] **CSV Import**: Upload energy consumption data
- [x] **Buildings CRUD**: Manage building inventory
- [x] **Analysis**: 6 different Perspective.js views
  - Data Table (interactive grid)
  - Building Comparison (bar chart)
  - Cost Analysis (line chart)
  - Usage Trends (multi-line chart)
  - Demand Profile (area chart)
  - Fuel Breakdown (sunburst chart)
- [x] **Date Range Filters**: Filter data by custom date ranges
- [x] **CSV Export**: Export filtered data

## Sample Data

To test features quickly, you can:

1. **Import Sample CSV**:
   - Go to Energy Data page
   - Download the template CSV (`/static/templates/energy-data-template.csv`)
   - Select a building
   - Upload the CSV file
   - Review and confirm import

2. **Create Test Clients**:
   - Navigate to Clients
   - Click "Add Client"
   - Fill in university information
   - Add contract details

3. **Add Buildings**:
   - Navigate to Buildings
   - Click "Add Building"
   - Select a client
   - Enter building details

4. **Analyze Data**:
   - Go to Analysis page
   - Try different view types
   - Apply date filters
   - Export results

## Troubleshooting

### Port Already in Use

If you see "Port 5173 already in use":
```bash
pkill -f vite
npm run dev -- --host 0.0.0.0
```

### PocketBase Not Responding

If PocketBase isn't working:
```bash
# Check if running
ps aux | grep pocketbase

# Restart it
pkill -f pocketbase
./pocketbase serve --http=127.0.0.1:8090
```

### Can't Access Ports

If port forwarding isn't working:
- Go to the "PORTS" tab at the bottom
- Check that both 5173 and 8090 are listed
- Make sure visibility is set to "Public" or "Private" (not disabled)
- Try clicking the globe icon 🌐 to open in browser

### Build Errors

If you see TypeScript errors:
```bash
npm run check
```

If dependency errors:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Stopping the Codespace

When you're done:

1. **Commit your changes** (if you made any):
   ```bash
   git add .
   git commit -m "Your changes"
   git push
   ```

2. **Stop the Codespace**:
   - Go to GitHub Codespaces page
   - Click the three dots next to your Codespace
   - Select "Stop codespace"

3. **Delete the Codespace** (if you won't use it again):
   - Same menu → "Delete"

## Performance Notes

- **First launch**: 2-3 minutes for full setup
- **Subsequent launches**: 30-60 seconds (dependencies cached)
- **Hot reload**: Changes appear instantly in browser
- **Resource usage**: ~2GB RAM, 2 CPU cores recommended

## VS Code Extensions Included

The Codespace automatically installs:

- **Svelte for VS Code** - Syntax highlighting and IntelliSense
- **Tailwind CSS IntelliSense** - Autocomplete for Tailwind classes
- **ESLint** - Code linting
- **Prettier** - Code formatting (auto-format on save)

## Tips for Development

1. **Use the integrated terminal**: Press `` Ctrl+` `` to open
2. **Multiple terminals**: Click the + button to open more
3. **Split terminal**: Click the split icon
4. **File search**: `Ctrl+P` to quickly find files
5. **Command palette**: `Ctrl+Shift+P` for VS Code commands

## Next Steps

After getting the app running:

1. Explore the codebase in VS Code
2. Make changes and see live updates
3. Test all CRUD operations
4. Import sample energy data
5. Try the Perspective.js analysis views
6. Review the Phase completion docs:
   - `PHASE1_COMPLETE.md`
   - `PHASE2_COMPLETE.md`
   - `PHASE3_COMPLETE.md`

## Support

If you encounter issues:

1. Check the logs (`/tmp/sveltekit.log` and `/tmp/pocketbase.log`)
2. Review the main `README.md` for general troubleshooting
3. Restart the Codespace
4. Create a new Codespace if problems persist

---

**Enjoy developing! 🚀**
