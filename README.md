# Energy & Utility Management Platform

A production-grade web application for energy management consultancies serving universities:
client and building portfolio management today; energy data, utility bills, and analytics in
upcoming milestones.

**Stack:** SvelteKit (Svelte 5) full-stack · PostgreSQL 16 · Drizzle ORM · better-auth ·
Tailwind CSS · Vitest · Playwright · GitHub Actions

See [ARCHITECTURE.md](./ARCHITECTURE.md) for how the pieces fit together and
[docs/adr](./docs/adr) for the reasoning behind the stack.

## Quick Start

Prerequisites: **Node.js 20+**, **Docker** (for PostgreSQL), and **git**. Verify with
`node -v` (should print v20 or newer) and `docker --version`.

```bash
# 1. Get the code
git clone https://github.com/ePetrack/Puds2.git
cd Puds2

# The newest work (M4 analytics/documents/tasks, M5 campuses/complexes/submeters)
# lives on this branch until its PR merges. Skip if you only want the merged base.
git checkout claude/utility-management-software-1qcj88

# 2. Install dependencies
npm install

# 3. Start PostgreSQL (runs in the background; the DB is named puds_dev)
docker compose up -d db

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

To stop the database when you're done: `docker compose down` (add `-v` to also
delete the data volume and start fresh).

### Troubleshooting

- **`npm run db:migrate` fails to connect** — Postgres may still be starting. Check
  `docker compose ps` (the `db` service should be `healthy`), then retry.
- **Port 5432 already in use** — another Postgres is running locally. Stop it, or change
  the host port in `docker-compose.yml` (e.g. `'5433:5432'`) and update `DATABASE_URL`
  in `.env` to match.
- **Login fails / "invalid session"** — make sure `AUTH_SECRET` in `.env` is set to a
  real value (step 4), not the `change-me…` placeholder, then restart `npm run dev`.
- **Start over** — `docker compose down -v && docker compose up -d db && npm run db:migrate && npm run db:seed`.

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
- **M6 — Hardening**: rate limiting, metrics, backup/restore, deployment guide

## License

MIT
