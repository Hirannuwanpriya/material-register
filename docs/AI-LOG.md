# AI-LOG

One entry per feature: the plan, what each agent did, QA and review results, and what the
human corrected. Entries are appended by the main thread. Nothing here is invented.

---

## 2026-11-13 Phase 0: Skeleton

**Scope:** CLAUDE.md Section 17 Phase 0, skeleton only. Groundwork for R8.1 and R5.3. No features.

**Plan (approved by the human):** backend-engineer -> frontend-engineer -> qa-tester -> spec-reviewer.
Main thread fixes `.gitignore` and creates `docs/`. No commit.

**Human decisions**
- Add `cors`. Load env with Node's `--env-file` / `process.loadEnvFile()` instead of `dotenv`.
- Delete the root `.env.example`; its values now live in `api/.env.sample` and `web/.env.sample`.
- Keep `SCHEMA.md` git-ignored.
- Keep `isbot` (React Router 7's CLI added it for its default SPA entry; the alternative was a
  hand-written `entry.server.tsx`). Recorded in CLAUDE.md Section 2 with `cors` and `@react-router/node`.

**What each agent did**
- **main thread:** rewrote `.gitignore` (old lines had leading spaces, so nothing matched; added
  `.env`, `node_modules`, `build`, `.react-router`), created `docs/AI-LOG.md` and
  `docs/README-TEMPLATE.md`, removed `.env.example`, updated CLAUDE.md Section 2.
- **backend-engineer:** rewrote `docker-compose.yml` to Section 5 (container
  `material-register-agents-db`, `5433:5432`, volume `pgdata_agents`, 5s `pg_isready` healthcheck).
  Scaffolded `api/` (Express 5.3, tRPC 11.28, Zod 4.6, Drizzle 0.45 / kit 0.31, TS 5.9): `/health`,
  CORS limited to `WEB_ORIGIN`, empty `appRouter`, pool + drizzle, placeholder schema, fail-fast on
  missing env. Deviations accepted by review: `allowImportingTsExtensions`; `onError` logs only
  `INTERNAL_SERVER_ERROR`; kept `restart: unless-stopped`.
  - Side effect: because the old compose file used the same service name `db`, `docker compose up -d`
    replaced the old `material-register-db` container. Its volume `material-register_pgdata` was not touched.
- **frontend-engineer:** set up `web/` by hand on React Router 7.18.5 (SPA, `ssr: false`), React 19.3,
  Vite 7.3, Mantine 9.8, TanStack Query 5, tRPC client 11.28. `root.tsx` with Layout, providers,
  HydrateFallback, ErrorBoundary; one placeholder route; `lib/trpc.ts` with the only
  `import type { AppRouter }`; extra `app/env.d.ts` to type `VITE_API_URL`.
- **qa-tester:** PASS on all 10 checks (both typechecks, web build, RR 7.x, DB healthy on 5433,
  `/health`, CORS, unknown procedure 404, type-only import, gitignore, env samples).
- **spec-reviewer:** CHANGES NEEDED, root `.nvmrc` missing (Sections 2, 4, 14).
  -> backend-engineer added `.nvmrc` (`22`) -> qa-tester PASS -> spec-reviewer **APPROVE**.

**Deferred suggestions (not applied, for the human):** `app.disable("x-powered-by")`; list
`@trpc/server` in web devDependencies; `isbot` version range and ordering; move the env check above
the env reads in `api/src/index.ts`; `git rm --cached .DS_Store`.

**What the human corrected:** chose to keep `isbot`; no other corrections in this phase.

**Not committed.**

---

## Phase 1: Database (R1.1 to R1.5), 2026-11-13

**Plan (approved by the human):** backend-engineer -> qa-tester -> spec-reviewer. No UI work.
Scope: `api/src/db/schema.ts`, new `api/src/db/seed.ts`, generated `api/drizzle/`.

**What each agent did**
- **backend-engineer:** wrote the enums, the `plants` / `manufacturers` / `materials` tables and the 5 B-tree
  indexes (type, status, plant_id, manufacturer_id, updated_at), all per Section 6. Generated
  `drizzle/0000_thankful_deadpool.sql`, read it, migrated. Seed: 26 templates pairing items with real
  makers (59 manufacturers), 8 plants, 20,000 materials in batches of 1,000, about 1.8s. Choices it made
  that CLAUDE.md does not cover: a fixed `refDate` (2026-11-01) so the dates repeat on every run;
  TRUNCATE and inserts in one transaction; neutral MPN prefixes (`VB-####`); MPNs not unique.
  It noted that the default shell runs an old Node, so commands need `nvm use 22`.
- **qa-tester:** PASS on all 11 checks. Counts were 8 / 59 / 20,000; status split 74.5 / 15.5 / 10.0;
  md5 `ccc45f90...` was identical across 3 re-seeds; `db:generate` reported no changes; a bad
  `SEED_COUNT` exits 1 and leaves the data intact; no pg_trgm. A fresh-volume migration was not tested
  (it needs `down -v`).
- **spec-reviewer:** **APPROVE**, no blocking issues; it approved all 5 choices above.
  Non-blocking suggestions: the oil price range is shared by 20L pails and 205L drums; "bearing"
  searches also match bearing pullers (keep as a demo talking point).
  Gap it found: R1.3 says index every sort column, but Section 6 has no index on `description`,
  `unit_price` or `stock_qty`. That decision is open for the human.

**What the human corrected:** nothing yet. The R1.3 sort index decision is pending.

**Not committed.**
