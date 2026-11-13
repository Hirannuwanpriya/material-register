# Material Register

A web app for maintenance planners at an industrial site to find the right part fast in a large
material catalogue. For example: **"all active bearings stocked at the Brisbane plant"**.
It lets you search, filter, sort and page through 20,000 material records. All of that work runs
in PostgreSQL, behind a typed API.

## Quick start (R8.1)

**Prerequisites:** Node 22 (`nvm`) and Docker.

```bash
nvm use                                   # Node 22, from .nvmrc (older Node fails on modern syntax)
docker compose up -d                      # Postgres 17 on host port 5433

cd api
cp .env.sample .env
npm install
npm run db:migrate                        # tables, enums, indexes, pg_trgm
npm run db:seed                           # 20,000 materials, same data on every run
npm run dev                               # API on http://localhost:3001

# second terminal (run `nvm use` here too)
cd web
cp .env.sample .env
npm install
npm run dev                               # app on http://localhost:5173
```

Open http://localhost:5173.

- **Credentials:** the database user and password in `.env.sample` and `docker-compose.yml`
  (`materials` / `materials`) are local development values only.
- **Ports:** Postgres uses host port 5433 so it can run next to another Postgres on 5432. The web
  app must run on 5173, because the API's CORS setting only allows that origin.

**Checks:**

| Check | Command |
|---|---|
| API types | `cd api && npm run typecheck` |
| Web types | `cd web && npm run typecheck` |
| Web build | `cd web && npm run build` |
| API health | `curl -s localhost:3001/health` |
| API call | `curl -s -G localhost:3001/trpc/materials.list --data-urlencode 'input={"search":"bearing"}'` |

## Features

| Feature | What it does | Requirements |
|---|---|---|
| Data | `materials` linked to `plants` and `manufacturers` by foreign keys. 20,000 realistic seeded rows: bearings from SKF/NSK/Timken/FAG, grease from Castrol/Shell/Mobil, and so on | R1.1–R1.5 |
| Table | 9 columns: material #, description, type, manufacturer / MPN, plant, status badge, unit price (AUD), stock, last updated | R2.1 |
| Pagination | Server-side, 25 rows per page | R2.2 |
| Sorting | 5 sortable columns: material #, description, unit price, stock, last updated. Headers are buttons with `aria-sort` | R2.3 |
| Search | One box. Case-insensitive match on material number, description and MPN. Debounced by 300 ms | R3.1–R3.3 |
| Filters | Type, status and plant multi-selects. AND across filters, OR within one. Combined with search. "Clear all" button | R4.1–R4.3 |
| API | All search, filtering, sorting and paging in SQL. Zod validation, readable 400 messages, tRPC end-to-end types | R5.1–R5.3 |
| UI states | Skeleton rows on first load. Faded rows while the next page loads. Empty state with a Clear button. Error alert with **Try again** | R6.1–R6.3 |
| URL state | Search, filters, sort and page are all in the URL, so a view can be refreshed, shared, or reached with Back/Forward | R6.4 |
| Faster search | `pg_trgm` GIN indexes, measured before and after (below) | R7.1 |

## Architecture

```
PostgreSQL 17 ──► Drizzle ORM ──► tRPC router (Zod input) ──► Express ──► HTTP (batched)
                                                                            │
React Router 7 SPA ◄── TanStack Query ◄── tRPC client (import type AppRouter only)
        │
   URL search params = the single source of table state
```

```
material-register/
├── docker-compose.yml          Postgres 17 (port 5433, volume pgdata_agents)
├── api/
│   ├── drizzle/                generated SQL migrations (committed, read before applying)
│   └── src/
│       ├── index.ts            Express, CORS, /health, /trpc, server-side error logging
│       ├── trpc.ts             tRPC instance + error formatter
│       ├── router.ts           appRouter and `export type AppRouter`
│       ├── db/                 pool + Drizzle, schema (enums, tables, indexes), seed
│       └── routers/            materials.list, plants.list
└── web/app/
    ├── root.tsx                Mantine, QueryClient and tRPC providers
    ├── routes/materials.tsx    the page: reads the URL, runs the queries, picks the UI state
    ├── components/             MaterialFilters, MaterialsTable, TableError / TableEmpty
    └── lib/                    tRPC client, URL <-> state <-> API input, en-AU formatters
```

| Choice | Why |
|---|---|
| **tRPC v11** | One `import type { AppRouter }` gives the front end the API's exact input and output types. A renamed field breaks the build instead of failing at runtime. |
| **Drizzle** | Schema in TypeScript, readable SQL migrations that can be reviewed, and inferred row types. |
| **Zod v4** | Every input validated at the edge, with caps that match the database's real limits. |
| **React Router 7, SPA mode** | Matches the brief: static files plus one API. Pinned to 7.x, because `@latest` installs v8. |
| **Mantine** | Table, MultiSelect, Pagination, Skeleton and Alert out of the box, so the time went into behaviour, not components. |
| **TanStack Query** | Caching, `keepPreviousData` (no flash when paging), and batched requests via `httpBatchLink`. |

## Decisions and trade-offs (R8.2)

### Database and API
- **All work happens in SQL.**
  - **How:** search is `ILIKE` on three columns joined by `OR`. Filters are `inArray` conditions joined with `AND`. Sorting uses an allow-list of columns. Paging is `LIMIT/OFFSET`.
  - **Count:** the page query and `count(*)` run in parallel.
  - **Nothing in JavaScript:** no filtering, sorting or slicing.
- **`id` is always the last sort key.**
  - **Why:** many rows share a price or stock value. Without a tie-breaker, OFFSET paging can repeat or skip rows between pages.
  - **Tested:** pages 1–3 under tied sorts share no ids.
- **OFFSET pagination.**
  - **Why:** simple, and fast at 20k rows. The URL can say `page=37`.
  - **Trade-off:** deep pages get slower as tables grow. Keyset pagination would fix that, at the cost of "jump to page N" (see next steps).
- **Validation matches the database, not just the JS type.**
  - Plant ids are capped at the Postgres `int4` maximum. NUL characters are stripped from search text.
  - Both of these produced HTTP 500s with SQL in the response before review and QA found them. They now return 400, or are cleaned up.
  - LIKE wildcards (`%`, `_`, `\`) are escaped, so `MAT_0001` and `100%` are searched as literal text.
- **Error formatter in `trpc.ts`.**
  - **400s:** Zod errors become `field: message` text (for example `pageSize: Too big: expected number to be <=100`), plus a structured `issues` list.
  - **500s:** the client gets "Something went wrong. Please try again." with no SQL and no stack. The full error is logged on the server.
  - **`issues`:** only sent for BAD_REQUEST, so a future `.output()` validator cannot leak server internals.
- **CORS uses `origin: [WEB_ORIGIN]` (an array).**
  - **Why:** a plain string makes the `cors` package send that origin back to every caller. An array is compared against the request's Origin.
  - **How it was found:** QA caught it.
- **An index on every filtered and sorted column**, including foreign keys, because Postgres does not index those automatically.
  - **Benefit:** sorts read the index in order, at 0.15–1.1 ms.
  - **Cost:** slower writes and more disk.
- **Money is `numeric(12,2)` and stays a string** until it is formatted as en-AU AUD. That avoids floating-point rounding.
- **Deterministic seed.**
  - **How:** `faker.seed(42)`, a fixed reference date, manufacturers inserted in sorted order, and `TRUNCATE … RESTART IDENTITY`.
  - **Result:** every run produces byte-identical data. The checksum was verified after several re-seeds.

### Front end
- **The URL is the single source of table state.**
  - **Parsing:** `parseTableState` is defensive. `?status=Banana`, `?page=-5` or a 150-character `q` fall back or get trimmed, so a shared link can never cause a 400.
  - **Page reset:** any change resets to page 1.
  - **Past the end:** a link past the last page jumps to the last page, replacing the history entry.
- **Search debounce.**
  - **How:** the box has its own state for instant typing. The URL updates 300 ms after typing stops, replacing the history entry so Back is not flooded with partial words.
  - **Back/Forward:** the URL write runs only when the debounced value changes. A first version also ran on outside URL changes and overwrote Back/Forward; QA found that by tracing the code.
- **Push or replace.**
  - **Filter changes and Clear all** push a history entry, so Back undoes them.
  - **Search typing** replaces the entry.
- **UI states.**
  - **Order of checks:** error, then empty, then table.
  - **With `keepPreviousData`:** when a new query fails, it has no data, so the Alert always shows.
  - **A failed refresh of the same query** keeps its rows, with a small "Could not refresh" note.
  - **Empty placeholder data:** treated as "loading", not "empty", so Clear on an empty result never flashes "No materials yet".
- **Plants list cached for 1 hour.** It has 8 rows that rarely change. If it fails, only the Plant select is disabled; the table still works.
- **Known behaviour:** TanStack Query's default 3 retries (1 s + 2 s + 4 s) mean about 7 seconds of loading before the error Alert appears when the API is down.
- **Seed data:** every plant × type × status combination has rows, so filters alone never produce an empty result. Use a search such as `zzzzzz` to see the empty state.

## Faster search (R7.1)

Search uses `ILIKE '%term%'`. A leading wildcard means a B-tree index cannot help, so Postgres scans the whole table.

**The change:** two migrations.
- `0002_enable_pg_trgm.sql` is a custom migration that enables the extension. Drizzle's schema cannot declare extensions.
- `0003` adds GIN `gin_trgm_ops` indexes on `material_number`, `description` and `mpn`.

**How it works:** the planner combines the three index scans with a `BitmapOr` for the `OR` across columns. It then re-checks the real `ILIKE` on the candidate rows, so the results are unchanged.

**Method:**
- 20,000 rows, Postgres 17.
- `ANALYZE` first, then `EXPLAIN (ANALYZE, BUFFERS)` on the exact SQL the router generates.
- Median of 3 runs.
- The "after" numbers were reproduced independently by the QA agent (shown in brackets).

| Query | Before | After | Speed-up |
|---|---|---|---|
| Count, `bearing` (1,024 matches) | 38.9 ms, Seq Scan | 2.6 ms [3.1], BitmapOr of 3 trigram indexes | ~15× |
| Count, MPN fragment `T98R` (6 matches) | 40.7 ms, Seq Scan | 0.19 ms [0.19] | ~210× |
| Count, `004321` (1 match) | 39.4 ms, Seq Scan | 0.19 ms [0.20] | ~200× |
| Page of 25, `bearing`, sorted by material # | 1.12 ms | 1.12 ms (unchanged) | 1× |
| Count, `be` (2 characters) | 35.8 ms, Seq Scan | 35.4 ms, Seq Scan | 1× |
| Count, `bearing` + Active + Brisbane | 4.4 ms | 4.5 ms [5.0], plant index + filter | 1× |

**Where it did not help, and why:**
- **First page of a common term.**
  - **Why:** `bearing` matches about 5% of rows. Walking the `material_number` index in order finds 25 matches after about 460 rows, which is cheaper than collecting every match and sorting it. The planner chooses this correctly.
  - **Rare terms:** for a rare term (`T98R`) the page query does switch to the trigram indexes, at 0.20 ms.
  - **Where the gain is:** the `count(*)` that runs next to every page.
- **Plant-filtered search.** Brisbane's 2,523 rows are already cheap to filter through the `plant_id` index.
- **Searches under 3 characters** have no trigram to look up, so they stay a full scan (about 35 ms at this size).

**Costs:**
- **Disk:** the table is 2,536 kB. The three trigram indexes are about **13–14 MB** after the setup above (migrate, then seed; 13.3 MiB on a brand-new database). That is about 5.4–5.7× the table, because the seed fills the GIN indexes row by row, and the exact size varies from run to run. The same indexes built with `CREATE INDEX` over data that is already loaded measured about 2.9 MB. So the size depends on how the data was loaded.
- **Writes:** loading 20,000 rows took about 2.45 s with the indexes against 2.0 s without (about 25% slower). A large SAP sync pays this on every load.
- **Verdict:** a good trade for a catalogue that is searched far more often than it is written.

## What I would do next (R8.2)

1. **Manual browser pass and an automated end-to-end test.** Behaviour was verified with:
   - type checks and builds;
   - API calls checked against `psql`;
   - step-by-step traces of the React state, checked against the TanStack and tRPC source.
   
   The UI has not yet been clicked through in a browser for every state, and there is no automated test suite. Add Playwright for:
   - paging and sorting;
   - Back/Forward;
   - the debounce request count;
   - the empty and error states.
2. **Retry policy:** `retry: 1`, and no retries for 4xx errors, so the error state appears in about 1 s instead of about 7 s.
3. **Keyset pagination** for very large catalogues (on the sort value plus `id`).
4. **Search at scale:**
   - `REINDEX` (or drop and recreate the trigram indexes) after large bulk loads;
   - a minimum search length;
   - full-text search (`tsvector`) for word-based queries.
5. **Manufacturer filter.** The same change in five places as the plant filter: Zod input, a `manufacturers.list` procedure, URL state, a MultiSelect and the page wiring.
6. **Small polish found in review, not yet applied:**
   - Clear all can push a duplicate history entry when only un-debounced text is set.
   - A rare timing case in the search effect: the fix is the dependency list `[debouncedSearch, searchText]`.
   - Two stale comments.

## How I used AI tools (R8.2)

This section is a summary of [`docs/AI-LOG.md`](docs/AI-LOG.md), which has one entry per phase.

**Tools:** I used [Claude Code](https://claude.com/claude-code) as the main thread, plus five project
subagents defined in [`.claude/agents/`](.claude/agents). The agent context files are kept in the repo
(R8.3): [`CLAUDE.md`](CLAUDE.md) (workflow and rules), [`AGENTS.md`](AGENTS.md) (rules for any AI agent),
[`SPEC.md`](SPEC.md) (the brief as numbered requirements) and [`.claude/commands/`](.claude/commands)
(`/feature`, `/review`, `/explain`).

| Agent | Role |
|---|---|
| main thread | Plans, writes each agent's brief, routes handoffs and keeps the AI-LOG. Does not write app code. |
| `backend-engineer` | `api/` only: schema, migrations, seed, routers, validation |
| `frontend-engineer` | `web/` only: routes, components, URL state, UI states |
| `qa-tester` | Runs typechecks, builds, curl and psql against the spec. Never edits code. |
| `spec-reviewer` | Reviews each diff against SPEC.md and the project rules. Never edits code. |
| `git-commit-push` | Commits after review. In practice I committed most phases myself (see below). |

**Intended workflow for every change:** plan, my approval, engineer, QA, review. Any fix goes back to the engineer and through QA and review again.

**What worked:** the QA and review agents caught real problems that the engineers' own checks missed:
- **Missing `.nvmrc`:** caught by review in Phase 0.
- **Unindexed sort columns:** review in Phase 1 flagged that three sort columns had no index, so R1.3 was not met word for word.
- **CORS** sent the allowed origin back to *every* caller (a string instead of an array).
- **Huge plant ids:** `plantIds:[3000000000]` returned a **500 containing the SQL query**, because the column is `int4`. Found by review.
- **NUL bytes:** a NUL byte in the search (`?q=bear%00ing`) also returned a 500 with SQL. It was found by QA's wider input sweep after the first fix.
- **Back/Forward:** the first search box version overwrote Back/Forward once typing had settled. It was found by tracing React state step by step.
- **Index size:** the engineer reported the trigram indexes as 2.9 MB. QA measured about 14 MB on the real setup path. The README uses QA's figure.
- **Fresh-database check:** QA ran the Quick start against a brand-new Postgres container. Results:
  - all 4 migrations and 13 indexes;
  - 20,000 / 8 / 59 rows;
  - a checksum identical to Phase 1, so the seed is deterministic;
  - API totals of 1,024 / 88 / 20,000.
- **Latent leak:** the first error formatter could have leaked server internals through a future `.output()` validator. QA proved the fix against a deliberately broken router.

**What I decided or corrected:**
- **Dependencies:** approved `cors`. Chose Node's `--env-file` over `dotenv`. Kept `isbot`, which React Router 7's SPA entry needs.
- **Phase order:** chose strict phase order (table first, then search) over building Phase 3 and search together.
- **Sort indexes:** after review raised the gap, chose to index *every* sort column, to meet R1.3 literally.
- **CORS:** approved the fix.
- **R5:** asked for "R5" when it was already met. After the main thread pointed that out, I scoped the work to the error formatter.
- **Disk:** freed disk space twice when QA hit a full disk. The Postgres container disappeared around then, probably during the clean-up. It was recreated on the same volume with no data loss.

**What the AI got wrong:**
- **Debounce guard:** the guard the main thread suggested in its own brief was the cause of the Back/Forward bug.
- **Wrong measurement:** an engineer reported a wrong index size.

Both were caught inside the workflow before review approval. Not every phase followed the process exactly: several phases were committed before review finished. The AI-LOG records this as it happened.

## Author

Hiran Nuwanpriya
