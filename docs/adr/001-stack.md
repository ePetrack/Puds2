# ADR-001: SvelteKit full-stack + PostgreSQL + Drizzle replaces PocketBase

Date: 2026-07-18 · Status: Accepted

## Context

The first four phases of the platform were built on PocketBase (single-binary BaaS over
SQLite) with a SvelteKit SPA talking to it from the browser. That was fast to prototype
but unfit for long-term enterprise use:

- Authentication and authorization were enforced only in the browser; the API was
  effectively open to any authenticated user for any operation.
- No test suite, no CI, no migrations discipline (schema lived in one hand-written
  migration tied to PocketBase's JS VM and version).
- Business logic lived inside Svelte components, unreusable and untestable.
- SQLite + single binary limits concurrent writes, managed hosting options, tooling,
  and hiring familiarity.

## Decision

Rebuild on:

- **SvelteKit (Svelte 5) full-stack** — server `load`/form actions become the API layer;
  one codebase and one deployable; progressive enhancement by default.
- **PostgreSQL 16** — the boring, proven enterprise database.
- **Drizzle ORM + drizzle-kit** — SQL-first typed schema in TypeScript with committed,
  versioned migrations.
- **better-auth** — server-side sessions in Postgres, email/password now, room for
  SSO/2FA later; RBAC enforced in server hooks and services.
- **Vitest + Playwright + GitHub Actions** — tests against real Postgres and a CI gate
  on every push.

Domain knowledge from the prototype (schema shape, utility bill math, anomaly detection)
is ported into typed, tested service modules in later milestones.

## Alternatives considered

- **Separate API service (NestJS/Fastify) + SPA** — cleaner separation and independent
  scaling, but double the code and ops surface for a small team; nothing in the domain
  requires it yet. The service layer keeps a later extraction cheap.
- **Supabase** — real Postgres and much closer to enterprise-grade than PocketBase, but
  still an external platform dependency; self-owned auth/business logic was preferred.
- **Keep PocketBase, harden it** — server-side rules and hooks exist, but they live in
  a JS VM inside the binary, hard to test and version; the ceiling stays low.

## Consequences

- All reads/writes now go through server code where authorization, validation, audit
  logging, and logging are enforced.
- Developers need Docker (or any Postgres) locally; `docker compose up -d db` is the
  one-time cost.
- PocketBase-era code remains in git history (pre-reset commits) for reference.
