# Puds2 — Project TODO

<!--
MACHINE-READABLE. Each work item is an H3 whose first token is a stable ID (e.g. `ENV-1`).
Fields are `- **key:** value` pairs directly under the heading. IDs are permanent — mark
items `done` rather than deleting, so `blocked_by` references never dangle.

schema_version: 1
status: todo | in_progress | blocked | done
priority: P0 (broken now) | P1 (next) | P2 (soon) | P3 (someday)
effort:   S (<half day) | M (1-2 days) | L (a milestone)
-->

**Repo:** `ePetrack/Puds2` · **Default branch:**
`claude/energy-management-platform-011CUPSdL8PbGn5hfJBRnHLd` · **Work branch:**
`claude/utility-management-software-1qcj88`

## How to use this file

- **Humans:** read "Shipped" for where things stand, then work down P0 → P3.
- **LLMs:** each item is self-contained — `why` explains the problem without conversation
  history, `files` lists where to look, `acceptance` defines done. Check `blocked_by`
  before starting. Update `status` in the same PR as the work.

## Shipped

| Milestone                 | What landed                                                                                                         | PR  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- | --- |
| M1 Foundation             | Postgres + Drizzle migrations, better-auth + RBAC, audit logging, clients & buildings CRUD, Vitest + Playwright, CI | #1  |
| M2 Utility management     | Providers, accounts, meters, rate schedules, bills with anomaly detection, CSV import, spend dashboard              | #2  |
| M3 Projects & energy data | Projects with budgets/savings and building scope, meter readings, monthly trends, CSV import                        | #2  |
| M4 Analytics & documents  | Perspective.js analysis, document storage with streaming downloads, task tracking                                   | #3  |
| M5 Physical hierarchy     | Campuses, complexes, building parentage, complex master meters, parent/child submeters with type + cycle validation | #3  |
| Setup docs                | Postgres without Docker, troubleshooting for Compose/daemon/keg-only `psql`                                         | #4  |
| Navigation rework         | Task-oriented sidebar, `/facilities` hub, `/plants` placeholder, 13 nav e2e tests                                   | #5  |

**Current gate:** lint + typecheck clean · 70 Vitest · 33 Playwright.

---

## Open items

### ENV-1 — `npm run dev` doesn't load `.env`

- **status:** todo
- **priority:** P0
- **effort:** S
- **blocked_by:** none
- **files:** `vite.config.ts`, `src/lib/server/auth.ts`, `src/lib/server/db/index.ts`
- **why:** `npm run dev` — the first command in the README Quick Start — dies with
  `AUTH_SECRET is not set` even when `.env` is correct. Server modules read `process.env`
  directly (deliberate, so the same code runs under Vitest and `tsx`), but `vite dev`
  never copies `.env` into `process.env`. Every other entry point supplies env another way
  (`node build/index.js` via shell, `db:migrate`/`db:seed` via `tsx --env-file-if-exists`,
  CI via workflow `env:`), which is why it went unnoticed. **Reproduced** with a valid
  `.env`. Workaround: `set -a; source .env; set +a`.
- **fix:** in `vite.config.ts`,
  `Object.assign(process.env, loadEnv(mode, process.cwd(), ''))` (empty prefix loads all
  keys, not just `VITE_*`). Fixes `dev` and `preview`; no new deps.
- **note:** this fix was proposed once and declined — confirm before implementing.
- **acceptance:**
  - [ ] `npm run dev` starts from a plain `.env` with no exported shell vars
  - [ ] `npm run preview` likewise
  - [ ] a check fails if `loadEnv` is removed (existing e2e runs the built server, so it
        cannot catch this class of bug)

### ANALYTICS-1 — Analysis can't pivot by campus or complex

- **status:** todo
- **priority:** P1
- **effort:** M
- **blocked_by:** none
- **files:** `src/lib/server/services/analysis.ts`, `src/routes/(app)/analysis/`
- **why:** M5 added campuses and complexes, but `analysis.ts` contains **zero** references
  to either (verified by grep). The Perspective dataset exposes client / building /
  provider / account / meter — so the hierarchy just built is invisible to reporting. This
  is the cheapest work with the most visible payoff.
- **acceptance:**
  - [ ] dataset rows include `campusName` and `complexName`
  - [ ] both usable as Perspective group-by dimensions
  - [ ] a preset view showing cost or usage grouped by campus
  - [ ] existing analysis e2e still passes

### ANALYTICS-2 — Master-vs-submeter reconciliation

- **status:** todo
- **priority:** P1
- **effort:** M
- **blocked_by:** ANALYTICS-1
- **files:** `src/lib/server/services/meters.ts` (`listSubmeters`),
  `src/lib/server/services/energy-readings.ts`, `src/routes/(app)/analysis/`
- **why:** `meters.parent_meter_id` now exists, so a complex master meter can be compared
  against the sum of its submeters for the same period — surfacing unaccounted energy and
  line loss. Standard M&V work that consultants bill for; newly possible and not yet built.
- **acceptance:**
  - [ ] per-period view: master total, sum of submeters, delta, delta %
  - [ ] handles partial coverage (not every load submetered) without implying error
  - [ ] unit tests for a master with 0, 1, and several submeters

### PLANTS-1 — Design the plant / DER data model

- **status:** todo
- **priority:** P2
- **effort:** L
- **blocked_by:** none — one attachment question outstanding, see below
- **files:** `src/lib/server/db/schema.ts`, `src/routes/(app)/plants/+page.svelte`
- **why:** "Plant management" is one of the five primary nav areas but has no data behind
  it — `/plants` is an explicit placeholder. Generation assets don't fit the consumption
  meter schema: bidirectional flow, capacity ratings, and fuel input measured against
  output. Central plants, solar PV, storage, CHP, and water resources are all in scope.
- **decided:** plants are **their own asset type** — a dedicated `plants` table with its own
  production data, _not_ a `building_type`, a complex flag, or a variant of `meters`. Don't
  reuse the consumption-meter schema for generation.
- **still open:** what a plant attaches to — client directly, campus, complex, or building
  (a rooftop array sits on a building; a central utility plant sits on a campus). Likely a
  nullable optional-parent set mirroring how buildings attach today.
- **acceptance:**
  - [ ] attachment question answered and recorded in `ARCHITECTURE.md`
  - [ ] `plants` table + migration; production readings separate from `energy_readings`
  - [ ] service with audit logging + CRUD, matching the M5 pattern
  - [ ] `/plants` placeholder replaced; seed gains a demo plant
  - [ ] unit + e2e coverage

### HIER-1 — Complexes as maintenance districts / responsibility areas

- **status:** todo
- **priority:** P2
- **effort:** S — reduced by the cardinality decision below
- **blocked_by:** none
- **files:** `src/lib/server/db/schema.ts`, `src/lib/server/services/complexes.ts`
- **why:** Explicitly flagged when the hierarchy was requested: _"Further development of
  campus into 'complexes' that corresponds to maintenance districts, responsibility areas,
  etc., needs to be completed."_ Today a Complex is only a metering premise (buildings
  sharing one master meter).
- **decided:** a building belongs to **at most one complex**, and complex membership stays
  **optional**. That is exactly the current schema (`buildings.complex_id`, nullable single
  FK) — so no join table, and no cardinality change is needed.
- **consequence to accept:** because membership is single, one Complex must serve as _both_
  the metering premise and the maintenance-district grouping. A building cannot sit in a
  "Central Plant" metering complex and a separate "North District" at the same time. If
  that turns out to be needed in practice, it reopens as a new item rather than changing
  this decision quietly.
- **remaining work:** add a `complex_type` enum (e.g. `metering_premise` /
  `maintenance_district` / `responsibility_area`) so a Complex records which role it plays,
  and surface it in the complex list/detail and form.
- **acceptance:**
  - [ ] `complex_type` enum + migration, defaulting existing rows to `metering_premise`
  - [ ] Zod schema, service, and `ComplexForm` expose it
  - [ ] complex list shows the type; `/facilities` copy reflects it
  - [ ] decision + consequence recorded in `ARCHITECTURE.md`

### UI-1 — Visual pass against the Figma comp

- **status:** blocked
- **priority:** P2
- **effort:** M
- **blocked_by:** needs screenshots from the user
- **files:** `src/routes/(app)/+layout.svelte`, `src/app.css`, `src/lib/components/`
- **why:** Two Figma links were shared for inspiration. **Both are unreachable from the
  dev environment** — the agent proxy denies the host (403 on CONNECT), confirmed via
  `curl -sS "$HTTPS_PROXY/__agentproxy/status"`. Structure and IA are settled, so this is
  now a pure styling pass. Unblocks as soon as screenshots are pasted into chat.
- **acceptance:**
  - [ ] screenshots received
  - [ ] palette, card, table, and badge styling aligned
  - [ ] light and dark themes both checked

### M6-1 — Production hardening

- **status:** todo
- **priority:** P2
- **effort:** L
- **blocked_by:** none
- **files:** `src/hooks.server.ts`, `.github/workflows/ci.yml`, `docs/`
- **why:** Last roadmap item before the app is deployable: rate limiting, metrics,
  backup/restore, deployment guide.
- **acceptance:**
  - [ ] rate limiting on auth endpoints
  - [ ] health/metrics endpoint
  - [ ] documented backup + restore procedure, tested end to end
  - [ ] deployment guide (adapter-node + managed Postgres)

### DEPLOY-1 — Decide hosted vs. packaged distribution

- **status:** todo
- **priority:** P2
- **effort:** S (decision) / L (build)
- **blocked_by:** none
- **files:** n/a — decision, then follows into M6-1
- **why:** A single-download `.dmg`/`.exe` was raised. Technically feasible — all runtime
  deps are pure JS — but Postgres is load-bearing (14 `pgEnum`s, `jsonb`, an array,
  `gen_random_uuid()`), so it needs **PGlite** (Postgres in WASM) or bundled binaries, not
  SQLite. The real tension: this is a **multi-user** app (admin/consultant/client roles,
  audit log, shared portfolios) — a desktop install gives each person a private database,
  defeating collaboration. Hosted fits the design; desktop only makes sense for
  offline/air-gapped federal or hospital sites.
- **acceptance:**
  - [ ] decision recorded (hosted / desktop / both) with the reason
  - [ ] if hosted: folds into M6-1
  - [ ] if desktop: separate milestone incl. code signing (Apple Developer $99/yr; Windows
        cert or SmartScreen warnings) — the commonly underestimated part

### REPO-1 — Promote a real default branch

- **status:** todo
- **priority:** P3
- **effort:** S
- **blocked_by:** none
- **files:** repo settings
- **why:** The default branch is
  `claude/energy-management-platform-011CUPSdL8PbGn5hfJBRnHLd` — an agent-generated name.
  Every PR targets it. Works, but confusing for anyone new, and it makes `git clone` land
  somewhere unexpected.
- **acceptance:**
  - [ ] `main` created from the current default and set as default
  - [ ] README clone instructions updated

### TEST-1 — e2e pollutes the dev database

- **status:** todo
- **priority:** P3
- **effort:** S
- **blocked_by:** none
- **files:** `playwright.config.ts`, `tests/e2e/`
- **why:** The suite runs against seeded `puds_dev` and leaves `E2E …` rows behind, so dev
  data accumulates run over run. Documented in the README, but a dedicated `puds_e2e`
  database (or cleanup hook) would be cleaner.
- **acceptance:**
  - [ ] e2e runs leave `puds_dev` unchanged
  - [ ] CI unaffected

---

## Conventions for new work

- Branch from the current default; **merged PRs are never reused** — open a new one.
- Every mutation writes `audit_log` in the same transaction (`recordAudit` + `diffRecords`).
- Zod schemas in `src/lib/schemas/` are shared client/server; use the form helpers in
  `helpers.ts` (`optionalText`, `optionalNumber`, `optionalDate`, `formDataToObject`).
- Routes stay thin: validate → call a service → shape the response. No SQL in routes.
- Gate before pushing: `npm run lint && npm run check && npm test && npm run test:e2e`.
- Adding an entity: schema → `db:generate` → Zod → service → routes → tests (see
  `ARCHITECTURE.md`, "Adding a new entity").
