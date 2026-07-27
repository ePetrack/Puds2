# Energy & Utility Management Platform

A production-grade web application for energy management consultancies serving universities:
client and building portfolio management today; energy data, utility bills, and analytics in
upcoming milestones.

**Stack:** SvelteKit (Svelte 5) full-stack · PostgreSQL 16 · Drizzle ORM · better-auth ·
Tailwind CSS · Vitest · Playwright · GitHub Actions

See [ARCHITECTURE.md](./ARCHITECTURE.md) for how the pieces fit together,
[docs/adr](./docs/adr) for the reasoning behind the stack, [TODO.md](./TODO.md) for what's
next, and [CLAUDE.md](./CLAUDE.md) for working conventions and known gotchas.

## Quick Start

Prerequisites: **Node.js 20+**, **git**, and **PostgreSQL 16** — either via Docker or
installed directly (see step 3). Verify Node with `node -v`.

```bash
# 1. Get the code
git clone https://github.com/ePetrack/Puds2.git
cd Puds2

# 2. Install dependencies
npm install

# 3. Start PostgreSQL — pick ONE of the two options below (see "Database options")
docker compose up -d db          # Option A: Docker
# ...or Option B: a locally installed Postgres, no Docker required

# 4. Configure environment
cp .env.example .env
# Set a real signing secret (required for login to work). On macOS/Linux:
sed -i.bak "s|^AUTH_SECRET=.*|AUTH_SECRET=$(openssl rand -hex 32)|" .env && rm .env.bak
# On Windows, or by hand: open .env and replace AUTH_SECRET with any long random string.
# The other defaults already match docker-compose — no edits needed.

# 5. Create the schema and demo data
npm run db:migrate
npm run db:seed

# 6. Run the app
npm run dev
```

Then open **http://localhost:5173** and sign in with a seeded account:

| Email              | Password       | Role               |
| ------------------ | -------------- | ------------------ |
| `admin@demo.com`   | `admin123!`    | admin              |
| `sarah@energy.com` | `password123!` | consultant         |
| `viewer@demo.com`  | `viewer123!`   | client (read-only) |

There is no public self-registration; users are provisioned by administrators
(or the seed script).

### Database options

PostgreSQL is the only thing Docker is used for — nothing else in the app needs it.

**Option A — Docker** (matches CI):

```bash
docker compose up -d db
```

Stop it with `docker compose down` (add `-v` to delete the data volume and start fresh).
Requires a running Docker _engine_, not just the CLI — on macOS that means Docker
Desktop, Colima, or OrbStack.

**Option B — Postgres installed directly** (no Docker):

```bash
# macOS (Homebrew). postgresql@16 is keg-only, so it is NOT on your PATH by default:
brew install postgresql@16
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc                 # Intel Macs: /usr/local/opt/postgresql@16/bin
brew services start postgresql@16

# Create the role and database the default DATABASE_URL expects
createuser -s puds
psql postgres -c "ALTER USER puds WITH PASSWORD 'puds';"
createdb -O puds puds_dev
```

Verify before continuing:

```bash
psql postgres://puds:puds@localhost:5432/puds_dev -c '\conninfo'
```

Either way the default `DATABASE_URL` in `.env.example` already matches, so no edits
are needed.

### Troubleshooting

- **`unknown shorthand flag: 'd' in -d`** — the Docker Compose plugin isn't installed, so
  `docker` didn't recognize `compose` as a subcommand. Install Docker Desktop, or
  `brew install docker-compose`, or use the hyphenated `docker-compose up -d db`. Option B
  above avoids Docker entirely.
- **`Cannot connect to the Docker daemon` / `/var/run/docker.sock: no such file`** — the
  Docker CLI is installed but no engine is running. On macOS start Docker Desktop (or
  `colima start`). Again, Option B avoids this.
- **`command not found: psql` / `createdb`** after `brew install postgresql@16` — the
  formula is keg-only; add its `bin` to your PATH (see Option B).
- **`npm run db:migrate` fails to connect** — Postgres may still be starting. With Docker,
  check `docker compose ps` (the `db` service should be `healthy`); with a local install,
  `brew services list`. Then retry.
- **Port 5432 already in use** — another Postgres is running locally. Stop it, or change
  the host port in `docker-compose.yml` (e.g. `'5433:5432'`) and update `DATABASE_URL`
  in `.env` to match.
- **Login fails / "invalid session"** — make sure `AUTH_SECRET` in `.env` is set to a
  real value (step 4), not the `change-me…` placeholder, then restart `npm run dev`.
- **Start over (Docker)** — `docker compose down -v && docker compose up -d db && npm run db:migrate && npm run db:seed`.
- **Start over (local Postgres)** — `dropdb puds_dev && createdb -O puds puds_dev && npm run db:migrate && npm run db:seed`.

## Scripts

| Command                           | Purpose                                                      |
| --------------------------------- | ------------------------------------------------------------ |
| `npm run dev`                     | Dev server with hot reload                                   |
| `npm run build` / `npm start`     | Production build (adapter-node) / run it                     |
| `npm run check`                   | Type-check with svelte-check                                 |
| `npm run lint` / `npm run format` | Prettier + ESLint check / auto-format                        |
| `npm test`                        | Unit & service integration tests (Vitest, needs the test DB) |
| `npm run test:e2e`                | End-to-end tests (Playwright, needs build + seeded DB)       |
| `npm run db:generate`             | Generate a migration from schema changes                     |
| `npm run db:migrate`              | Apply pending migrations                                     |
| `npm run db:seed`                 | Idempotent demo data                                         |

## Testing

Unit/integration tests run against a real PostgreSQL test database
(`puds_test` by default — override with `DATABASE_URL_TEST`):

```bash
docker compose exec db psql -U puds -d puds_dev -c 'CREATE DATABASE puds_test;'
DATABASE_URL=postgres://puds:puds@localhost:5432/puds_test npm run db:migrate
npm test
```

End-to-end tests run against the production build backed by the seeded dev database:

```bash
npm run db:migrate && npm run db:seed && npm run build
npm run test:e2e
```

Note: the e2e suite creates records in `puds_dev` (clients, campuses, meters, …) and
leaves them behind, so your dev data will accumulate `E2E …` rows. Reset with
`docker compose down -v && docker compose up -d db && npm run db:migrate && npm run db:seed`.

CI (GitHub Actions) runs the full gate on every push: lint → typecheck → unit tests →
build → e2e.

## Environment Variables

See [.env.example](./.env.example). Required: `DATABASE_URL`, `AUTH_SECRET`, `ORIGIN`.

## Roadmap

- **M1 — Foundation** ✅ Postgres + migrations, auth + RBAC, audit logging, clients &
  buildings CRUD, tests, CI
- **M2 — Utility management** ✅ providers, accounts, meters, rate schedules, bills with
  anomaly detection, workflow, CSV import, spend dashboard
- **M3 — Energy data** ✅ projects with budgets/savings and building scope, meter readings
  with monthly usage trends and CSV import
- **M4 — Analytics & documents** ✅ Perspective.js interactive analysis over bills and
  readings, document storage with streaming downloads, task tracking
- **M5 — Physical hierarchy** ✅ campuses and complexes under clients, building
  parentage, complex master meters, and parent/child submeters with type & cycle
  validation
- **Navigation rework** ✅ task-oriented sidebar (Home · Bills · Utility Accounts · Plants ·
  Facilities), a `/facilities` hub over the hierarchy, and a `/plants` placeholder
- **M6 — Hardening**: rate limiting, metrics, backup/restore, deployment guide

Open work — including known issues — is tracked in [TODO.md](./TODO.md).

## License

MIT
