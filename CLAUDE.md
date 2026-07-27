# CLAUDE.md

Guidance for Claude Code (and any coding agent) working in this repository.

## What this is

An energy & utility management platform for consultancies serving MUSH (Municipal,
University, School, Hospital) and federal-sector clients. Multi-user by design: consultants
manage portfolios on behalf of clients, with role-based access and an audit trail.

**Stack:** SvelteKit (Svelte 5 runes) · PostgreSQL 16 · Drizzle ORM · better-auth ·
Tailwind · Vitest · Playwright · GitHub Actions.

## Start here

| File                                   | What it tells you                                       |
| -------------------------------------- | ------------------------------------------------------- |
| [`TODO.md`](./TODO.md)                 | What's left, prioritised, with acceptance criteria      |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Layers, auth model, the physical hierarchy, conventions |
| [`docs/adr/`](./docs/adr)              | Why the stack is what it is                             |

## Commands

```bash
npm run dev            # dev server — see the .env gotcha below
npm run build          # production build (adapter-node)
npm run check          # svelte-check typecheck
npm run lint           # prettier --check + eslint
npm run format         # prettier --write
npm test               # Vitest against a real Postgres test DB
npm run test:e2e       # Playwright against the production build
npm run db:generate    # generate a migration from schema changes
npm run db:migrate     # apply pending migrations
npm run db:seed        # idempotent demo data
```

**Gate before pushing:** `npm run lint && npm run check && npm test && npm run test:e2e`.

## Gotchas

- **`npm run dev` does not load `.env`.** Server modules read `process.env` directly, but
  `vite dev` never copies `.env` into it, so you get `AUTH_SECRET is not set` even with a
  valid `.env`. Workaround: `set -a; source .env; set +a` first. Tracked as `ENV-1` in
  `TODO.md` — the fix was proposed once and declined, so **confirm before implementing**.
- **Merged PRs are never reused.** Restart the work branch from the current default branch
  and open a new PR.
- **The default branch is `claude/energy-management-platform-011CUPSdL8PbGn5hfJBRnHLd`**,
  not `main` — a fresh `git clone` lands there. Tracked as `REPO-1`.
- **`npm run test:e2e` writes into `puds_dev`** and leaves `E2E …` rows behind. Tracked as
  `TEST-1`.
- **Postgres features are load-bearing** — enums, `jsonb`, arrays, `gen_random_uuid()`,
  and a check constraint. SQLite is not a drop-in substitute.

## Conventions

- **Routes stay thin**: validate input → call a service → shape the response. No SQL in
  routes.
- **Every mutation writes `audit_log` in the same transaction** as the change, via
  `recordAudit` + `diffRecords` (`src/lib/server/services/audit.ts`).
- **Zod schemas live in `src/lib/schemas/`** and are shared client/server. Use the
  form-friendly helpers in `helpers.ts` — `optionalText`, `optionalNumber`, `optionalDate`,
  `formDataToObject`, `fieldErrors` — so empty form fields become `undefined`.
- **Authorization is server-side.** Write actions call `requireRole(locals.user, WRITE_ROLES)`
  from `src/lib/server/authz.ts`. UI gating alone is never sufficient.
- **Progressive enhancement**: forms work without JavaScript; `use:enhance` upgrades them.
- **Server modules read `process.env`**, not `$env`, so the same code runs under SvelteKit,
  Vitest, and `tsx` scripts.
- Business rules that Zod can't express belong in the service, raised as a typed error the
  route turns into a field error — see `MeterValidationError` in
  `src/lib/server/services/meters.ts`.

## Adding an entity

Follow the existing pattern (campuses/complexes are the most recent example):

1. Table in `src/lib/server/db/schema.ts` → `npm run db:generate` (commit the migration).
2. Zod schema in `src/lib/schemas/<entity>.ts`.
3. Service in `src/lib/server/services/<entity>.ts` — list/get/create/update/delete, each
   mutation writing an audit row.
4. Routes under `src/routes/(app)/<entity>/`.
5. Tests: service specs in `tests/unit/`, a journey in `tests/e2e/`.
6. Seed data in `scripts/seed.ts`, kept idempotent.

## Domain notes

The physical hierarchy is **Client → Campus → Complex → Building → Meter → Submeter**.
Campus and Complex are both optional. A meter's premise is a building **XOR** a complex
(DB check constraint `meters_premise_chk`); a complex meter is the master serving several
buildings. Submeters reference a parent meter and must share its utility type. See
`ARCHITECTURE.md` for the full picture.

A building belongs to **at most one complex**, and membership is optional — a single
nullable `buildings.complex_id`, deliberately not a join table.

Plants and distributed energy resources are **not modeled yet** — `/plants` is an explicit
placeholder. It is decided that plants are **their own asset type** with their own
production data, so don't add them as a `building_type`, a complex flag, or a variant of
`meters`. See `PLANTS-1` in `TODO.md` — one question (what a plant attaches to) is still
open.
