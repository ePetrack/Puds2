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

## Perspective / `/analysis` — fixed, but easy to break again

`ANALYSIS-1` is **resolved**. Two rules keep it that way; both are load-bearing and neither
is obvious:

- **Perspective must be told where its WASM is.** `<perspective-viewer>` is registered from
  _inside_ the viewer's WASM, so importing the package is not enough — without
  `init_client(...)` the element silently never appears, the import still resolves, nothing
  throws, and `@finos/perspective` (which reads its client off that element) fails with
  "Missing perspective-client.wasm". The message names a file; the missing thing is the
  element.
- **Hand `init_client`/`init_server` an `ArrayBuffer`, never a `Response`.** The binaries are
  self-extracting, and the unpacker's failure path is `new Uint8Array(input)` — which for a
  `Response` yields **zero bytes** and produces a module that traps on `unreachable` with no
  JS frames. `fetch(url).then((r) => r.arrayBuffer())`, and leave stage 0 enabled.

`tests/e2e/analysis-boot.spec.ts` is the regression test: a warm-up navigation, then the
assertion that the custom element registered. Keep the warm-up — the bug only ever appeared
after an earlier page load in the same browser process, which is why the ordinary
`/analysis` spec passed while the page was broken.

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
