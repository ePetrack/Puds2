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
| Degree-day import         | `/energy/degree-days` — CSV import that upserts a revised series, coverage panel on the allocation form, one audit row per run     | #11 |
| List-page shell           | `listHref` + `Pagination` + `ConfirmDelete` shared across 13 list pages; server `deleteError` now surfaced instead of swallowed    | #11 |
| E2E isolation             | Playwright builds and seeds its own `puds_e2e` per run; `puds_dev` untouched, no manual re-seed                                    | #11 |
| Dev env loading           | `vite dev`/`preview` read `.env` themselves (`ENV-1`); shell values still win                                                      | #11 |
| Review passes             | `QOL-2` — modal focus trap + restore, `scope="col"` on 110 headers; authz/upload/N+1 reviewed clean; **`SEC-1` filed**             | #11 |
| Perspective boot          | `ANALYSIS-1` — WASM handed to `init_client`/`init_server` as bytes; `/analysis` renders reliably, unblocking `ANALYTICS-1`         | #11 |
| QA/QC pass                | Malformed ids 404 not 500, `handleError` + error pages, five untested services covered, route/service ceremony shared (−276 lines) | #12 |

**Current gate:** lint + typecheck clean · 231 Vitest · 68 Playwright.

---

## Open items

### ENV-1 — `npm run dev` doesn't load `.env`

- **status:** done
- **priority:** P0
- **effort:** S
- **blocked_by:** none
- **files:** `vite.config.ts`, `src/lib/config/dotenv.ts`, `tests/unit/dotenv.test.ts`
- **why:** `npm run dev` — the first command in the README Quick Start — dies with
  `AUTH_SECRET is not set` even when `.env` is correct. Server modules read `process.env`
  directly (deliberate, so the same code runs under Vitest and `tsx`), but `vite dev`
  never copies `.env` into `process.env`. Every other entry point supplies env another way
  (`node build/index.js` via shell, `db:migrate`/`db:seed` via `tsx --env-file-if-exists`,
  CI via workflow `env:`), which is why it went unnoticed. **Reproduced** with a valid
  `.env`. Workaround: `set -a; source .env; set +a`.
- **note:** the fix was proposed once and declined; **explicitly approved** before this
  implementation. Don't re-litigate it.
- **shipped:** `applyDotEnv(mode, envDir)` in `src/lib/config/dotenv.ts`, called from
  `vite.config.ts`. The empty prefix is the point — Vite exposes only `VITE_*` by default and
  none of these keys are `VITE_`-prefixed, because they are server secrets.
- **decisions worth keeping:**
  - **The real environment wins.** Values already in `process.env` are not overwritten, so
    `DATABASE_URL=… npm run dev` still works and CI's workflow `env:` still takes precedence
    over a checked-out `.env`. Blind `Object.assign` would have inverted that.
  - **It lives in its own module, not inline in the config.** Behaviour in `vite.config.ts`
    is not reachable from Vitest, and this needed real tests.
- **verified:** with `DATABASE_URL`, `AUTH_SECRET`, `ORIGIN` and `LOG_LEVEL` all unset in the
  shell, `npm run dev` serves `/login` 200 and `/clients` 303 (the correct unauthenticated
  redirect), and `npm run preview` serves `/login` 200 — no `AUTH_SECRET is not set`.
- **acceptance:**
  - [x] `npm run dev` starts from a plain `.env` with no exported shell vars
  - [x] `npm run preview` likewise
  - [x] a check fails if `loadEnv` is removed — `tests/unit/dotenv.test.ts` asserts the
        wiring as well as the behaviour, and was confirmed to fail with the call deleted
        (the e2e suite runs the built server, so it structurally cannot catch this)

### ANALYTICS-1 — Analysis can't pivot by campus, complex, or the meter chain

- **status:** todo — **unblocked**; the service layer landed, the dataset widening did not
- **priority:** P1
- **effort:** M
- **blocked_by:** none — `ANALYSIS-1` is fixed, so the widening can now be rebuilt and the
  `/analysis` page will actually render it
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

### ANALYSIS-1 — the Perspective engine failed to boot after any earlier page load

- **status:** done
- **priority:** P1
- **effort:** M
- **blocked_by:** none
- **files:** `src/lib/components/PerspectiveViewer.svelte`, `tests/e2e/analysis-boot.spec.ts`
- **why:** `/analysis` intermittently rendered the component's error state — `Missing
perspective-client.wasm` — instead of the viewer, with **no console output, no page error
  and no failed request**. Any earlier page load in the same browser process triggered it.

#### Root cause

Perspective must be **told where its WASM is**; importing the packages is not enough. Two
things follow from that, and together they explain the total absence of diagnostics:

1. `<perspective-viewer>` is registered from _inside_ the viewer's WASM (a wasm-bindgen
   `bootstrap` callback), so until `init_client` runs the element never appears. The import
   still resolves and nothing throws — `perspective-viewer.ts` only re-exports `init_client`;
   its own doc comment claims registration happens on import, which is stale for 3.x.
2. `@finos/perspective` reads its client WASM off that element
   (`customElements.get("perspective-viewer").__wasm_module__` in `get_client()`), so with no
   element it throws `Missing perspective-client.wasm`. The message names a file, but the
   thing actually missing is the element.

#### The trap that cost two sessions

Both binaries are **self-extracting**: `load_wasm_stage_0` instantiates the file, then
unpacks the real module from a custom section. Its failure path is:

```ts
try {
	return await extract(wasm as ArrayBuffer);
} catch (e) {
	console.warn('Stage 0 wasm loading failed, skipping');
	return new Uint8Array(wasm as ArrayBuffer);
}
```

Passing `fetch(url)` — i.e. a `Response` — makes `extract` throw, and
`new Uint8Array(aResponse)` silently yields **zero bytes**. The result is a module that
instantiates and then traps on `unreachable` with no JS frames. Read the bytes with
`.arrayBuffer()` first and pass the `ArrayBuffer`; leave stage 0 **enabled** (the files are
compressed, so `disable_stage_0: true` gives `t.psp_is_memory64 is not a function`).

#### What did NOT work (don't repeat)

- `await customElements.whenDefined('perspective-viewer')` — the element genuinely never
  defines on the failing path, so this turns a fast error into a hang.
- **`optimizeDeps.exclude`** for the perspective packages — no effect, and it cannot have
  one: `optimizeDeps` governs **dev** pre-bundling while the e2e suite runs the production
  build.
- **Both `.inline` builds.** These do fix registration, but `perspective.inline` calls
  `init_client` with `perspective-js.wasm` while `get_client()` overrides it with the
  viewer's module — two different binaries. `worker()` and `table()` succeed and the trap
  lands in `viewerEl.load(table)`.
- `init_server(fetch(url))` and `init_server(bytes, true)` — the two halves of the trap
  above, in both directions.

#### Fixed

`PerspectiveViewer.svelte` imports both `.wasm` files with Vite's `?url`, fetches each to an
`ArrayBuffer`, then calls `perspective.init_server(serverWasm)` and
`viewer.init_client(clientWasm)`. The binaries are emitted as real build assets
(`perspective-viewer` 920 kB, `perspective-server` 2.28 MB) rather than resolved implicitly,
and nothing is inlined into the JS bundle.

**Verified:** the reproduction — a warm-up navigation, then `/analysis` in a second test in
the same browser process — passes **6/6** consecutively, and the full suite passes **4/4** at
51 tests with no `fixme` remaining.

- **acceptance:**
  - [x] `/analysis` renders the viewer after an earlier page load in the same browser
  - [x] `tests/e2e/analysis-boot.spec.ts` passes with its `test.fixme` removed, repeatedly
  - [x] the WASM binaries are build assets rather than resolved implicitly

### QOL-1 — Extract the duplicated list-page shell

- **status:** done
- **priority:** P1
- **effort:** M
- **blocked_by:** none
- **files:** `src/lib/utils/pagination.ts`, `src/lib/components/ui/Pagination.svelte`,
  `src/lib/components/ui/ConfirmDelete.svelte`, and the list pages under `src/routes/(app)/`
- **why:** Six milestones were each built and shipped independently, so the same list-page
  scaffolding got copied rather than shared. Measured before the change:
  - `function pageHref` duplicated verbatim across **8** list pages (7 at filing; the
    degree-day page made it 8, which is the compounding this item is about)
  - the delete-confirm modal + `toast` + `invalidateAll()` block in **14** files
  - ~14k lines of app source served by only **6** shared components

  Nothing was broken — this was compounding cost, not a defect.

- **shipped:**
  - `listHref(basePath, filters, page)` in `src/lib/utils/pagination.ts` — `pageHref` now
    exists **zero** times; all eight copies passed the whole `data.filters` object, so one
    signature covered every caller.
  - `Pagination.svelte` — the "Page X of Y · Previous / Next" block, which was byte-identical
    across all eight pages apart from the collection name.
  - `ConfirmDelete.svelte` — the modal + form + toast + `invalidateAll()` cycle, adopted by
    13 list pages. The bill detail page's delete and the allocation Remove modal are
    deliberately left alone: different actions, different payloads, not the list pattern.
- **one real fix fell out of it:** every delete action already returned
  `fail(…, { deleteError })`, but **13 of 14** pages discarded it and showed a generic
  "Failed to delete X". Only `/utilities/providers` surfaced the real reason. The shared
  component surfaces it everywhere, so "Provider is referenced by utility accounts" now
  reaches the user instead of being swallowed.
- **not done, deliberately:** no `DataTable`. The eight tables differ in columns, links,
  badges and formatters; a prop-driven table covering all of them would be a bigger
  abstraction than the duplication it removes. The repeated _mechanism_ (paging, delete) is
  now shared; the repeated _markup_ is left alone until a second consumer justifies it.
- **acceptance:**
  - [x] `pageHref` exists once, not seven times — it exists zero times
  - [x] delete-confirm flow exists once
  - [x] every existing list page uses the shared parts, with no visual change
  - [x] `npm test` and `npm run test:e2e` green with no test rewrites (behaviour identical)

### QOL-2 — Whole-codebase review passes

- **status:** done
- **priority:** P2
- **effort:** M
- **blocked_by:** none
- **files:** `src/lib/components/ui/Modal.svelte`, every `.svelte` with a table
- **why:** The code had never had a holistic pass — every review before this was scoped to
  the milestone being shipped.

#### Fixed here

- **Modal had no focus trap and no focus restore.** It declared `aria-modal="true"`, which is
  a promise that the rest of the page is inert, while the browser kept focus on the button
  behind the overlay and Tab walked straight back into the page underneath. A keyboard or
  screen-reader user was told they were in a dialog while standing outside it. Now traps Tab
  in both directions, focuses the first control on open, and hands focus back to the trigger
  on close. This is the single highest-impact a11y fix available, because all 13 list pages
  route their delete flow through this component.
- **The Modal close button had no accessible name** — it was a bare `×`. Now
  `aria-label="Close dialog"`.
- **110 `<th>` elements across 17 files, none with `scope`.** Every table in the app.
  Screen readers could not reliably associate a cell with its column header, which on a
  utility-bill or reconciliation table is the difference between a number meaning something
  and meaning nothing. All now carry `scope="col"`.

#### Reviewed and found clean — don't re-audit

- **Write authorization is complete.** Every action under `(app)` calls
  `requireRole(locals.user, WRITE_ROLES)`; the only action files without it are `/login` and
  `/logout`, correctly.
- **Document storage is sound.** `storedName` is a fresh `crypto.randomUUID()`, so a
  user-supplied file name never reaches a filesystem path; the download route forces
  `Content-Disposition: attachment` with a sanitised filename and `X-Content-Type-Options:
nosniff`, so uploaded content cannot execute in the app's origin. A failed DB write unlinks
  the orphaned file.
- **No N+1 queries.** Every list service resolves its references with `leftJoin`, and the
  aggregate pages (`/connections`, `/facilities`, `/reconciliation`) issue a fixed number of
  queries via `Promise.all` and then group in memory. The only loops containing a query are
  the CSV importers, which are bounded by file size and run inside one transaction.
- **Form labels are correct** — `FormField.svelte` wraps its control, associating the label
  implicitly.

#### Filed, not fixed

- **`SEC-1`** — cross-tenant read access. Far too large for a review PR; see below.

- **acceptance:**
  - [x] a11y pass over forms, tables and modals
  - [x] security review of auth, RBAC, upload and download paths
  - [x] findings either fixed or filed as their own TODO items

### QA-1 — A malformed id in a URL returned 500 instead of 404

- **status:** done
- **priority:** P1
- **effort:** S
- **blocked_by:** none
- **files:** `src/params/uuid.ts`, `src/lib/utils/uuid.ts`, `src/hooks.server.ts`,
  `src/routes/+error.svelte`, `src/routes/(app)/+error.svelte`,
  `tests/e2e/error-handling.spec.ts`
- **why:** Every id column is a Postgres `uuid`, so a malformed id didn't come back empty —
  it made the _query_ fail (`invalid input syntax for type uuid`, confirmed directly against
  the database). That throw was unhandled, so `/clients/not-a-uuid` rendered a **500** where
  it plainly means 404. **18 routes** and **11 list filters** were exposed.
- **shipped:**
  - A **route matcher** (`[id=uuid]`), not a per-route guard. SvelteKit answers 404 before any
    load runs, and a new detail route cannot forget it — 12 `[id]` directories renamed.
  - `optionalUuid` for the list filters: a junk `?client=` is **ignored** rather than fatal,
    because a filter is a UI affordance, not an assertion about the data.
  - A **`handleError` hook**. `requestLogging` already minted a `requestId` per request but
    nothing logged the one event worth correlating — the failure. The message returned is
    deliberately generic (a raw exception can carry a connection string), so the id is what
    makes a production 500 traceable.
  - `+error.svelte` at the root and inside `(app)`, showing the status, a safe message and
    the request id to quote. There was no error page at all before; every failure rendered
    SvelteKit's unstyled default.
- **trap worth remembering:** the matcher first imported `isUuid` from `$lib/server`.
  `svelte-check` passed and the **build** failed with
  `vite-plugin-sveltekit-guard: An impossible situation occurred` — param matchers run on the
  client too. The helper lives in `$lib/utils/uuid.ts` for that reason.
- **acceptance:**
  - [x] malformed ids 404 across detail, edit and the download endpoint
  - [x] a well-formed id that matches nothing still 404s — the guard doesn't swallow it
  - [x] malformed list filters render the list instead of erroring
  - [x] unhandled errors are logged against their request id and the page shows it

### QA-2 — Five services shipped with no tests

- **status:** done
- **priority:** P1
- **effort:** M
- **blocked_by:** none
- **files:** `tests/unit/audit.test.ts`, `providers.service.test.ts`,
  `rate-schedules.service.test.ts`, `utility-accounts.service.test.ts`,
  `analysis.service.test.ts`
- **why:** ~506 lines of service code had **no unit coverage at all**, and the refactor in
  `QA-3` was about to move code underneath it. `audit.ts` was the worst of them:
  `diffRecords` is the compliance backbone — every mutation in the app records its change
  through it — and what it _omits_ matters as much as what it keeps, because an audit trail
  that quietly drops a field looks complete while being wrong.
- **shipped:** 52 tests. `diffRecords` is now pinned on the cases that are easy to get wrong
  — undefined vs null treated as the same absence, keys absent from the new record meaning
  "not part of this write" rather than "removed", `createdAt`/`updatedAt` always excluded,
  dates compared by value, arrays and `jsonb` compared structurally, and a numeric string
  held distinct from a number. All 14 passed first run, so this locks in correct behaviour
  rather than fixing broken behaviour.
- **one test asserts a known defect on purpose:** `analysis.service.test.ts` has a test named
  `KNOWN GAP: a complex master meter reading has no building and no client`. That is the
  `ANALYTICS-1` bug — the reading query reaches the client through `buildings.client_id`, so
  a meter whose premise is a _complex_ lands unattributed. Pinning it means the fix is a
  deliberate edit here rather than a surprise. **Update it when `ANALYTICS-1` lands.**
- **acceptance:**
  - [x] every service under `src/lib/server/services/` has a unit test
  - [x] `diffRecords` covered including its exclusions
  - [x] the analysis dataset covered before `ANALYTICS-1` rewrites it

### QA-3 — Targeted refactor of the route and service duplication

- **status:** done
- **priority:** P2
- **effort:** M
- **blocked_by:** none
- **files:** `src/lib/server/actions.ts`, `src/lib/server/services/audited.ts`,
  `src/lib/server/services/pagination.ts`, `src/lib/schemas/helpers.ts`, and the services and
  list routes that now use them
- **why:** Six milestones built independently left the same shapes copied across the route and
  service layers. Measured before: 24 validate-and-save blocks, 24 `as z.ZodError` casts, 13
  delete actions, 13 transaction-plus-audit trios, 9 services importing `Paginated` from a
  sibling entity service.
- **shipped:**
  - **`fieldErrors` made generic over `ZodError<T>`.** Every call site carried
    `parsed.error as z.ZodError` because zod v4 returns the generic form and the signature
    took the bare one. **24 casts deleted** — a cast repeated everywhere is a signature that
    doesn't fit, not a language limitation.
  - **`deleteAction({ entity, remove, … })`** replaces the 13 hand-written delete actions,
    keeping the exact wording each produced so `ConfirmDelete`'s `deleteError` path is
    unchanged. It also folds in the FK-conflict case `/utilities/providers` handled by hand,
    so a delete blocked by a reference is a **409 with a reason** rather than a 500.
  - **`auditedInsert` / `auditedUpdate` / `auditedDelete`** carry the transaction-plus-audit
    ceremony for the **9** services whose CRUD is canonical. The invariant that every mutation
    writes `audit_log` in the same transaction was previously restated 13 times and could
    therefore be got wrong in one of them.
  - **`Paginated` moved** to `services/pagination.ts` with `pageBounds`/`paginate`.
- **type safety was the deciding constraint.** The helpers are generic over the table
  (`InferInsertModel<T>` / `InferSelectModel<T>`), so callers keep full checking; the casts
  Drizzle's builder generics force are confined to that one file. **Verified** by passing a
  non-existent column and confirming `svelte-check` still rejects it — without that the
  extraction would have traded compile-time safety for line count, which is a bad trade in a
  codebase whose point is auditable correctness.
- **not converted, deliberately:** `meters` (premise validation), `projects` (join table),
  `energy-readings` and `documents` (bespoke create paths), and the 24 create/edit route
  actions, several of which carry per-entity logic. The repeated _mechanism_ is shared; the
  repeated _shape_ stays visible.
- **one regression, caught by the tests written first:** `createTask` was not canonical — it
  inserted `createdBy: actorId` alongside `toRow(input)`, and the conversion dropped it. The
  `tasks` spec failed immediately. This is the whole argument for the defects → tests →
  refactor ordering, and it is why `QA-2` came first.
- **result:** src net **−276 lines**, with **no existing test modified** — the contract for a
  refactor.
- **acceptance:**
  - [x] zero `as z.ZodError` casts
  - [x] the delete action exists once
  - [x] `Paginated` no longer imported from an entity service
  - [x] existing suites pass unmodified; e2e green three consecutive runs

### SEC-1 — A client-role user can read every other client's data

- **status:** todo
- **priority:** P0
- **effort:** L
- **blocked_by:** none — but the data model question below should be answered first
- **files:** `src/lib/server/db/schema.ts` (the `user` table), `src/lib/server/authz.ts`,
  every `list*`/`get*` in `src/lib/server/services/`, `src/hooks.server.ts`
- **why:** **There is no tenant scoping anywhere.** The `user` table has no `client_id`, no
  load function filters by the viewer's client, and `requireRole` only gates _writes_. The
  role system controls what you may change, not what you may see.

  This is not theoretical. Signed in as the seeded `viewer@demo.com` (role `client`):
  - `/clients` lists **both** State University and Tech College
  - `/utilities/bills` renders **26 bill rows** spanning both tenants

  For a consultancy whose customers are universities, hospitals and federal sites, that means
  any client login can read another client's consumption, spend and documents. It is the most
  serious defect in the codebase.

- **why it was missed:** `tests/e2e/authorization.spec.ts` asserts a client-role user cannot
  _create_ a client — and its own comment says "Pages render (read access)", treating
  unrestricted read as intended. The test encodes the bug as correct behaviour.
- **open question to answer first:** what a user is scoped _to_. A `client` user maps to one
  client, but a **consultant** manages a portfolio of several, so `user.client_id` alone is
  not enough — this likely needs a `user_clients` join table, with `admin` unscoped.
  Decide before writing the migration.
- **approach once decided:** scope at the **service** layer, not per route, so a new route
  cannot forget it; pass the viewer (or a resolved set of visible client ids) into every
  `list*`/`get*`. A `get*` that resolves an id outside the viewer's scope must 404, not 403 —
  a 403 confirms the record exists.
- **acceptance:**
  - [ ] scoping model decided and recorded in `ARCHITECTURE.md`
  - [ ] every read path filtered by the viewer's visible clients; `admin` unscoped
  - [ ] direct-id access to an out-of-scope record 404s
  - [ ] `authorization.spec.ts` rewritten — it currently asserts the bug is correct
  - [ ] service tests covering a client user, a consultant with two clients, and an admin

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
- **followed up by:** `WEATHER-1` (the CSV import, shipped) and `ALLOC-2` (change-point
  models, still open).
- **acceptance:**
  - [x] a method that normalises the basis against degree days for the bill period
  - [x] the persisted `basis` snapshot records the weather source and model fit
  - [x] falls back to the un-normalised basis, with a warning, when data is insufficient

### WEATHER-1 — Degree-day CSV import

- **status:** done
- **priority:** P1
- **effort:** S
- **blocked_by:** none
- **files:** `src/lib/schemas/degree-days.ts`,
  `src/lib/server/services/degree-days.ts`, `src/routes/(app)/energy/degree-days/`,
  `src/lib/components/utilities/BillAllocation.svelte`
- **why:** `weather_normalized` was the most defensible allocation method available and the
  only way to get weather into the system was `INSERT` by hand, so in practice selecting it
  produced a silent fall-back to an area split. The method existed but was unreachable.
- **decisions worth keeping:**
  - **Rows upsert on `(station, period, base_temp_f)`.** Weather series get revised at
    source. An insert-only importer would either reject a corrected file wholesale or double
    the heating load for every month it already had. `inserted` vs `updated` are reported
    separately so a revision is visible as a revision.
  - **Base temperature is part of the key, not a setting.** The same month at a 65°F and a
    60°F base are different series; merging them would make the shares incomparable.
  - **An absent `base_temp_f` column defaults to 65°F with a notice; a blank cell is an
    error.** `z.coerce.number()` turns `''` into `0`, and a month with genuinely zero cooling
    is ordinary — so a blank CDD would have become a real-looking measurement nobody
    recorded. Caught by a unit test, and the reason `requiredNumber` exists in the schema.
  - **One audit row per import run, not per month.** Twenty-four rows of weather logged as
    twenty-four audit entries buries the fact that matters: who replaced which series, when,
    over what span. The per-series breakdown lives in the `changes` payload.
  - **Coverage is shown before the split runs.** Picking `weather_normalized` now lists the
    stored series and month counts, so the operator sees there is nothing to fit against
    rather than discovering the fall-back from a warning afterwards.
- **acceptance:**
  - [x] CSV import mirroring the bill/reading importers, with a downloadable template
  - [x] re-import replaces rather than duplicates; unit test asserts the row count is stable
  - [x] one audit row per run, carrying station, span and counts
  - [x] `/energy/degree-days` lists the series and its coverage
  - [x] the allocation form states what weather is on hand

### ALLOC-2 — Change-point (3P/5P) baseline models

- **status:** todo
- **priority:** P3
- **effort:** M
- **blocked_by:** none
- **files:** `src/lib/server/services/regression.ts`,
  `src/lib/server/services/weather-normalization.ts`
- **why:** The current model regresses usage on HDD and CDD at a **fixed** 65°F base. The
  balance point is properly a _fitted_ parameter — the outdoor temperature at which a
  particular building starts heating or cooling — and it varies with envelope, internal
  gains and schedule. ASHRAE Guideline 14 and IPMVP both treat change-point models as the
  standard form for this reason; a fixed base systematically misfits buildings whose real
  balance point is far from 65°F, and those are exactly the buildings an allocation is most
  likely to treat unfairly.
- **approach:** fit 3P (heating- or cooling-only) and 5P forms by searching the balance
  point, and keep whichever model wins on CV(RMSE) subject to the existing G14 gate. The
  `fit` recorded in `basis` gains the fitted balance point so the choice is auditable.
  Degree days would then need to be stored at several bases, or storage moves to mean
  monthly temperature — decide which before building.
- **acceptance:**
  - [ ] 3P/5P fitting with a searched balance point, unit-tested against known coefficients
  - [ ] model selection recorded in the persisted `basis`, not just the winning coefficients
  - [ ] existing fixed-base behaviour still available and still passes its tests

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

- **status:** done
- **priority:** P3
- **effort:** S
- **blocked_by:** none
- **files:** `playwright.config.ts`, `tests/e2e/global-setup.ts`, `.github/workflows/ci.yml`
- **why:** The suite ran against seeded `puds_dev` and left `E2E …` rows behind, so dev data
  accumulated run over run and specs that assume seeded data started failing until someone
  re-created the database by hand. The workaround was documented rather than fixed, and it
  cost several sessions.
- **shipped:** a Playwright `globalSetup` that drops (`WITH (FORCE)`, so a leftover
  connection can't block it), recreates, migrates and seeds `puds_e2e` before every run.
  The `webServer` is pointed at that database.
- **decisions worth keeping:**
  - **`E2E_DATABASE_URL` never falls back to `DATABASE_URL`.** Inheriting it would put the
    run back on `puds_dev` — and the run _starts by dropping_ whatever it points at, so a
    silent fallback would be destructive rather than merely wrong.
  - **The setup reuses `scripts/seed.ts`** instead of an e2e-only fixture, so the demo data
    the suite asserts against can't drift from what a developer sees.
  - **CI's `db:migrate` / `db:seed` steps were removed from the e2e job** — they seeded
    `puds_dev`, which the suite no longer reads. The unit-test job keeps its own `puds_test`
    setup.
- **verified:** row counts in `puds_dev` (clients, buildings, meters, readings, tasks,
  degree days, documents) identical before and after four consecutive full runs, and a cold
  run with `puds_e2e` absent passes — which is the state CI is in every time.
- **acceptance:**
  - [x] e2e runs leave `puds_dev` unchanged
  - [x] CI unaffected

### TEST-2 — Intermittent e2e failures in full-suite runs

- **status:** todo
- **priority:** P2
- **effort:** M
- **blocked_by:** none — needs a reproduction before it needs a fix
- **files:** `playwright.config.ts`, `tests/e2e/`, and whatever the reproduction implicates
- **why:** Roughly **one full-suite run in three or four** fails a single test, and it is
  **not always the same test**. Observed across a session of ~30 runs:
  - `clients CRUD › creates, edits, and deletes a client` (×2)
  - `sidebar navigation › facility management hub links the hierarchy and shows counts` (×1)
  - `analysis › loads the Perspective viewer with the dataset` (×1 — but that one is
    `ANALYSIS-1`, which is separately documented as intermittent; don't conflate them)

  This item was first filed as "intermittent failure in the client delete journey". That was
  **too narrow** — the delete journey was simply the first instance seen. Whatever this is,
  it is not specific to one component.

- **what has been ruled out:**
  - **Not `TEST-1`.** It occurred both before and after the e2e database change, and
    `puds_dev`/`puds_e2e` contents were verified identical across runs.
  - **Not `ENV-1`.** The e2e suite runs the built server with its environment supplied
    explicitly by `playwright.config.ts`; `vite.config.ts` is not involved at runtime.
  - **Not data accumulation.** The suite reseeds a fresh database every run.
  - **Not reproducible in isolation** — 12 consecutive runs of `clients.spec.ts` alone were
    green, as were 12 consecutive full-suite runs immediately after two failures.
- **why it is easy to miss:** `playwright.config.ts` sets `retries: process.env.CI ? 1 : 0`,
  so CI silently retries and stays green. Only a local run surfaces it.
- **what to try next:** the "different test each time, only under the full suite, never in
  isolation" shape points at a shared-resource or timing problem rather than a component
  race — the single worker, the one long-lived `node build/index.js` server and its
  connection pool, or container CPU contention late in a run. Capture a failing run with
  `--trace on` and compare server-side timing against a passing one before touching any
  component. Reproducing under deliberate CPU load (`--repeat-each`, or a background
  busy-loop) is the cheapest way to raise the hit rate.
- **acceptance:**
  - [ ] a reliable reproduction, or evidence it is gone
  - [ ] the cause fixed where it lives, not papered over by enabling local retries

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
