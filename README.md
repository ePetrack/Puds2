# Energy & Utility Management Platform

A production-grade web application for energy management consultancies serving universities:
client and building portfolio management today; energy data, utility bills, and analytics in
upcoming milestones.

**Stack:** SvelteKit (Svelte 5) full-stack · PostgreSQL 16 · Drizzle ORM · better-auth ·
Tailwind CSS · Vitest · Playwright · GitHub Actions

See [ARCHITECTURE.md](./ARCHITECTURE.md) for how the pieces fit together and
[docs/adr](./docs/adr) for the reasoning behind the stack.

## Quick Start

Prerequisites: Node.js 20+, Docker (for PostgreSQL).

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL
docker compose up -d db

# 3. Configure environment
cp .env.example .env   # defaults match docker-compose

# 4. Create schema and demo data
npm run db:migrate
npm run db:seed

# 5. Run the app
npm run dev
```

Open http://localhost:5173 and sign in with a seeded account:

| Email              | Password       | Role               |
| ------------------ | -------------- | ------------------ |
| `admin@demo.com`   | `admin123!`    | admin              |
| `sarah@energy.com` | `password123!` | consultant         |
| `viewer@demo.com`  | `viewer123!`   | client (read-only) |

There is no public self-registration; users are provisioned by administrators
(or the seed script).

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

CI (GitHub Actions) runs the full gate on every push: lint → typecheck → unit tests →
build → e2e.

## Environment Variables

See [.env.example](./.env.example). Required: `DATABASE_URL`, `AUTH_SECRET`, `ORIGIN`.

## Roadmap

- **M1 — Foundation** ✅ Postgres + migrations, auth + RBAC, audit logging, clients &
  buildings CRUD, tests, CI
- **M2 — Energy data**: projects, meter/interval data, CSV import pipeline
- **M3 — Utility management**: providers, accounts, meters, rate schedules, bills with
  anomaly detection
- **M4 — Analytics & documents**: Perspective.js analysis, document storage, tasks
- **M5 — Hardening**: rate limiting, metrics, backup/restore, deployment guide

## License

MIT
