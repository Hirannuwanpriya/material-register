# CLAUDE.md

> Project context file for Claude Code. Keep this file updated as the project evolves.
> This is the single source of truth for how agents work in this repo. `AGENTS.md` points here.

---

## 0. Agent Workflow (MANDATORY, READ FIRST)

**Every request that changes this codebase MUST go through the agent chain. The main thread is a
router and orchestrator only. It does NOT write code, edit project files or run tests itself for
any task that touches `api/`, `web/` or `docker-compose.yml`.**

### The Locked Agent Chain

```
backend-engineer (if API or DB work) -> frontend-engineer (if UI work) -> qa-tester -> spec-reviewer
```

This chain is non-negotiable. The main thread's job is to:

1. Identify the request type, the SPEC.md requirement IDs it covers, and the entry agent
2. Write a plan and **wait for the human to approve it**
3. Delegate to each agent with the `Agent` tool, giving full context in the brief
4. Route handoffs between agents in the correct order
5. Surface the final `spec-reviewer` summary back to the human
6. Append an entry to `docs/AI-LOG.md`

**Subagents cannot call other subagents.** Every handoff, including sending fixes back to an
engineer after QA or review, goes through the main thread.

### Entry Agent Selection

| Request type | Entry agent |
|---|---|
| Schema, migrations, seed data, tRPC routers, Zod inputs, SQL, indexes, query performance | `backend-engineer` |
| Routes, React components, Mantine UI, URL state, loading / empty / error states (no API change) | `frontend-engineer` |
| Testing an existing feature against SPEC.md | `qa-tester` |
| Final review of completed work | `spec-reviewer` |
| Commit and push completed, reviewed work | `git-commit-push` |
| Codebase exploration or research questions (no code change) | `Explore` |
| Implementation planning before a large change | `Plan` |

If a request needs both API and UI changes, **always start with `backend-engineer`**. The front end
types come from the API, so the API must exist first.

### Mandatory Handoff Order

1. **`backend-engineer`** changes `api/`: schema, migrations, seed, routers, validation, SQL.
2. **`frontend-engineer`** changes `web/` once the API it depends on is done and type-checks.
3. **`qa-tester`** runs after every code change. Runs typecheck, calls the API, tests behaviour
   against the requirement IDs, and reports PASS or FAIL with evidence. Never edits code.
4. **`spec-reviewer`** is the final gate. Reviews the diff against SPEC.md and Section 20 of this
   file. Reports APPROVE or CHANGES NEEDED. Never edits code. If changes are needed, the main thread
   sends them back to the right engineer, then QA and review run again.
5. **`git-commit-push`** runs only after `spec-reviewer` approves **AND** the human explicitly asks
   to commit.

Skipping `qa-tester` or `spec-reviewer` is forbidden. Even for a one-line change, QA confirms it works
and the reviewer confirms it matches the requirement.

### Writing a Delegation Brief

Subagents do not see this conversation. Every brief must include:

- The SPEC.md requirement IDs
- The exact files the agent may create or change
- Relevant facts from earlier steps (e.g. the API output shape the front end will use)
- What "done" means, including the commands to run
- What to put in the summary

### When the Main Thread May Act Directly

The main thread may act WITHOUT delegating only for:

- Reading files to answer a question (no code change)
- Updating `CLAUDE.md`, `AGENTS.md`, `SPEC.md`, `docs/AI-LOG.md` or files in `.claude/`
- Trivial edits to non-code files (typos in Markdown, comments)

For everything else, delegate. When in doubt, delegate.

### When to Stop and Ask the Human

- A requirement in SPEC.md is unclear or two requirements conflict
- An agent wants to add a dependency not listed in Section 2
- An agent wants to build something listed as out of scope in SPEC.md
- QA and review disagree, or the same issue fails review twice
- Any destructive action: `docker compose down -v`, deleting migrations, rewriting Git history

---

## 1. Project Overview

**Name:** Material Register
**Type:** Full stack take-home assessment, "The Pragmatist", for Lexin Solutions
(AI-Native Full Stack Engineer role).
**Goal:** A web app that lets a user search, filter, sort and page through a large table of
material records, backed by a real database and API.
**Time budget:** About 3 to 4 hours of focused work. A finished, focused app beats an ambitious,
unfinished one.

**The user of the app:** a maintenance planner at an industrial site who needs to find the right
part fast, for example **"all active bearings from SKF stocked at the Brisbane plant"**.
Their catalogue is often synced from SAP and can be very large.

**Who assesses it:** Oliver Markey (Lead Full Stack Developer) and the Lexin team. In the interview
the human will demo the app, walk through the code from database to API to front end, and make a
small change live using AI agents.

### How It Will Be Assessed

| Area | What they look for |
|---|---|
| It works | Runs from the README; core features behave correctly |
| End-to-end design | Sensible schema and indexes, a clean API, data handled on the server |
| Code quality | Readable, typed, simple, good error handling and input validation |
| User experience | Clear table with sensible loading, empty and error states |
| AI-native judgement | Effective use of agents and clear understanding of the code they produced |
| Communication | Clear README notes and confident explanation of decisions and trade-offs |

Every decision in this repo should make one of these rows stronger.

---

## 2. Tech Stack

### Core Stack (fixed, do not swap)

| Area | Technology |
|---|---|
| Database | PostgreSQL 17 in Docker Compose |
| ORM and migrations | Drizzle ORM + drizzle-kit |
| API runtime | Node 22, TypeScript (strict), run with `tsx` |
| API framework | Express 5 + tRPC v11 |
| Validation | Zod |
| Front end | React Router **v7** in SPA mode (`ssr: false`), React 19, Vite |
| UI library | Mantine (core + hooks) |
| Icons | `@tabler/icons-react` |
| Data fetching | TanStack Query v5 via `@trpc/tanstack-react-query` |
| Seed data | `@faker-js/faker` with a fixed seed |
| Small extras (approved in Phase 0) | `cors` (API CORS, Section 11); `isbot` + `@react-router/node` (required by React Router 7's default SPA entry) |

Env files are loaded with Node's built-in `--env-file` / `process.loadEnvFile()`, not `dotenv`.

### Package Versions (pin these)

- `react-router`, `@react-router/dev`, `@react-router/node`: **7.x**. `@latest` installs v8. Always use `@7`.
- `react`, `react-dom`: 19.x
- `vite`: 7.x
- `typescript`: 5.x
- `@trpc/server`, `@trpc/client`, `@trpc/tanstack-react-query`: 11.x
- `drizzle-orm`, `drizzle-kit`, `zod` (v4), `pg`, `express` (v5): latest stable
- Node: 22 (from `.nvmrc`); `"engines": { "node": ">=20" }` in both package.json files

### Why This Stack

- **tRPC** gives end-to-end types with one `import type`, so a renamed API field breaks the
  front end build instead of failing silently at runtime.
- **Drizzle** keeps the schema in TypeScript and produces readable SQL migrations to review.
- **Mantine** ships Table, MultiSelect, Pagination, Skeleton and Alert, so time goes into features,
  not building components. (shadcn/ui needs Tailwind and more assembly.)
- **SPA mode** matches the brief and keeps deployment to static files plus one API.

### Dependency Rule

No new dependency without a one-line reason in the agent's summary. The main thread must ask the
human before any dependency not listed above is added.

---

## 3. Requirements

All requirements live in **`SPEC.md`** with IDs (R1.1, R3.2 ...). Every plan, brief, QA report,
review and commit message refers to these IDs.

| Group | Covers |
|---|---|
| R1 | Data, schema, indexes, seed (5,000+ rows; we use 20,000) |
| R2 | Data table, server pagination, sorting (2+ columns; we use 5) |
| R3 | One search box, case-insensitive, debounced |
| R4 | Filters (2+; we use type, status, plant), work with search, easy to clear |
| R5 | All work done in the database, validated inputs, tRPC |
| R6 | Loading, empty, error states; table state in the URL |
| R7 | Optional extra: faster search with `pg_trgm`, measured |
| R8 | README, setup in a few commands, agent files left in the repo |

**Out of scope** (do not build unless the human adds it to SPEC.md first): authentication,
editing materials, a detail view, natural-language filters, deployment.

---

## 4. Folder Structure

```
material-register/
├── CLAUDE.md                     # this file
├── AGENTS.md                     # pointer for non-Claude agents
├── SPEC.md                       # requirements with IDs
├── README.md
├── .nvmrc                        # 22
├── .gitignore
├── docker-compose.yml            # Postgres 17
├── .claude/
│   ├── agents/                   # backend-engineer, frontend-engineer, qa-tester,
│   │                             # spec-reviewer, git-commit-push
│   └── commands/                 # /feature, /review, /explain
├── docs/
│   ├── AI-LOG.md                 # what agents did, what the human corrected
│   └── README-TEMPLATE.md
├── api/
│   ├── .env.sample
│   ├── package.json
│   ├── tsconfig.json
│   ├── drizzle.config.ts
│   ├── drizzle/                  # generated migrations (committed)
│   └── src/
│       ├── index.ts              # Express server, CORS, /health, /trpc
│       ├── router.ts             # appRouter + `export type AppRouter`
│       ├── trpc.ts               # initTRPC, router, publicProcedure
│       ├── db/
│       │   ├── index.ts          # pg Pool + drizzle instance (exports db, pool)
│       │   ├── schema.ts         # enums, tables, indexes
│       │   └── seed.ts           # faker seed, batched inserts
│       └── routers/
│           ├── materials.ts      # materials.list
│           └── plants.ts         # plants.list
└── web/
    ├── .env.sample
    ├── package.json
    ├── tsconfig.json
    ├── react-router.config.ts    # ssr: false
    ├── vite.config.ts            # port 5173
    ├── postcss.config.cjs        # Mantine PostCSS preset
    └── app/
        ├── root.tsx              # Layout, providers, HydrateFallback, ErrorBoundary
        ├── routes.ts             # index -> routes/materials.tsx
        ├── routes/
        │   └── materials.tsx     # page: URL state, queries, UI states
        ├── components/
        │   ├── material-filters.tsx
        │   └── materials-table.tsx
        └── lib/
            ├── trpc.ts           # client, TRPCProvider, useTRPC, RouterInputs/Outputs
            ├── table-state.ts    # URL <-> state <-> API input
            └── format.ts         # AUD price, date, number (en-AU)
```

---

## 5. Environment and Ports

| Service | Port | Notes |
|---|---|---|
| Postgres (host) | **5433** | Maps to 5432 in the container, so this project can run next to another on 5432 |
| API | 3001 | `http://localhost:3001/trpc`, health at `/health` |
| Web | 5173 | Must match `WEB_ORIGIN` for CORS |

Docker: container name `material-register-agents-db`, named volume `pgdata_agents`,
healthcheck `pg_isready`.

Env templates are named **`.env.sample`** (not `.env.example`). Real `.env` files are never committed.

### `api/.env.sample`

```
DATABASE_URL=postgres://materials:materials@localhost:5433/material_register
PORT=3001
WEB_ORIGIN=http://localhost:5173
SEED_COUNT=20000
```

### `web/.env.sample`

```
VITE_API_URL=http://localhost:3001/trpc
```

---

## 6. Database Schema

### Enums

| Enum | Values |
|---|---|
| `material_type` | Spare Part, Consumable, Raw Material, Tool |
| `material_status` | Active, Obsolete, Pending Review |

### Tables

**`plants`**: `id` serial PK, `code` varchar(4) unique (e.g. `1000`), `name` varchar(100) (e.g. `Brisbane`)

**`manufacturers`**: `id` serial PK, `name` varchar(100) unique (e.g. `SKF`)

**`materials`**

| TS field | Column | Type | Rules |
|---|---|---|---|
| `id` | `id` | serial | PK |
| `materialNumber` | `material_number` | varchar(20) | not null, unique, `MAT-000123` |
| `description` | `description` | text | not null |
| `type` | `type` | `material_type` | not null |
| `status` | `status` | `material_status` | not null, default Active |
| `manufacturerId` | `manufacturer_id` | integer | not null, FK manufacturers.id |
| `mpn` | `mpn` | varchar(50) | not null |
| `plantId` | `plant_id` | integer | not null, FK plants.id |
| `uom` | `uom` | varchar(10) | not null (EA, KG, M, PK) |
| `unitPrice` | `unit_price` | numeric(12,2) | not null, AUD |
| `stockQty` | `stock_qty` | integer | not null, default 0 |
| `updatedAt` | `updated_at` | timestamptz | not null, default now |

### Indexes

- B-tree on `type`, `status`, `plant_id`, `manufacturer_id`, `updated_at`
  (Postgres does **not** index foreign keys automatically)
- `material_number` is indexed by its unique constraint
- R7: GIN trigram indexes on `material_number`, `description`, `mpn` (`gin_trgm_ops`),
  added in a migration **after** a custom migration that runs `CREATE EXTENSION IF NOT EXISTS pg_trgm;`

### Seed Rules (`api/src/db/seed.ts`)

- `faker.seed(42)` so data is the same on every run and every machine
- `TRUNCATE materials, manufacturers, plants RESTART IDENTITY CASCADE` first, so it can re-run
- 8 Australian plants: 1000 Brisbane, 1100 Sydney, 1200 Melbourne, 1300 Perth, 1400 Adelaide,
  1500 Gladstone, 1600 Newcastle, 1700 Hobart
- Realistic **templates**: each item kind paired with makers that really sell it
  (bearings from SKF / NSK / Timken / FAG, grease from Castrol / Shell / Mobil ...)
- Status weights: about 75% Active, 15% Obsolete, 10% Pending Review
- `updatedAt` spread over the past 2 years
- Insert in batches of 1,000 (Postgres has a 65,535 parameter limit per query)
- Close the pool at the end: `.finally(() => pool.end())`

---

## 7. API Contract

### `materials.list` (query)

**Input** (Zod, all optional with defaults):

| Field | Type | Rule |
|---|---|---|
| `search` | string | trimmed, max 100 |
| `types` | material_type[] | from `materialTypeEnum.enumValues` |
| `statuses` | material_status[] | from `materialStatusEnum.enumValues` |
| `plantIds` | number[] | positive integers |
| `sortBy` | enum | `materialNumber`, `description`, `unitPrice`, `stockQty`, `updatedAt`; default `materialNumber` |
| `sortDir` | `asc` / `desc` | default `asc` |
| `page` | int | min 1, default 1 |
| `pageSize` | int | 10 to 100, default 25 |

**Output:**

```ts
{
  items: Array<{
    id; materialNumber; description; type; status; mpn; uom;
    unitPrice: string;        // numeric stays a string
    stockQty: number;
    updatedAt: string;        // ISO string
    plant: { id; code; name };
    manufacturer: { id; name };
  }>;
  total: number; page: number; pageSize: number; pageCount: number;
}
```

### `plants.list` (query)

Returns all plants ordered by `code`, for the Plant filter.

### Query Rules

- Search: `ILIKE` on material_number OR description OR mpn, with `%`, `_` and `\` escaped
- Filters: one optional condition per filter, joined with `and(...)`; `inArray` within a filter
- Sorting: allow-list object maps `sortBy` key to a column; **always** add `asc(materials.id)` as tie-breaker
- Pagination: `LIMIT pageSize OFFSET (page - 1) * pageSize`
- Page query and `db.$count(materials, where)` run together with `Promise.all`
- Bad input returns HTTP 400 automatically through Zod; server errors are logged in `onError`

---

## 8. Front End Architecture

### Routing

One route: `/` renders `routes/materials.tsx`. SPA mode (`ssr: false`).

### URL as the Single Source of Table State

| State | URL param | Example | Default (omitted from URL) |
|---|---|---|---|
| Search | `q` | `q=bearing` | empty |
| Types | `type` (repeated) | `type=Tool&type=Consumable` | none |
| Statuses | `status` (repeated) | `status=Active` | none |
| Plants | `plant` (repeated, id) | `plant=1` | none |
| Sort column | `sort` | `sort=unitPrice` | `materialNumber` |
| Sort direction | `dir` | `dir=desc` | `asc` |
| Page | `page` | `page=3` | 1 |

`lib/table-state.ts` owns three conversions: `parseTableState` (URL to state, defensive),
`toSearchParams` (state to URL, defaults left out), `toQueryInput` (state to API input).
Unknown values (`?status=Banana`, `?page=-5`) fall back to defaults, never crash.

### State Flow Rules

- Read: `state = useMemo(() => parseTableState(searchParams), [searchParams])`
- Write: one `update(patch, { replace? })` function. It resets to page 1 unless the patch sets a page.
- Search box: local `useState` for instant typing, `useDebouncedValue(text.trim(), 300)` before the URL,
  `replace: true` so typing does not flood history. A second effect syncs the box when the URL changes
  from outside (Back button, Clear all).
- Queries: `useQuery(trpc.materials.list.queryOptions(input, { placeholderData: keepPreviousData }))`
- If a shared link points past the last page, jump to the last page with `replace: true`.

### Components

| Component | Location | Job |
|---|---|---|
| `MaterialsPage` | `routes/materials.tsx` | Reads URL, runs queries, picks the UI state |
| `MaterialFilters` | `components/material-filters.tsx` | Search box, 3 MultiSelects, Clear all; no own state |
| `MaterialsTable` | `components/materials-table.tsx` | Table, sortable headers, skeleton rows |
| `SortableTh` | inside `materials-table.tsx` | Header button with sort icon and `aria-sort` |

### UI States (R6)

| State | When | Shows |
|---|---|---|
| First load | `isPending` | 10 skeleton rows |
| Refetching | `isPlaceholderData` / `isFetching` | Old rows at 60% opacity + small loader by the count |
| Empty | `data.total === 0` | Icon, "No materials match", Clear button if filters are set |
| Error | `isError && !data` | Red Alert with the message and a **Try again** button (`refetch`) |

Order of checks: error, then empty, then table.

---

## 9. UI and Design Rules (Mantine)

- Use Mantine's default theme. No custom CSS files, no Tailwind.
- Layout: `Container size="xl"`, `Stack gap="md"`, table inside `Paper withBorder radius="md"`.
- Title: `Title order={2}` "Material Register" with a dimmed one-line description.
- Table: `striped`, `highlightOnHover`, `verticalSpacing="xs"`, wrapped in
  `Table.ScrollContainer minWidth={1100}` for narrow screens.

### Table Columns (in order)

| Column | Content | Sortable | Align |
|---|---|---|---|
| Material # | `materialNumber`, monospace | Yes | left |
| Description | text | Yes | left |
| Type | text | No | left |
| Manufacturer / MPN | name, MPN below in small dimmed monospace | No | left |
| Plant | `1000 · Brisbane` | No | left |
| Status | `Badge variant="light"` | No | left |
| Unit price | AUD currency | Yes | right |
| Stock | `91 EA` (qty + uom) | Yes | right |
| Last updated | `12 Nov 2026` | Yes | left |

### Status Badge Colours

Active = green, Obsolete = gray, Pending Review = yellow. Defined as
`Record<Material["status"], string>` so a new status fails the type check until it has a colour.

### Formatting (`lib/format.ts`)

- Locale `en-AU` everywhere
- Price: `Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" })`, convert the string with `Number()` only at display
- Date: `Intl.DateTimeFormat("en-AU", { dateStyle: "medium" })`
- Formatters created once at module level

### Accessibility

- Every input has a visible `label`
- Sort headers are real buttons with `aria-sort`
- Do not rely on colour alone: status badges also show the text

---

## 10. Coding Conventions

### General

- TypeScript `strict` in both packages. No `any`.
- Prefer inferred types over hand-written ones: `typeof table.$inferInsert`, `inferRouterInputs`,
  `inferRouterOutputs`, `z.enum(enum.enumValues)`.
- `const` by default. Early returns over nested conditionals.
- Comments explain **why**, not what.
- Plain code over clever code. The human must be able to explain every line in the interview.

### Naming

- Components: PascalCase (`MaterialsTable`)
- Files: kebab-case (`materials-table.tsx`, `table-state.ts`)
- Any file containing JSX ends in **`.tsx`**; logic-only files end in `.ts`
- Drizzle: camelCase in TypeScript, snake_case column names in the string argument
- Booleans read as questions: `filtersActive`, `plantsLoading`

### Imports

- Order: React, React Router, third party, Mantine, internal
- From `api/` into `web/`: **`import type` only**, and only `AppRouter` in `web/app/lib/trpc.ts`
- After any editor autocomplete, check the import lines (wrong auto-imports happen: `node:util`, server `schema`)

### Components

- Data in through props, changes out through callbacks (`onChange`, `onSort`, `onClear`)
- Presentational components hold no URL or fetching logic
- Lists need a stable `key` (a real id)

---

## 11. Security Rules

- Every API input validated with Zod, including caps on `pageSize` and string length
- No user text in `ORDER BY`: sort keys go through the allow-list
- All values passed as parameters through Drizzle; never build SQL strings from input
- Escape LIKE wildcards before building `%term%`
- CORS allows only `WEB_ORIGIN`
- No secrets in Git; dev credentials in `.env.sample` are clearly local-only (say so in the README)
- No server code in the browser bundle (type-only imports)

---

## 12. Performance Rules

- Search, filter, sort and paging happen in SQL. Never fetch everything and filter in JavaScript.
- Index every filtered and sorted column (Section 6).
- Select only the columns the table needs.
- `keepPreviousData` and a 30s `staleTime` so moving between pages does not flash or refetch needlessly.
- `httpBatchLink` so simultaneous queries share one HTTP request.

### How to Measure (R7)

1. `EXPLAIN ANALYZE` the search query 3 times **before** the change; record execution time and plan (Seq Scan)
2. Add the extension migration, then the trigram index migration
3. `ANALYZE materials;`
4. Run the same queries 3 times **after**; record time and plan (Bitmap Index Scan)
5. Record index sizes vs table size, and note the limits: searches under 3 characters, slower writes
6. Put a before / after table and the trade-offs in the README

Reference results from the hand-built version (20,000 rows): `bearing` about 26 ms to 2.6 ms,
an MPN fragment about 25 ms to 0.2 ms.

---

## 13. Testing and Verification

### Commands

| Check | Command | Where |
|---|---|---|
| API types | `npm run typecheck` | `api/` |
| Web types | `npm run typecheck` | `web/` |
| Web build | `npm run build` | `web/` |
| API smoke | `curl -s localhost:3001/health` | any |
| API call | `curl -s -G localhost:3001/trpc/materials.list --data-urlencode 'input={"search":"bearing"}'` | any |

### Required QA Checks per Feature

- Happy path for each requirement ID
- Bad input returns 400 (`page: 0`, `pageSize: 1000`, unknown `sortBy`)
- Pages 1 and 2 under a tied sort (unit price) share no row ids
- Typing a 7 letter word sends 1 (at most 2) `materials.list` requests
- A URL with search, filters, sort and page loads the same results after refresh
- Empty state (`?q=zzzzzz`) and error state (API stopped) both render

`tsx` and Vite do **not** type-check. A task is never done until both typechecks pass.

---

## 14. Setup Commands

```bash
nvm use                                  # Node 22
docker compose up -d                     # Postgres on 5433

cd api
cp .env.sample .env
npm install
npm run db:migrate
npm run db:seed
npm run dev                              # http://localhost:3001

cd ../web
npm install
npm run dev                              # http://localhost:5173
```

### package.json Scripts

**api:** `dev` (`tsx watch src/index.ts`), `typecheck` (`tsc --noEmit`),
`db:generate`, `db:migrate`, `db:studio`, `db:seed` (`tsx src/db/seed.ts`)

**web:** `dev` (`react-router dev`), `build` (`react-router build`),
`typecheck` (`react-router typegen && tsc`)

### Schema Change Workflow

1. Edit `api/src/db/schema.ts`
2. `npm run db:generate`
3. **Open and read the generated SQL**
4. `npm run db:migrate`
5. Never edit the database by hand. Never edit an applied migration.

---

## 15. Git and Commits

- `main` is the only branch unless the human says otherwise
- Commit only when the human asks, through `git-commit-push`, after `spec-reviewer` approves
- One feature per commit; message names what changed and the requirement IDs:
  `Add debounced search stored in the URL (R3.3, R6.4)`
- Never commit `.env`, `node_modules`, `build`, `.react-router`
- Never force-push or rewrite history

---

## 16. Documentation

- **`docs/AI-LOG.md`:** the main thread appends one entry per feature: plan, what each agent did,
  QA and review results, and **what the human corrected**. This is the evidence for "AI-native judgement".
- **`README.md`:** built from `docs/README-TEMPLATE.md` in the final phase. Must include setup,
  architecture decisions and trade-offs, faster search results, what to do next, and how AI tools were
  used (taken from AI-LOG, nothing invented).
- Keep `CLAUDE.md`, `AGENTS.md`, `SPEC.md` and `.claude/` in the repo (R8.3).

---

## 17. Build Phases

### Phase 0: Skeleton
- `docker-compose.yml` (Section 5), `api/` and `web/` scaffolds, `.env.sample` files, `/health`
- `web/` on React Router **7.x**, Mantine provider in `root.tsx`, one empty route

### Phase 1: Database (R1.1 to R1.5)
- Schema, enums, indexes, first migration, seed script

### Phase 2: List API (R2.2, R2.3, R3.1, R3.2, R4.1, R4.2, R5.1 to R5.3)
- `materials.list`, `plants.list`, Express + tRPC + CORS

### Phase 3: Table, Pagination, Sorting, URL State (R2.1 to R2.3, R6.4)

### Phase 4: Search and Filters (R3.3, R4.1 to R4.3)

### Phase 5: UI States (R6.1 to R6.3)

### Phase 6: Faster Search (R7.1)
- Extension migration, trigram migration, measured before and after

### Phase 7: README and Handover (R8.1 to R8.3)
- README from the template; QA follows the README on a fresh database

After every phase: the human reads the diff, runs the app, and commits.

---

## 18. Known Traps (learned the hard way)

- `create-react-router@latest` installs React Router **v8**. Pin `@7` or set up `web/` by hand.
- Old Node fails with `Unexpected token '.'`. Use Node 22.
- `numeric` comes back as a **string**. Keep it a string until display.
- JSON has no Date type. Send `updatedAt` as an ISO string.
- JSX in a `.ts` file fails with `Expected ">" but found ...`. Use `.tsx`.
- Copy-pasting a Drizzle column without changing the string creates `column "x" specified more than once`.
- Typos in object keys (`updateAt`, `npm` for `mpn`) are silently dropped by Drizzle at runtime;
  only typecheck catches them.
- `faker.helpers.arrayElement` returns one item; `arrayElements` returns an array.
- `pool.end` without `()` leaves the seed script hanging.
- `useMemo(..., [setSearchParams])` never re-runs. Depend on `searchParams`.
- After `npm install` in `web/`, Vite can hang on "Loading...". Stop, `rm -rf node_modules/.vite`, restart, hard refresh.
- Chrome's `/.well-known/appspecific/com.chrome.devtools.json` 404 in the dev log is harmless.
- `pg_trgm` must be enabled in its own migration **before** the trigram indexes.
- `docker compose down -v` deletes all data. Only with the human's approval.

---

## 19. Interview Prep

### Live Change: Add a Filter (e.g. Manufacturer)

A new filter touches exactly these places:

1. `api/src/routers/materials.ts`: add `manufacturerIds` to the Zod input and an `inArray` condition
2. `api/src/routers/manufacturers.ts` + `router.ts`: a `manufacturers.list` procedure for the options
3. `web/app/lib/table-state.ts`: field in `TableState`, `DEFAULT_STATE`, parse, `toSearchParams`,
   `toQueryInput`, `hasActiveFilters`
4. `web/app/components/material-filters.tsx`: one more `MultiSelect`
5. `web/app/routes/materials.tsx`: run the new query and pass the options down

### Live Change: Add a Column (e.g. UoM on its own)

1. If the API already returns the field, only `materials-table.tsx` changes (header + cell, update `COLUMN_COUNT`)
2. If not, add it to the `select` in `materials.ts` first; the front end type updates automatically

### Use `/explain <file>` on every file before the interview.

---

## 20. Critical Reminders for Claude

When working on this codebase:

1. **The main thread orchestrates; agents build.** Follow Section 0. Never skip `qa-tester` or `spec-reviewer`.
2. **Plan first, then wait for approval** before any agent writes code.
3. **Every change traces to a SPEC.md requirement ID.** No unrequested features.
4. **All search, filtering, sorting and pagination happen in SQL.** Never in JavaScript.
5. **Validate every API input with Zod**, with caps on page size and string length.
6. **Sorting uses an allow-list**, and `id` is always the final tie-breaker.
7. **Escape `%`, `_` and `\`** in every LIKE / ILIKE pattern.
8. **`web/` imports from `api/` as types only.** One `import type { AppRouter }` in `web/app/lib/trpc.ts`, nothing else.
9. **The URL is the single source of table state.** Parse it defensively; any change resets to page 1.
10. **Search is debounced (300 ms)** and uses `replace: true`.
11. **Every data view has loading, empty and error states**, checked in the order error, empty, table.
12. **Schema changes go through migrations**, and the generated SQL is read before migrating.
13. **React Router stays on v7.** Check `web/package.json` after any install.
14. **Money is `numeric(12,2)` and stays a string** until it is formatted in `en-AU` AUD.
15. **Run both typechecks (and `web` build) before marking any task complete.** `tsx` and Vite do not check types.
16. **No new dependencies without the human's approval.**
17. **Never commit or push** unless `spec-reviewer` approved and the human asked.
18. **Log every feature in `docs/AI-LOG.md`**, including what the human corrected. Do not invent entries.
19. **Keep it simple.** This is a 3 to 4 hour scope. If the human could not explain a line in the interview, simplify it.
