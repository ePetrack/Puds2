# Fix: Migration Constraint Error

## The Problem

You're getting: `UNIQUE constraint failed: _collections.name`

This happens because:
1. PocketBase already has a built-in `users` collection
2. The migration tries to create another one
3. This causes a conflict

---

## **Solution 1: Fresh Start (Recommended)**

The easiest way is to start with a clean database:

### Step 1: Stop PocketBase
```bash
pkill pocketbase
# Or if using Docker:
docker-compose down
```

### Step 2: Remove old database
```bash
rm -rf pb_data
# Or if using Docker:
docker volume rm puds2_pb_data
```

### Step 3: Disable the problematic migration temporarily
```bash
mv pb_migrations pb_migrations_backup
```

### Step 4: Start PocketBase
```bash
# Manual:
./pocketbase serve --http=127.0.0.1:8090

# Or Docker:
docker-compose up -d pocketbase
```

### Step 5: Set up via Admin UI

1. **Access PocketBase Admin**:
   - Go to `http://localhost:8090/_/`
   - Create your admin account

2. **Import the schema** (I'll create an import file for you):
   - Go to Settings → Import collections
   - Use the `pb_schema.json` file (created below)

---

## **Solution 2: Manual Collection Creation**

If you prefer to create collections manually:

### 1. Users Collection
The `users` collection already exists! Just add these fields:

- **name** (Text, required)
- **role** (Select, required)
  - Values: admin, consultant, client
- **avatar** (File, optional)
  - Max size: 5MB
  - Types: image/jpeg, image/png, image/webp

### 2. Clients Collection
Create new collection `clients`:

Fields:
- **name** (Text, required)
- **contact_name** (Text)
- **contact_email** (Email)
- **contact_phone** (Text)
- **address** (Text)
- **city** (Text)
- **state** (Text)
- **zip** (Text)
- **contract_start_date** (Date)
- **contract_end_date** (Date)
- **contract_value** (Number)
- **status** (Select, required): active, inactive, prospective
- **notes** (Editor)
- **user** (Relation → users)

### 3. Buildings Collection
Create new collection `buildings`:

Fields:
- **client** (Relation → clients, required, cascade delete)
- **name** (Text, required)
- **square_footage** (Number)
- **building_type** (Select): academic, administrative, residential, laboratory, athletic, library, healthcare, dining, other
- **year_built** (Number)
- **address** (Text)
- **floors** (Number)
- **occupancy** (Number)
- **notes** (Editor)

### 4. Projects Collection
Create new collection `projects`:

Fields:
- **client** (Relation → clients, required, cascade delete)
- **name** (Text, required)
- **description** (Editor)
- **status** (Select, required): planning, approved, in_progress, completed, on_hold, cancelled
- **start_date** (Date)
- **end_date** (Date)
- **budget** (Number)
- **actual_cost** (Number)
- **expected_annual_savings** (Number)
- **actual_annual_savings** (Number)
- **roi_years** (Number)
- **buildings** (Relation → buildings, multiple)
- **assigned_to** (Relation → users, multiple)

### 5. Energy Data Collection
Create new collection `energy_data`:

Fields:
- **building** (Relation → buildings, required, cascade delete)
- **timestamp** (Date, required)
- **usage_kwh** (Number)
- **cost** (Number)
- **fuel_type** (Select, required): electricity, natural_gas, fuel_oil, steam, chilled_water, propane, other
- **meter_id** (Text)
- **reading_type** (Select): actual, estimated, calculated
- **demand_kw** (Number)

### 6-10. Other Collections
(See backup migration file for full schema if needed)

---

## **Solution 3: Use Schema Import File**

I'll create a schema export file that you can import directly.

---

## **After Setup: Create Test User**

Once your schema is set up:

1. Go to Collections → users
2. Click "New record"
3. Fill in:
   - **email**: admin@demo.com
   - **password**: admin123
   - **name**: Admin User
   - **role**: admin
4. Click "Create"
5. Now you can login to the app!

---

## **Verification**

After setup, verify everything works:

```bash
# Check PocketBase is running
curl http://localhost:8090/api/health

# Should return: {"code":200,"message":"API is healthy","data":{}}

# Check collections exist
curl http://localhost:8090/api/collections

# You should see: users, clients, buildings, projects, energy_data, etc.
```

---

## **Prevention**

To avoid this in the future:

1. Always start with clean `pb_data` directory
2. Or use PocketBase admin UI for schema changes
3. Or use the import/export feature for schema management

---

## **Quick Commands**

```bash
# Clean start (removes all data!)
rm -rf pb_data
./pocketbase serve --http=127.0.0.1:8090

# Or with Docker:
docker-compose down -v
docker-compose up -d
```

---

## **Next Steps**

After fixing the schema:
1. Create admin account in PocketBase UI
2. Create test user (admin@demo.com / admin123)
3. Login to the app at http://localhost:5173
4. Start using the platform!
