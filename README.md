# Energy Management Consultancy Platform

A comprehensive self-hosted web application for managing energy management consultancy services for universities. Built with SvelteKit, PocketBase, and Perspective.js for powerful data analysis.

## Features

- **Client & Project Management** - Track university clients, projects, and contracts
- **Energy Data Analysis** - Import and analyze energy consumption data with interactive Perspective.js visualizations
- **Audit Management** - Schedule and track energy audits
- **Building Inventory** - Maintain detailed building and equipment information
- **Recommendations** - Track energy-saving recommendations with ROI calculations
- **Custom Reports** - Generate PDF reports from templates
- **Custom SQL Views** - Create and save custom database queries
- **Task Management** - Assign and track action items
- **Document Management** - Store and organize files
- **Role-Based Access** - Admin, Consultant, and Client roles

## Tech Stack

- **Frontend**: SvelteKit + TypeScript + Tailwind CSS
- **Backend**: PocketBase (SQLite + REST API + Auth)
- **Data Analysis**: Perspective.js with drag-and-drop pivoting
- **Charts**: Chart.js
- **Data Manipulation**: Arquero
- **Forms**: Zod validation
- **PDF Generation**: Playwright (planned)

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (optional, recommended)

## Quick Start

### Option 1: Docker (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd Puds2
```

2. Start PocketBase:
```bash
docker-compose up -d
```

3. Install dependencies and start the dev server:
```bash
npm install
npm run dev
```

4. Open http://localhost:5173

5. Access PocketBase admin at http://localhost:8090/_/

### Option 2: Manual Setup

1. Download PocketBase:
```bash
# Linux/Mac
wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.0/pocketbase_0.22.0_linux_amd64.zip
unzip pocketbase_0.22.0_linux_amd64.zip
chmod +x pocketbase

# Or visit https://pocketbase.io/docs/ for other platforms
```

2. Start PocketBase:
```bash
./pocketbase serve
```

3. In a new terminal, install dependencies and start dev server:
```bash
npm install
npm run dev
```

4. Open http://localhost:5173

## Initial Setup

### 1. PocketBase Admin Setup

1. Visit http://localhost:8090/_/
2. Create an admin account
3. The database schema will be automatically created from migrations

### 2. Create First User

1. In PocketBase admin, go to "Collections" > "users"
2. Create a new user record with:
   - Email: admin@demo.com
   - Password: admin123
   - Name: Admin User
   - Role: admin

Or use the login page with demo credentials:
- Email: admin@demo.com
- Password: admin123

## Project Structure

```
Puds2/
├── src/
│   ├── lib/
│   │   ├── components/          # Reusable Svelte components
│   │   │   └── PerspectiveViewer.svelte
│   │   └── pocketbase.ts        # PocketBase client & types
│   ├── routes/
│   │   ├── (app)/              # Protected routes
│   │   │   ├── +layout.svelte  # App layout with sidebar
│   │   │   ├── +page.svelte    # Dashboard
│   │   │   ├── analysis/       # Perspective.js data analysis
│   │   │   ├── clients/        # Client management
│   │   │   ├── projects/       # Project management
│   │   │   └── ...
│   │   └── login/              # Login page
│   ├── app.css                 # Global styles
│   └── app.html                # HTML template
├── pb_migrations/              # PocketBase schema migrations
├── docker-compose.yml          # Docker configuration
├── tailwind.config.js          # Tailwind configuration
└── svelte.config.js           # SvelteKit configuration
```

## Database Schema

### Collections

- **users** - User accounts with roles (admin, consultant, client)
- **clients** - University information and contracts
- **buildings** - Building details (square footage, type, year built)
- **projects** - Energy management projects with budgets and ROI
- **audits** - Energy audit records
- **energy_data** - Time-series energy consumption data
- **recommendations** - Energy-saving recommendations with ROI
- **equipment** - HVAC and equipment inventory
- **documents** - File attachments
- **tasks** - Action items and assignments
- **custom_views** - Saved Perspective configurations and SQL queries

## Development

### Run Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
npm run preview
```

### Type Checking

```bash
npm run check
```

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_POCKETBASE_URL=http://127.0.0.1:8090
VITE_APP_NAME=Energy Management Platform
VITE_APP_VERSION=1.0.0
VITE_ENABLE_DARK_MODE=true
VITE_ENABLE_REPORTS=true
```

## Features Roadmap

### Phase 1: Foundation ✅
- [x] SvelteKit setup with TypeScript and Tailwind
- [x] PocketBase schema and authentication
- [x] Main layout and navigation
- [x] Perspective.js integration
- [x] Dashboard with stats

### Phase 2: Core CRUD (Next)
- [ ] Clients entity (forms, list, detail views)
- [ ] Projects entity
- [ ] File upload capability
- [ ] Reusable form components
- [ ] Relationship selectors

### Phase 3: Energy Data & Analysis
- [ ] Energy data collection and CSV import
- [ ] Multiple Perspective views (consumption, ROI, comparison)
- [ ] Date range filters
- [ ] Export functionality

### Phase 4: Expand Entities
- [ ] Buildings, Audits, Recommendations
- [ ] Equipment inventory
- [ ] Tasks management
- [ ] Document library

### Phase 5: Advanced Features
- [ ] Custom SQL editor with CodeMirror
- [ ] Save and share SQL views
- [ ] Report templates
- [ ] PDF generation with Playwright

### Phase 6: Polish
- [ ] Enhanced dashboard with Chart.js
- [ ] Global search
- [ ] Command palette (Cmd+K)
- [ ] Dark mode refinements
- [ ] Activity log

## Perspective.js Usage

The Analysis page (`/analysis`) demonstrates Perspective.js integration:

1. **Data Grid View**: Interactive table with drag-and-drop pivoting
2. **Cost Trends**: Line chart showing costs over time
3. **Building Comparison**: Bar chart comparing buildings

### Key Features:
- Drag columns to "Group By" to pivot data
- Click headers to sort
- Right-click for additional options
- Switch between visualization types
- Export to CSV

## Troubleshooting

### PocketBase Connection Issues

If the app can't connect to PocketBase:
1. Ensure PocketBase is running on port 8090
2. Check `VITE_POCKETBASE_URL` in `.env`
3. Verify CORS settings in PocketBase admin

### Perspective.js Not Loading

If Perspective viewer doesn't appear:
1. Check browser console for errors
2. Ensure all Perspective packages are installed
3. Try clearing browser cache

### Build Errors

If you encounter TypeScript errors:
```bash
npm run check
```

If dependencies are missing:
```bash
rm -rf node_modules package-lock.json
npm install
```

## License

MIT License

## Acknowledgments

- [SvelteKit](https://kit.svelte.dev/)
- [PocketBase](https://pocketbase.io/)
- [Perspective.js](https://perspective.finos.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Chart.js](https://www.chartjs.org/)
