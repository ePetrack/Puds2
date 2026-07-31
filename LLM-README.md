# LLM-README

**Read this before doing anything else.** It exists because the traps below have each cost a
previous session real time. Everything here is non-obvious and verified.

## Which file to read

Don't read them all. Pick one:

| Need                                | File                                           |
| ----------------------------------- | ---------------------------------------------- |
| Conventions, commands, domain rules | `CLAUDE.md`                                    |
| Why the design is what it is        | `ARCHITECTURE.md`                              |
| What's left, and what's been tried  | `TODO.md` — check `blocked_by` before starting |
| Environment traps                   | this file                                      |

`TODO.md` items record failed approaches under **"what did NOT work"**. Read that before
attempting an item; it is there specifically so you don't repeat a dead end.

## Environment bring-up

Nothing is running when a session starts. In order:

```bash
pg_ctlcluster 16 main start          # Postgres is NOT running; no error message says so
set -a; source .env; set +a          # still needed for vitest/playwright/tsx — see below
npm run db:migrate                   # only safe skip is if you know nothing new landed
```

`npm run dev` and `npm run preview` now read `.env` themselves (ENV-1). Everything else —
Vitest, Playwright, `tsx` scripts — does not, so keep sourcing `.env` in the shell.

`pg_ctlcluster` is Debian-specific — that is the **container**. On macOS the equivalent is
`brew services start postgresql@16`.

If the databases are missing:

```bash
su postgres -c "psql -c \"CREATE ROLE puds LOGIN PASSWORD 'puds' SUPERUSER\""
su postgres -c "createdb -O puds puds_dev && createdb -O puds puds_test"
npm run db:migrate                                                  # puds_dev
DATABASE_URL="postgres://puds:puds@localhost:5432/puds_test" npm run db:migrate
npm run db:seed
```

**Postgres dies when the container is reclaimed.** A wall of `ECONNREFUSED 127.0.0.1:5432`
in Vitest means restart it, not that you broke something.

E2E needs a browser path:

```bash
PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npx playwright test
```

## Traps that have already cost time

- **`svelte-check` does not catch `$lib/server` leaking into the browser — the build does.**
  Importing a server module (even for a constant) into a `.svelte` file typechecks fine and
  then fails `npm run build`. Shared client/server values belong in `src/lib/schemas/`.
- **A stale local database shows up as a 500, not as a migration warning.** Nothing checks
  for pending migrations at boot, so a missing table surfaces as
  `Failed query: select … from "bill_allocations"` from whichever service touches it first.
  Run `npm run db:migrate` after every pull.
- **A Zod `.default()` makes the field _required_ on the inferred input type**, so every
  hand-constructed fixture must supply it. Use `.optional()` and default in the service.
- **`z.coerce.number()` turns `''` into `0`.** On a CSV import that silently converts a blank
  cell into a real-looking measurement. Preprocess blanks to `undefined` first — see
  `requiredNumber` in `src/lib/schemas/degree-days.ts`.
- **Use Drizzle's `inArray`, not `` sql`x = any(${array})` ``** — the raw form binds the
  array as a scalar and Postgres rejects it with `malformed array literal`.
- **Adding a value to an existing `pgEnum` needs its own migration** (`ALTER TYPE … ADD
VALUE`); it can't share a file with a table creation.
- **`db:generate` invents random migration names.** Rename the file and update the matching
  `tag` in `drizzle/meta/_journal.json`, or the migration won't be found.
- **Don't pipe a check through `tail`** — it masks the exit code and a failing gate looks
  green.
- **E2E builds its own database** — `globalSetup` drops, recreates, migrates and seeds
  `puds_e2e` on every run, so `puds_dev` is never touched and no manual re-seed is needed.
  Override with `E2E_DATABASE_URL`. Don't point it at `puds_dev`: the run starts by dropping
  it.

## Known-flaky — do not investigate from scratch

- **`/analysis` Perspective boot (`ANALYSIS-1`).** The `<perspective-viewer>` element
  silently never registers after any earlier page load in the same browser process. It
  **reproduces on the default branch**; memory, SSR payload size, dataset shape and external
  fetches are all ruled out **with evidence** in `TODO.md`. Two previous sessions
  misdiagnosed it — once as caused by a code change it did not cause. Read the item, don't
  re-bisect. Widening the analysis dataset makes it reliable rather than occasional, which
  is why a naive bisect will incriminate the wrong thing.

  **Root cause is established:** Perspective calls `customElements.define` from _inside_ its
  WASM (a wasm-bindgen `bootstrap` callback), so `await import('@finos/perspective-viewer')`
  resolving proves nothing and no error is raised. `TODO.md` records four attempts and where
  the remaining trap is. The reproduction is checked in as
  `tests/e2e/analysis-boot.spec.ts`, marked `test.fixme` — lift it as part of the fix rather
  than writing a new one.

## Gate and shipping

```bash
npm run lint && npm run check && npm test && npm run test:e2e
```

- Work branch is in `TODO.md`. **The default branch is not `main`.**
- **Merged PRs are never reused.** Restart the branch from the current default and open a
  new PR. An unmerged PR can take more commits.
- Every mutation writes `audit_log` in the same transaction (`recordAudit` + `diffRecords`).

## Two habits this codebase expects

- **Pure logic is split from persistence** so it unit-tests without a database:
  `bill-allocation-math.ts`, `reconciliation-math.ts`, `regression.ts`, `meter-chain.ts`.
  Put new arithmetic in that shape.
- **Missing data is never silently zero.** Absent readings, unrecorded ownership and
  unfittable models all surface as an explicit state with a reason, because a number that
  quietly assumes zero is how an energy report ends up asserting something untrue. If you
  find yourself defaulting a missing input, make it a typed error or a reported gap instead.
