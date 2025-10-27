# Windows Setup Guide

Quick guide to run the Energy Management Platform on Windows.

## Prerequisites

- **Node.js v18+** - Download from https://nodejs.org
- **Git** (if you don't have the code yet)

## Setup Steps

### 1. Download PocketBase

1. Go to: https://github.com/pocketbase/pocketbase/releases/latest
2. Download: `pocketbase_[version]_windows_amd64.zip`
3. Extract `pocketbase.exe` to your project root folder (same folder as `package.json`)

### 2. Install Dependencies

Open PowerShell or Command Prompt in the project folder:

```bash
npm install
```

### 3. Start the Application

Simply double-click `start.bat` or run:

```bash
start.bat
```

This will:
- Start PocketBase backend on http://127.0.0.1:8090
- Start SvelteKit frontend on http://localhost:5173

## First Time Setup

### Create Admin Account

1. Open http://127.0.0.1:8090/_/ in your browser
2. You'll be prompted to create an admin account
3. Enter your email and password

### Set Up Schema (One Time Only)

After creating your admin account:

1. Go to **Settings** → **Import collections**
2. You can set up collections manually, or I can help you import the schema

## Troubleshooting

### Port Already in Use

If port 8090 or 5173 is already in use:

**Kill processes on those ports:**
```powershell
# PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 8090).OwningProcess | Stop-Process
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process
```

### PocketBase Not Starting

- Make sure `pocketbase.exe` is in the project root folder
- Check Windows Firewall isn't blocking it
- Try running `pocketbase.exe serve` manually to see any error messages

### Frontend Not Connecting to Backend

- Make sure both servers are running
- Check `.env` file has `VITE_POCKETBASE_URL=http://127.0.0.1:8090`
- Restart both servers

## Manual Start (Alternative)

If `start.bat` doesn't work, you can start manually:

**Terminal 1 - Start PocketBase:**
```bash
pocketbase.exe serve
```

**Terminal 2 - Start Frontend:**
```bash
npm run dev
```

## Stopping the Application

Press `Ctrl+C` in the terminal to stop both servers.

## What's Running?

- **Frontend**: http://localhost:5173 - Your SvelteKit application
- **Backend**: http://127.0.0.1:8090 - PocketBase REST API
- **Admin UI**: http://127.0.0.1:8090/_/ - PocketBase admin dashboard
