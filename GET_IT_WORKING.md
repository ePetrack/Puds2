# GET IT WORKING - SIMPLE STEPS

## The Problem
Your Codespace has network restrictions that block downloads. We need Docker.

## THE FIX (2 minutes)

### Step 1: Rebuild Codespace to Enable Docker

1. **Press `Ctrl+Shift+P`** (or `Cmd+Shift+P` on Mac)
2. **Type**: `rebuild`
3. **Select**: "Codespaces: Rebuild Container"
4. **Click**: "Rebuild"
5. **Wait 2-3 minutes** for rebuild to complete

### Step 2: Start Everything

Once rebuild is done, run this **ONE command**:

```bash
docker-compose up -d && sleep 3 && npm run dev -- --host 0.0.0.0 > /tmp/sveltekit.log 2>&1 &
```

### Step 3: Set Up PocketBase (First Time Only)

1. **Go to PORTS tab** (bottom of VS Code)
2. **Find port 8090** → Click the globe icon 🌐
3. **Create admin account** when prompted
4. **That's it!** Schema will be created automatically

### Step 4: Create Test User

1. Still in PocketBase admin
2. Go to: **Collections** → **users** → **New record**
3. Fill in:
   - Email: `admin@demo.com`
   - Password: `admin123`
   - Name: `Admin User`
   - Role: `admin`
4. Click **Create**

### Step 5: Login to App!

1. **Go to PORTS tab**
2. **Find port 5173** → Click globe 🌐
3. **Login** with: `admin@demo.com` / `admin123`
4. **Done!** You're in!

---

## That's It!

After rebuild, just run:
```bash
docker-compose up -d && npm run dev -- --host 0.0.0.0 &
```

Then set up PocketBase admin and create a user. Done!

---

## Having Issues?

### "Docker command not found" after rebuild?
The rebuild didn't complete. Try again or wait a minute and try the docker-compose command again.

### "Port 8090 not appearing"?
Wait 10 seconds, PocketBase takes a moment to start. Run: `docker-compose logs -f pocketbase`

### "Migration error"?
Run: `docker-compose down -v && docker-compose up -d`

This removes old data and starts fresh.

---

## Quick Check

After rebuild, verify Docker works:
```bash
docker --version
```

Should show: Docker version XX.X.X

Then you're good to go!
