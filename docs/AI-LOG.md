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

---

## Phase 2: List API + Phase 3: Table, pagination, sorting, URL state, 2026-11-13

Requirements: R2.1–R2.3, R3.1, R3.2, R4.1, R4.2, R5.1–R5.3, R6.4. The human also asked for an R1.3 follow-up (sort indexes) and the CORS fix.

**Plan:** the human asked for `routers/materials.ts`, then `routers/plants.ts`, then "R3" on the front end.
The main thread pointed out that `web/` had no table or URL state yet. The human chose **strict phase order**: Phase 3 first,
then search (R3.3) after. Each piece went through engineer -> qa-tester, with one combined spec review.

**What each agent did**
- **backend-engineer (materials.list):** Zod input with caps (search 100, filter lists 50, pageSize 10–100).
  `escapeLike` for `%`/`_`/`\`, `and()` of optional conditions, a sort allow-list with `asc(id)` as tie-breaker,
  LIMIT/OFFSET, and `Promise.all` for the page plus `$count`. Its own decisions: `pageCount` is at least 1; `.prefault({})` (Zod v4);
  the sortBy enum is built from the allow-list keys.
- **backend-engineer (plants.list):** 8 plants ordered by code, with no `.input()` because it takes none.
- **qa-tester:** plants.list PASS (6/6). materials.list: every count matched psql, but **FAIL on CORS**.
  `cors({ origin: "<string>" })` sends that origin back to every requester.
- **Human decisions:** fix CORS; add **sort indexes (option A)** on description, unit_price and stock_qty;
  Phase 3 before search.
- **backend-engineer:** set CORS to `origin: [webOrigin]`, with a type-narrowing ternary. Migration
  `0001_first_colonel_america.sql` adds 3 B-tree indexes (176 / 464 / 192 kB). Sorts now use an index scan (0.15–1.1 ms).
  qa-tester PASS.
- **frontend-engineer (Phase 3):**
  - `table-state.ts` covers the full URL contract (q, type, status, plant, sort, dir, page) with defensive parsing.
  - `format.ts` holds the en-AU formatters.
  - `MaterialsTable` has the 9 columns, a `SortableTh` with `aria-sort`, skeleton rows, and 60% opacity while refetching.
  - The page handles pagination, the result count, and a past-last-page jump with `replace: true`.
  - No search or filter UI, and the empty/error states are minimal, by design.
  - qa-tester PASS, without a browser.
- **spec-reviewer:** **CHANGES NEEDED**. `plantIds:[3000000000]` returned **500 and leaked SQL**, because plant_id is int4.
  Both the API and the URL parser were affected.
  -> backend-engineer added `PG_INT_MAX`, and frontend-engineer added `MAX_PLANT_ID` -> qa-tester **FAIL**.
  QA's wider sweep found a second 500: **a NUL byte in the search** (Postgres 22021), also reachable from `?q=`.
  -> backend-engineer strips NUL with `.overwrite()` before trim and max, and frontend-engineer strips NUL from `q`
  -> qa-tester **PASS** (67 unusual inputs, 0 responses of 500 or above, no SQL in any body)
  -> spec-reviewer **APPROVE**.

**Process note:** `78ea4a9` (materials.list) and `4dff266` (plants.list) were committed by the human
before spec review; plants.list was committed while its QA was still running. The int4 bug was therefore in committed code. It was fixed
in the working tree, and history was not rewritten.

**Open / deferred:**
- Mask INTERNAL_SERVER_ERROR messages and stacks in a tRPC errorFormatter (recommended; not yet decided).
- Browser click-through (sorting, paging, Back/Forward, visual layout, error state with the API stopped).
- README notes: the cost of the 3 extra indexes; the B-tree row-size limit on `description`; `Vary` overwritten by tRPC;
  stack traces outside production; 431 on very long URLs.
- An unknown process holds port 5173 (PID 76134).

**What the human corrected:** they chose strict phase order instead of combining Phase 3 with R3, and option A for the sort indexes.

---

## Search box (R3.1–R3.3, search part of R6.4), 2026-11-13

**Plan:** this was front-end only; R3.1/R3.2 were already done in the API. Chain: frontend-engineer -> qa-tester -> spec-reviewer.
Scope: the `MaterialFilters` component with the search box only. The R4 MultiSelects and Clear all were deferred.

**What each agent did**
- **frontend-engineer:** wrote `material-filters.tsx`, which is presentational: a "Search" label and description, an icon,
  `maxLength 100`, and a clear button with an aria-label. In `routes/materials.tsx` it added the local `searchText`,
  `useDebouncedValue(trim, 300)`, a push effect that writes the URL with `replace: true`, a sync effect for URL changes
  made elsewhere (Back/Forward, a pasted link), and a clear handler that writes the URL immediately.
- **qa-tester:** **FAIL**. Once the box had settled, Back/Forward was reverted. The push effect had `state.search` in its
  dependencies, so a URL change made elsewhere re-ran it while `searchText` still held the newer value.
  **The guard that caused this was suggested in the main thread's brief, so the mistake was the main thread's, not the engineer's.**
- **frontend-engineer:** narrowed the push effect's dependencies to `[debouncedSearch]` and kept the
  `=== searchText.trim()` check. That check guards a real race: the debounce timer and the Back re-sync can land in the same render.
- **qa-tester:** **PASS**, based on hand traces of 13 scenarios checked against the React 19 and Mantine 9.8.0 source.
  Low-severity finding: in rare timing cases, the box and the URL can stay out of step until the next edit.
- **spec-reviewer:** **APPROVE**, nothing blocking. It recommended the optional one-token fix
  `[debouncedSearch, searchText]` together with comment updates.

**Open:** the human decides on the optional deps change. Browser checks are still to do: request count for a 7-letter
word, real Back/Forward, focus after clear, layout. Minor items: the clear button also shows when the box holds only spaces.

**What the human corrected:** nothing in this feature so far.

---

## Filters (R4.1–R4.3, filter part of R6.4), 2026-11-13

**Plan:** front-end only. The API's AND/OR logic and `plants.list` were already approved. Chain: frontend-engineer -> qa-tester -> spec-reviewer.

**What each agent did**
- **frontend-engineer:** added Type, Status and Plant MultiSelects to `MaterialFilters`.
  - Plant labels read `1000 · Brisbane`.
  - Plant ids are strings only inside the component, because Mantine option values are strings.
  - A fallback "Plant <id>" pill shows for an id that has no option.
  - Added `plants.list` with a 1-hour staleTime. The Plant select is disabled while plants load or after a load error.
  - Filter changes are history pushes that reset to page 1.
  - Clear all is a single push that keeps sort and direction. It also calls `setSearchText("")` directly, so a search that has not been debounced yet cannot write itself back. The main thread's brief flagged this trap in advance.
  - Did not touch the search effects.
- **qa-tester:** **PASS**.
  - Totals match psql: OR 9249, AND 1895, planner 88, combined with sort 65, `plant=999` gives 0.
  - All 7 Clear all traces pass, and batching is confirmed.
  - Minor findings: F1, Clear all can push an identical URL (one extra Back); F2, a comment is inaccurate.
- **spec-reviewer:** **APPROVE**, nothing blocking. It recommends the one-line F1 fix (only `update` when `hasActiveFilters`)
  and a reworded F2 comment. Optional: reuse `isOneOf` and `parsePositiveInt` from table-state; rename `plantsError` to `plantsFailed`.

**Open:** the F1/F2 polish; the search deps tweak; browser checks for the layout and pill wrap, the plant label flash, and the
loading/disabled state; masking internal errors.

**What the human corrected:** nothing in this feature.

---

## R5.2 / Section 11: tRPC error formatter, 2026-11-13

**Plan:** the human asked for "R5" via backend-engineer. The main thread noted that R5.1–R5.3 were already built and approved,
and asked what to do. The remaining gap was R5.2's "clear message": Zod errors came back as a stringified JSON array,
and 500s leaked SQL and a stack trace. The human chose **Error formatter**. Chain: backend-engineer -> qa-tester -> spec-reviewer.

**What each agent did**
- **backend-engineer:** added `errorFormatter` in `api/src/trpc.ts`.
  - Zod BAD_REQUEST errors get a readable message, e.g. `pageSize: Too big: expected number to be <=100`, plus `data.issues` with a path and message for each problem.
  - 500s get "Something went wrong. Please try again."
  - `stack` is dropped everywhere.
  - The response format and HTTP statuses are unchanged.
  - It checked tRPC 11.28's parser to confirm the error cause is a real `ZodError` with Zod v4.
  - To test a 500, it used a scratch instance with a bad DB URL instead of stopping Postgres, because the shared API had restarted during its run and another agent might be using it.
- **qa-tester:** **PASS**. 18 readable 400s, and 0 leaks across 24 response bodies. Observation: a future `.output()` validator could
  leak internal field paths through `issues` on a 500.
- **spec-reviewer:** **APPROVE**. It recommended gating `issues` on BAD_REQUEST and correcting a comment, since `onError` only logs 500s.
- **backend-engineer:** applied both -> qa-tester **PASS**. QA proved the guard live with a scratch router that has a failing
  `.output()`: the response was a 500 with the generic message and `issues:null` -> spec-reviewer **APPROVE**.

**What the human corrected:** they picked the scope (error formatter) after the main thread pointed out that R5 was already met.
