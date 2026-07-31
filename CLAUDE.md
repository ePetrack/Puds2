# CLAUDE.md

Guidance for Claude Code (and any coding agent) working in this repository.

## What this is

An energy & utility management platform for consultancies serving MUSH (Municipal,
University, School, Hospital) and federal-sector clients. Multi-user by design: consultants
manage portfolios on behalf of clients, with role-based access and an audit trail.

**Stack:** SvelteKit (Svelte 5 runes) · PostgreSQL 16 · Drizzle ORM · better-auth ·
Tailwind · Vitest · Playwright · GitHub Actions.

## Start here

| File                                   | What it tells you                                                                   |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| [`LLM-README.md`](./LLM-README.md)     | **Read first.** Environment bring-up and traps that have already cost sessions time |
| [`TODO.md`](./TODO.md)                 | What's left, prioritised, with acceptance criteria — and what's already been tried  |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Layers, auth model, the physical hierarchy, conventions                             |
| [`docs/adr/`](./docs/adr)              | Why the stack is what it is                                                         |

## Commands

```bash
npm run dev            # dev server (reads .env itself)
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

- **Only `dev` and `preview` load `.env`.** Server modules read `process.env` directly, and
  `vite.config.ts` copies `.env` into it via `applyDotEnv` (`ENV-1`). Vitest, Playwright and
  `tsx` scripts do **not**, so `set -a; source .env; set +a` is still required for those.
  Values already exported in the shell always win over `.env`.
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
4. Routes under `src/routes/(app)/<entity>/`. A list page composes `Pagination.svelte` and
   `ConfirmDelete.svelte` from `src/lib/components/ui/` — don't hand-roll paging links or a
   delete modal, and don't reintroduce a local `pageHref`; `listHref` in
   `src/lib/utils/pagination.ts` is the one implementation.
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

**Complex ≠ District.** A Complex is the _physical_ grouping (the metering premise). A
District is a _utility distribution network_ scoped by utility type — heating, cooling,
electrical — which is what a central plant feeds. The axes are independent: a building is
in one Complex and connected to several districts at once. Physically a district is the
**substation** for electricity, and the **trunk line** upstream of the building's feed for
chilled water and steam. District membership belongs on the **meter** (the connection
point), not the building, and each connection is **primary** or **backup** — backup
optional. **Do not** cap connections per utility type and **do not** reject a backup that
reuses the primary's district: both are conventions, not constraints. Plant↔district is
many-to-many. Districts aren't built yet (`DISTRICT-1`); don't model them as a flavour of
Complex, and don't hang them off buildings.

Plants and distributed energy resources are **not modeled yet** — `/plants` is an explicit
placeholder. It is decided that plants are **their own asset type** with their own
production data, so don't add them as a `building_type`, a complex flag, or a variant of
`meters`. See `PLANTS-1` in `TODO.md` — one question (what a plant attaches to) is still
open.

**Meter ownership and billing are different facts.** Ownership is _recorded_ in
`meters.ownership` (`utility` | `client` | `unknown`) — never inferred from whether an
account is attached, because a client-owned meter can be billed under a utility account and
a utility meter may not be linked to one yet. Billing is which meter carries the account,
resolved by `meter-chain.ts` (`billed`, `revenueMeterNumber`). `unknown` is a real state
that `/connections` reports as a gap; don't default it to anything.

**Bill allocation splits each charge component separately**, never a blended percentage of
the total, and the parts must sum exactly to the invoice — rounding residue is reconciled
onto the largest line. For submetered methods the master-minus-submeters shortfall is an
explicit remainder line, never absorbed into the metered buildings. The run is persisted
(`bill_allocations.basis` snapshots the inputs) so the arithmetic stays reproducible after
the underlying square footage or occupancy changes. Missing basis data raises a typed
`AllocationError`, not a silent zero share. Calculation lives in
`bill-allocation-math.ts` (pure, no DB); persistence in `bill-allocation.ts`.

**`weather_normalized` allocation** fits each building against degree days
(`regression.ts`, `weather-normalization.ts`) and splits on predicted usage. A model that
fails ASHRAE Guideline 14 or has under 12 months of history is **not used** — the building
gets no basis and the reason is recorded. With nothing normalisable the bill falls back to
an area split, and `basis` records `requestedMethod` vs `appliedMethod`. Degree days are
stored (`degree_days`), never fetched at runtime: air-gapped sites can't call a weather API
and a re-fetched series would break reproducibility. Import them at `/energy/degree-days`; rows
upsert on `(station, period, base_temp_f)` so a revised series replaces rather than
duplicates, and the run writes **one** audit row, not one per month.

**Reconciliation** (`/reconciliation`) compares a master meter against its **direct**
submeters per period. Partial coverage is normal and reported as `unaccounted`, not an
error; only submeters exceeding the master (`over_metered`) is a defect. A period with no
master read yields a null delta and is excluded from totals.
