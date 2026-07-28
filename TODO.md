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

| Milestone                 | What landed                                                                                                                        | PR  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --- |
| M1 Foundation             | Postgres + Drizzle migrations, better-auth + RBAC, audit logging, clients & buildings CRUD, Vitest + Playwright, CI                | #1  |
| M2 Utility management     | Providers, accounts, meters, rate schedules, bills with anomaly detection, CSV import, spend dashboard                             | #2  |
| M3 Projects & energy data | Projects with budgets/savings and building scope, meter readings, monthly trends, CSV import                                       | #2  |
| M4 Analytics & documents  | Perspective.js analysis, document storage with streaming downloads, task tracking                                                  | #3  |
| M5 Physical hierarchy     | Campuses, complexes, building parentage, complex master meters, parent/child submeters with type + cycle validation                | #3  |
| Setup docs                | Postgres without Docker, troubleshooting for Compose/daemon/keg-only `psql`                                                        | #4  |
| Navigation rework         | Task-oriented sidebar, `/facilities` hub, `/plants` placeholder, 13 nav e2e tests                                                  | #5  |
| Docs & backlog            | `TODO.md`, `CLAUDE.md`, ARCHITECTURE decisions (complex cardinality, plants, Complex ≠ District)                                   | #6  |
| Connections & allocation  | `/connections` relationship review with a gaps panel; per-component bill allocation with preview, remainder line and persisted run | #8  |
| Meter chain               | `meter-chain.ts` — ownership + revenue-meter resolution walking `parent_meter_id`, shared with `/connections`                      | #9  |
| Reconciliation            | `/reconciliation` — master vs submeters per period, partial coverage reported not faulted, missing reads excluded from totals      | #10 |
| Meter ownership           | `meters.ownership` recorded rather than inferred; ownership and billing separated; unrecorded ownership surfaced as a gap          | #10 |

**Current gate:** lint + typecheck clean · 132 Vitest · 44 Playwright.

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

### ANALYTICS-1 — Analysis can't pivot by campus, complex, or the meter chain

- **status:** blocked — the service layer landed, the dataset widening did not
- **priority:** P1
- **effort:** M
- **blocked_by:** ANALYSIS-1
- **files:** `src/lib/server/services/analysis.ts`,
  `src/lib/server/services/meter-chain.ts`, `src/routes/(app)/analysis/`
- **why:** M5 added campuses and complexes, but `analysis.ts` contained **zero** references
  to either. Worse, the readings query reached the client via `buildings.client_id`, so a
  complex master meter — which has no building — landed in the dataset with no building
  **and no client**. The seed creates readings for every meter, so those rows were already
  there, silently unattributed.
- **resolved axis:** attribution runs **meter → meter**, not premise → premise. A revenue
  meter feeds the meters downstream of it, and `parent_meter_id` is that link. Campus and
  complex are context (where a row sits), not the attribution mechanism.
- **shipped:** `meter-chain.ts` — pure `resolveChain` + `chainResolver`, walking
  `parent_meter_id` to the nearest billed ancestor, memoised and cycle-guarded. (It also
  carried the interim `deriveOwnership` heuristic, which `METER-1` has since removed in
  favour of the recorded `meters.ownership` column.)
- **not shipped:** the dataset widening itself. It was written and its 11 service tests
  passed, but it makes the pre-existing `ANALYSIS-1` boot failure reliable rather than
  occasional, so `/analysis` renders an error state with it in place. Reverted rather than
  merged. `ANALYSIS-1` records the exact columns, joins and resolution rules for the rebuild
  — including the complex-client fallback, which is a real bug fix in its own right.
- **not done, deliberately:** no per-building cost derived from a master bill. The audited
  allocation from PR #8 is the only sanctioned split; a live one in the reporting layer
  could disagree with the saved run. Feeding `bill_allocation_lines` in is a later step.
- **acceptance:**
  - [x] `resolveChain` available for reporting and for `ANALYTICS-2`
  - [ ] dataset rows include campus and complex
  - [ ] both usable as Perspective group-by dimensions
  - [ ] a preset view showing cost grouped by campus
  - [ ] existing analysis e2e still passes

### ANALYTICS-2 — Master-vs-submeter reconciliation

- **status:** done
- **priority:** P1
- **effort:** M
- **blocked_by:** none
- **files:** `src/lib/server/services/reconciliation-math.ts`,
  `src/lib/server/services/reconciliation.ts`, `src/lib/schemas/reconciliation.ts`,
  `src/routes/(app)/reconciliation/`
- **why:** `meters.parent_meter_id` exists, so a master meter can be compared against the
  sum of its submeters for the same period — surfacing unaccounted energy and line loss.
  Standard M&V work that consultants bill for.
- **shipped:** `/reconciliation` — pick a master, a window and a tolerance; get master
  total, submeter total, delta and delta % per month plus a span summary, with each period
  classified and every status explained on screen.
- **decisions worth keeping:**
  - **Partial coverage is reported, not faulted.** A steady positive gap is the normal state
    where some loads are unmetered; only submeters exceeding the master (`over_metered`) is
    treated as a defect, since that is physically impossible and always means a data error.
  - **Missing master reads yield a null delta**, not a 100% gap, and are excluded from the
    span totals — counting their submeter usage would understate the real gap.
  - **Only direct children are summed.** Walking the subtree would double-count a submetered
    submeter, which is the very signal the report exists to surface.
  - Tolerance is a request parameter, not a constant, because the defensible band depends on
    meter class.
- **acceptance:**
  - [x] per-period view: master total, sum of submeters, delta, delta %
  - [x] handles partial coverage (not every load submetered) without implying error
  - [x] unit tests for a master with 0, 1, and several submeters

### ANALYSIS-1 — the Perspective engine fails to boot after any earlier page load

- **status:** todo
- **priority:** P1
- **effort:** M
- **blocked_by:** none
- **files:** `src/lib/components/PerspectiveViewer.svelte`, `vite.config.ts`
- **why:** `/analysis` intermittently renders the component's error state — `Missing
perspective-client.wasm` — instead of the viewer. **This is pre-existing and reproduces on
  the default branch**, which an earlier writeup of this item got wrong in both directions;
  the evidence below is what actually holds.
- **reproduction, on a clean checkout of the default branch:** run a trivial warm-up test
  (sign in, visit any page), then load `/analysis` in a second Playwright test in the same
  browser process. `customElements.get('perspective-viewer')` is **`false` eight seconds
  later**, with **no console output, no page error and no failed request** — the viewer
  module loads and silently never calls `customElements.define`. `@finos/perspective` then
  reads its client WASM off that element, finds nothing, and throws.
- **ruled out, with evidence:**
  - **Memory** — 16 GB total, 14 GB free at the time of failure.
  - **SSR payload size** — moving the whole dataset out of the page and behind a
    `/analysis/data` endpoint changed nothing.
  - **The dataset shape** — bisected column group by column group; campus/complex, the meter
    chain columns and the complex-client fallback each pass in isolation.
  - **An external fetch** — a full request log over `/analysis` shows zero non-localhost
    requests, so no CDN is involved.
- **why it looked like a code bug:** widening the dataset shifts timing enough that the
  latent failure becomes reliable rather than occasional, so a bisect against the widening
  incriminates it. It is a trigger, not the cause.
- **what did NOT work** (tried and reverted; don't repeat):
  - `await customElements.whenDefined('perspective-viewer')` — the element genuinely never
    defines on the failing path, so this turns a fast error into a hang.
  - Explicit `init_client`/`init_server` with `?url` WASM imports. This _does_ make Vite emit
    `perspective-server.wasm`, `perspective-js.wasm` and `perspective-viewer.wasm` as build
    assets (they are otherwise absent, and then serve 200) and the element _does_ register —
    but the engine then traps on `unreachable` inside the WASM with no JS frames.
- **next thing to try:** the explicit-init path is the most promising, since it is the only
  approach that got the element registered. Pin the official bundler recipe for
  `@finos/perspective` 3.8 rather than inferring argument order from `.d.ts`, and try
  `optimizeDeps.exclude` for the perspective packages. Failing that, upgrading the three
  perspective packages together is cheap to test.
- **acceptance:**
  - [ ] `/analysis` renders the viewer after an earlier page load in the same browser
  - [ ] a second e2e loading `/analysis` in a fresh context passes repeatedly
  - [ ] the WASM binaries are build assets rather than resolved implicitly

### QOL-1 — Extract the duplicated list-page shell

- **status:** todo
- **priority:** P1
- **effort:** M
- **blocked_by:** none
- **files:** `src/lib/components/ui/`, and the list pages under `src/routes/(app)/` —
  `clients`, `buildings`, `campuses`, `complexes`, `projects`, `energy`, `utilities/bills`
- **why:** Six milestones were each built and shipped independently, so the same list-page
  scaffolding got copied rather than shared. Measured on the current tree:
  - `function pageHref` is duplicated verbatim across **7** list pages
  - the delete-confirm modal + `toast` + `invalidateAll()` block appears in **14** files
  - ~14k lines of app source are served by only **6** shared components (4 form fields,
    `Modal`, `Toast`)

  Nothing is broken — this is compounding cost, not a defect. Every new entity currently
  costs another copy of the same ~150 lines, and a fix to (say) pagination or the delete
  flow has to be applied 7–14 times.

- **do this before `PLANTS-1`** — plants adds a list page, a form and a detail page, so
  building it first makes it copy #15 instead of the first consumer of the shared parts.
- **approach:** extract a `DataTable` / list-page shell (filter form, table, empty state,
  pagination) and a `ConfirmDelete` component wrapping the modal + toast + invalidate
  cycle. Keep them dumb and prop-driven; the services and routes don't change.
- **acceptance:**
  - [ ] `pageHref` exists once, not seven times
  - [ ] delete-confirm flow exists once
  - [ ] every existing list page uses the shared parts, with no visual change
  - [ ] `npm test` and `npm run test:e2e` green with no test rewrites (behaviour identical)

### QOL-2 — Whole-codebase review passes

- **status:** todo
- **priority:** P2
- **effort:** M
- **blocked_by:** none
- **files:** repo-wide
- **why:** The code has never had a holistic pass — every review so far was scoped to the
  milestone being shipped. Worth running now that the feature surface is broad:
  accessibility (forms, tables, modals, keyboard traps), a security review of the auth,
  upload and download paths since M1, loading/error states on slow or failed loads, and
  N+1 query checks in the list services.
- **acceptance:**
  - [ ] a11y pass over forms, tables and modals
  - [ ] security review of auth, RBAC, upload and download paths
  - [ ] findings either fixed or filed as their own TODO items

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

### HIER-1 — ~~Complexes as maintenance districts~~ (superseded by `DISTRICT-1`)

- **status:** done — closed as **superseded**, not built
- **priority:** —
- **why superseded:** this item assumed a Complex could _also_ be a maintenance district,
  handled via a `complex_type` enum. That premise is wrong. Complex and District are
  **separate concepts on separate axes** — see `DISTRICT-1`. No `complex_type` enum; a
  Complex is purely physical. Kept for ID stability; do not implement.

### DISTRICT-1 — Districts as utility distribution networks

- **status:** todo
- **priority:** P2
- **effort:** M
- **blocked_by:** none — but see the relationship to `PLANTS-1` below
- **files:** `src/lib/server/db/schema.ts`, new `src/lib/server/services/districts.ts`,
  new routes under `src/routes/(app)/districts/`
- **why:** Complex and District are different axes and must not be conflated:
  - **Complex = physical hierarchy.** Buildings grouped by physical arrangement — the
    metering premise. A building belongs to **at most one**, optionally.
  - **District = utility distribution network**, scoped by utility type: a heating
    district, a cooling district, an electrical district. These are the service networks
    a central plant feeds.

  The axes are independent, so a building sits in one Complex _and_ simultaneously in a
  heating district, a cooling district, and an electrical district. Steam, chilled water,
  and electrical primary loops each serve a different (often overlapping) set of buildings
  — which is exactly why one grouping can't express both.

- **resolves an earlier concern:** `HIER-1` flagged that a single Complex would have to
  serve as both metering premise and district. With districts as their own entity that
  tension disappears, and the "one complex per building" rule stands unharmed.
- **district membership attaches to the METER, not the building.** A meter is the physical
  connection point to a distribution network, so that is where the link belongs. This
  replaces an earlier building↔district join-table sketch, which was wrong.
- **primary and backup:** a connection carries a role — **primary** or **backup**. Backup
  is **optional**; many buildings have none. Redundancy is common in hospitals and federal
  facilities that cannot lose heat, so a building may have a primary heating meter on
  District A and a backup heating meter on District B.
- **model sketch:**
  - `districts` table: `utility_type` (reuse the existing `utilityType` enum), scoped to a
    client and optionally a campus.
  - `meters.district_id` — nullable FK; `meters.district_role` — enum
    `primary` | `backup`, meaningful only when `district_id` is set.
  - **validation:** a meter's `utility_type` must match its district's `utility_type` —
    the same class of rule as the existing submeter check, so it belongs in
    `assertValidMeter` in `src/lib/server/services/meters.ts` alongside the parent-meter
    and premise rules.
  - Because a meter already carries exactly one `utility_type`, the earlier
    "one district per utility type" constraint is expressed naturally and needs no join
    table or composite unique index.
- **what a district physically is, by utility type** — it varies, and this is the useful
  definition to hold onto:
  - **Electricity** — the microgrid **substation**.
  - **Chilled water / steam** — the larger distribution line (the **trunk line**) upstream
    of the building's feed.
- **do NOT enforce these — they are conventions, not constraints:**
  - A building is **not capped** at one primary + one backup per utility type. No unique
    index on `(building_id, utility_type, role)`; multiple connections are legitimate.
  - A backup will _likely_ always be a different district from the primary, but that is
    expected practice rather than a rule. Don't reject same-district backups.

  The only hard validation is the meter/district **utility-type match**.

- **relationship to `PLANTS-1` — many-to-many.** A plant can feed **multiple districts**,
  and a district can be fed by **multiple plants** (redundancy, peaking). So the plant↔
  district link is a join table, not an FK on either side. The chain is
  **Plants ⇄ Districts → Meters → Buildings**. Design the two together so this lands as a
  join table from the start rather than a one-to-many that has to be migrated later.
- **acceptance:**
  - [ ] `districts` table + migration; `meters.district_id` + `district_role`
  - [ ] utility-type match enforced in `assertValidMeter`, with a typed field error
  - [ ] service with audit logging + CRUD, matching the M5 pattern
  - [ ] meter form exposes district + role; district detail lists connected meters and
        their buildings, primary and backup distinguished
  - [ ] unit tests: type mismatch rejected, backup optional, a building with primary-only
        and one with primary + backup
  - [ ] Complex vs. District distinction documented in `ARCHITECTURE.md`

### METER-1 — Record meter ownership instead of deriving it

- **status:** done
- **priority:** P2
- **effort:** S
- **blocked_by:** none
- **files:** `src/lib/server/db/schema.ts`, `drizzle/0006_meter_ownership.sql`,
  `src/lib/schemas/utility.ts`, `src/lib/components/utilities/MeterForm.svelte`,
  `src/routes/(app)/connections/+page.server.ts`,
  `src/lib/server/services/meter-chain.ts`
- **why:** `/connections` split meters into utility- and internally-owned by asking whether
  an `account_id` was attached. That heuristic is wrong in two real cases — a client-owned
  meter the utility bills against, and a utility meter not yet linked to an account — and it
  conflated two different facts.
- **shipped:** `meter_ownership` enum (`utility` | `client` | `unknown`) and
  `meters.ownership`, exposed on the meter form, grouped on by `/connections`, and seeded
  explicitly. The old `deriveOwnership` helper is gone.
- **the split that mattered:** ownership (who owns the hardware) and billing (which meter
  carries the account) are now separate. `meter-chain.ts` no longer speaks about ownership
  at all — it reports `billed` and the `revenueMeterNumber`, which is a billing question.
- **the backfill decision:** only the half the data supports. Meters **with** an account
  become `utility`; the rest stay `unknown` rather than becoming `client`. "No account
  linked" is equally consistent with a utility meter nobody has attached yet, so recording
  it as client-owned would promote a guess to a fact — the exact problem this item exists to
  remove. `unknown` surfaces on `/connections` as a gap to fill.
- **acceptance:**
  - [x] `meters.ownership` column + migration with an `account_id`-based backfill
  - [x] meter create/edit form exposes it
  - [x] `/connections` groups on the column; the "derived, not recorded" banner is removed
  - [x] unit test covering a client-owned meter with no account, and the `unknown` default

### ALLOC-1 — Weather-normalised allocation

- **status:** done
- **priority:** P3
- **effort:** M
- **blocked_by:** none
- **files:** `src/lib/server/services/regression.ts`,
  `src/lib/server/services/weather-normalization.ts`,
  `src/lib/server/services/bill-allocation.ts`, `drizzle/0007_degree_days.sql`,
  `drizzle/0008_weather_normalized_method.sql`
- **why:** The other methods split on a static or measured basis and ignore that buildings
  in one complex have different weather sensitivity, so on an extreme month an area split
  over-charges the well-insulated building for its neighbour's heat.
- **shipped:** a `weather_normalized` method that fits each building's own consumption
  against degree days (`usage = intercept + βh·HDD + βc·CDD`) and splits on predicted usage
  for the bill period. `regression.ts` is a pure OLS with R², CV(RMSE) and NMBE;
  `degree_days` stores the weather series.
- **decisions worth keeping:**
  - **A model that doesn't fit isn't used.** Under 12 months of history, no matching degree
    days, or ASHRAE Guideline 14 statistics outside threshold, and the building gets no
    normalised basis with the reason recorded against it.
  - **Degree days are stored, not fetched.** An air-gapped federal or hospital deployment
    can't call a weather API, and an allocation isn't reproducible if its weather inputs are
    re-fetched from a service that may have revised them.
  - **Fall back, don't fail.** With nothing normalisable the bill is split by area and both
    the warnings and the `basis` record `requestedMethod` vs `appliedMethod`.
- **still worth doing:** there is no UI for entering or importing degree days — the seed
  creates a synthetic series and the table is otherwise populated by hand. A CSV import
  matching the existing bill importer is the obvious next step. Change-point (3P/5P) models
  would also beat a fixed 65°F base, since the balance point is properly a fitted parameter.
- **acceptance:**
  - [x] a method that normalises the basis against degree days for the bill period
  - [x] the persisted `basis` snapshot records the weather source and model fit
  - [x] falls back to the un-normalised basis, with a warning, when data is insufficient

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
