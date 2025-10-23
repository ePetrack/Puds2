# Getting Started with Energy Management Platform

This guide will help you get the Energy Management Platform up and running on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Docker** and **Docker Compose** (optional, but recommended) - [Download](https://www.docker.com/)

## Installation Steps

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd Puds2
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- SvelteKit
- PocketBase SDK
- Perspective.js
- Tailwind CSS
- Chart.js
- And more...

### Step 3: Start PocketBase

#### Option A: Using Docker (Recommended)

```bash
docker-compose up -d
```

This will start PocketBase in a Docker container on port 8090.

#### Option B: Manual Installation

1. Download PocketBase for your platform:
   - Visit https://pocketbase.io/docs/
   - Or use wget on Linux/Mac:
     ```bash
     wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.0/pocketbase_0.22.0_linux_amd64.zip
     unzip pocketbase_0.22.0_linux_amd64.zip
     chmod +x pocketbase
     ```

2. Start PocketBase:
   ```bash
   ./pocketbase serve
   ```

### Step 4: Configure PocketBase Admin

1. Open your browser and visit: http://localhost:8090/_/

2. Create an admin account:
   - Email: admin@demo.com
   - Password: admin123 (or your preferred password)

3. The database collections will be automatically created from the migration file

### Step 5: Seed Sample Data (Optional but Recommended)

To populate the database with sample data for testing:

1. Install tsx for running TypeScript files:
   ```bash
   npm install -g tsx
   ```

2. Run the seed script:
   ```bash
   npx tsx scripts/seed.ts
   ```

This will create:
- 3 users (admin, 2 consultants)
- 2 clients (State University, Tech College)
- 4 buildings
- 2 projects
- 60+ energy data records (12 months of data)
- 1 audit
- 2 recommendations
- 2 tasks

### Step 6: Start the Development Server

```bash
npm run dev
```

The application will be available at: http://localhost:5173

### Step 7: Log In

Use one of the following credentials:

**Admin Account:**
- Email: admin@demo.com
- Password: admin123

**Consultant Account:**
- Email: sarah@energy.com
- Password: password123

## Exploring the Platform

### Dashboard
Start at the dashboard (http://localhost:5173) to see an overview of:
- Active projects
- Total clients
- Annual savings
- Pending tasks

### Energy Data Analysis
Visit the Analysis page (http://localhost:5173/analysis) to see Perspective.js in action:
- Interactive pivot tables
- Drag-and-drop data analysis
- Multiple visualization types
- Real-time data filtering

### Navigation
Use the sidebar to explore:
- 📊 Dashboard - Overview and quick stats
- 🏢 Clients - University clients
- 📋 Projects - Energy projects
- 🏛️ Buildings - Building inventory
- ⚡ Energy Data - Consumption data
- 🔍 Audits - Energy audits
- ⚙️ Equipment - Equipment inventory
- 📄 Reports - Generate reports
- ✓ Tasks - Task management
- 📁 Documents - File storage
- 📈 Analysis - Perspective.js data analysis

## Development Workflow

### Making Changes

1. Edit files in `src/`
2. The dev server will automatically reload
3. Check the browser console for any errors

### File Structure

```
src/
├── lib/
│   ├── components/          # Reusable Svelte components
│   │   └── PerspectiveViewer.svelte
│   └── pocketbase.ts        # PocketBase client & types
├── routes/
│   ├── (app)/              # Protected routes (requires login)
│   │   ├── +layout.svelte  # App layout with sidebar
│   │   ├── +page.svelte    # Dashboard
│   │   └── analysis/       # Analysis page
│   └── login/              # Login page
└── app.css                 # Global styles
```

### Adding New Features

1. Create new routes in `src/routes/(app)/`
2. Add navigation links in `src/routes/(app)/+layout.svelte`
3. Create reusable components in `src/lib/components/`
4. Update PocketBase types in `src/lib/pocketbase.ts`

## Testing Perspective.js

The Analysis page demonstrates Perspective.js capabilities:

1. **Try the different views:**
   - Consumption Table - Sortable, pivotable data grid
   - Cost Trends - Line chart visualization
   - Building Comparison - Bar chart comparison

2. **Interact with the data:**
   - Drag column names to "Group By" area to pivot
   - Click column headers to sort
   - Right-click for more options
   - Switch between visualization types

3. **Export data:**
   - Click the "Export CSV" button to download data

## Troubleshooting

### Port Already in Use

If port 5173 or 8090 is already in use:

**For SvelteKit (5173):**
```bash
npm run dev -- --port 3000
```

**For PocketBase (8090):**
```bash
./pocketbase serve --http=127.0.0.1:8091
```
Then update `.env` with the new port.

### PocketBase Connection Failed

1. Ensure PocketBase is running: http://localhost:8090/_/
2. Check `.env` file has correct `VITE_POCKETBASE_URL`
3. Try restarting both PocketBase and the dev server

### Perspective.js Not Loading

1. Clear browser cache
2. Check browser console for errors
3. Ensure all npm packages are installed:
   ```bash
   npm install
   ```

### TypeScript Errors

Run type checking:
```bash
npm run check
```

## Next Steps

Now that you have the platform running:

1. **Explore the sample data** - Navigate through clients, projects, and buildings
2. **Try the Analysis page** - Experiment with Perspective.js visualizations
3. **Create new records** - Add your own clients, buildings, or projects
4. **Import energy data** - (Coming in Phase 3) Upload CSV files with energy data
5. **Generate reports** - (Coming in Phase 6) Create PDF reports

## Need Help?

- Check the main README.md for detailed documentation
- Review the PocketBase docs: https://pocketbase.io/docs/
- Review SvelteKit docs: https://kit.svelte.dev/docs
- Review Perspective docs: https://perspective.finos.org/

## What's Next?

This is Phase 1 of the project. Upcoming features include:

- **Phase 2**: Full CRUD interfaces for all entities
- **Phase 3**: CSV import, advanced Perspective views
- **Phase 4**: Equipment tracking, recommendations
- **Phase 5**: Custom SQL editor, report generation
- **Phase 6**: Dashboard enhancements, search, command palette

Happy exploring! 🚀
