# AGENTS.md

<material-register-guidelines>
=== foundation rules ===

# Material Register Guidelines

## Foundational Context

This application is a full stack TypeScript monorepo: a Node 22 API in `api/` and a React Router v7
single-page app in `web/`, backed by PostgreSQL 17 in Docker. Always use the APIs that match the
installed major version of each package. Do not assume a version.

Before relying on a package's API, confirm its installed version:
- Check `api/package.json` or `web/package.json`.
- Run `npm ls <package>` inside `api/` or `web/` for the resolved version.

Key versions: React Router **7.x**, React 19, tRPC 11, Zod 4, Express 5, Mantine (current major),
TanStack Query 5, Drizzle ORM (current), Node 22.

## Source of Truth

- Full instructions live in `CLAUDE.md`. Read it before planning or editing.
- Requirements with IDs live in `SPEC.md`. Every change must trace to a requirement ID.
- If this file and `CLAUDE.md` disagree, `CLAUDE.md` wins. Flag the conflict to the user.

## Conventions

- You must follow all existing code conventions in this application. When creating or editing a file,
  check sibling files for the correct structure, approach and naming.
- Use descriptive names. For example, `filtersActive`, not `flag`; `plantsLoading`, not `loading2`.
- Check for existing components, helpers and types to reuse before writing new ones
  (`lib/table-state.ts`, `lib/format.ts`, `RouterInputs`, `RouterOutputs`).

## Verification Scripts

- Do not create throwaway verification scripts. Verify with `npm run typecheck`, `npm run build`,
  `curl` against the API, and `EXPLAIN ANALYZE` in `psql`.

## Application Structure & Architecture

- Stick to the existing directory structure. Do not create new top-level folders without approval.
- `api/` code never imports from `web/`. `web/` imports from `api/` as types only.
- Do not change the application's dependencies without approval.

## Frontend Bundling

- If a front end change does not show, or the page hangs on "Loading..." after an install, stop the dev
  server, run `rm -rf node_modules/.vite` in `web/`, restart with `npm run dev`, and hard refresh.

## Documentation Files

- Only create documentation files if the user explicitly asks.
- Exceptions that are part of the workflow: append to `docs/AI-LOG.md` after each feature, and write
  `README.md` in the final phase.

=== agent workflow rules ===

# Agent Workflow

- The main thread plans and routes. It does not write project code itself.
- Locked chain: `backend-engineer` (API / DB) -> `frontend-engineer` (UI) -> `qa-tester` -> `spec-reviewer`.
- Write a plan with requirement IDs and the files to change, then wait for user approval before building.
- Subagents cannot call other subagents. The main thread routes every handoff, including fixes.
- Never skip `qa-tester` or `spec-reviewer`, even for one-line changes.
- `git-commit-push` runs only after `spec-reviewer` returns APPROVE **and** the user asks to commit.
- Stop and ask the user when a requirement is unclear, a new dependency is needed, or work is out of scope.

=== tools rules ===

# Tools

- Database queries: `docker compose exec db psql -U materials -d material_register -c "<sql>"`.
  Use read-only queries unless the task is a migration or seed.
- Inspect table structure with `\d materials` in `psql` before writing schema changes.
- Browse data visually with `npm run db:studio` in `api/`.
- Call the API with `curl`, for example:
  `curl -s -G http://localhost:3001/trpc/materials.list --data-urlencode 'input={"search":"bearing"}'`.
- Check the API is up with `curl -s http://localhost:3001/health`.
- Read browser errors from the browser console. Terminal output only shows server-side errors.

=== node & typescript rules ===

# Node & TypeScript

- Node 22 from `.nvmrc`. Run `nvm use` first. Old Node fails with `Unexpected token '.'`.
- `strict` is on in both packages. Never use `any`.
- Use explicit types on exported functions and component props.
- Prefer inferred types over hand-written duplicates: `typeof table.$inferInsert`,
  `inferRouterInputs`, `inferRouterOutputs`, `z.infer`.
- `const` by default. Prefer early returns over nested conditionals.
- Any file containing JSX must end in `.tsx`. Logic-only files end in `.ts`.
- `tsx` and Vite do not type-check. Run `npm run typecheck` before finishing any task.
- After editor autocomplete, check import lines. Wrong auto-imports (e.g. `types` from `node:util`) are common.

=== docker rules ===

# Docker

- Postgres runs in Docker Compose: container `material-register-agents-db`, volume `pgdata_agents`,
  host port **5433**.
- Start with `docker compose up -d`; check health with `docker compose ps`.
- Never run `docker compose down -v` without user approval. It deletes all data.

=== postgres rules ===

# PostgreSQL

- All search, filtering, sorting and pagination happen in SQL. Never fetch everything and filter in JavaScript.
- Index every column used to filter or sort. Postgres does not index foreign keys automatically.
- Money is `numeric(12,2)`. Never use float for money.
- Timestamps use `timestamptz`.
- Measure query changes with `EXPLAIN ANALYZE`, run 3 times before and after, then run `ANALYZE materials;`.
- `pg_trgm` must be enabled in its own migration before any trigram index migration.

=== drizzle rules ===

# Drizzle ORM

- Schema lives in `api/src/db/schema.ts`. camelCase field names in TypeScript, snake_case column names
  in the string argument: `materialNumber: varchar("material_number", ...)`.
- Every column string must be unique. A copy-pasted column with an unchanged string causes
  `column "x" specified more than once`.
- Schema changes: edit `schema.ts`, run `npm run db:generate`, **read the generated SQL**, then `npm run db:migrate`.
- Extensions and other hand-written SQL go in a custom migration: `npx drizzle-kit generate --custom --name=<name>`.
- Never edit an applied migration. Never change the database by hand.
- Use `inArray`, `ilike`, `and`, `or`, `eq`, `asc`, `desc` from `drizzle-orm`. Never build SQL strings from input.
- `numeric` values come back as strings. Keep them as strings through the API.
- Count with `db.$count(table, where)`.

=== seed rules ===

# Seed Data

- Use `@faker-js/faker` with `faker.seed(42)` so data is identical on every run and machine.
- `TRUNCATE materials, manufacturers, plants RESTART IDENTITY CASCADE` first, so the seed can re-run.
- Use templates that pair each item kind with makers that really sell it. No random nonsense pairings.
- Insert in batches of 1,000 (Postgres allows 65,535 parameters per query).
- `faker.helpers.arrayElement` returns one item; `arrayElements` returns an array. Use the right one.
- Close the pool when done: `.finally(() => pool.end())`.

=== trpc & zod rules ===

# tRPC & Zod

- Every procedure has a Zod `.input()` schema. Cap `pageSize` (max 100) and string length (max 100).
- Enum inputs come from the Drizzle enum: `z.enum(materialTypeEnum.enumValues)`. One source of truth.
- Sorting uses an allow-list object that maps a key to a column. Never put user text in `ORDER BY`.
- Always add `asc(materials.id)` as the final sort, so offset pagination is stable.
- Escape `%`, `_` and `\` before building an `ILIKE '%term%'` pattern.
- Run the page query and the count query together with `Promise.all`.
- Return dates as ISO strings. JSON has no Date type.
- Export `type AppRouter = typeof appRouter` from `api/src/router.ts`.
- Bad input returns HTTP 400 through Zod automatically. Log only `INTERNAL_SERVER_ERROR` in `onError`.

=== express rules ===

# Express

- Express 5 serves `/health` and mounts tRPC at `/trpc` with `createExpressMiddleware`.
- CORS allows only `WEB_ORIGIN` (default `http://localhost:5173`).
- Read config from `api/.env` through `dotenv/config`. Templates are named `.env.sample`.

=== react-router/v7 rules ===

# React Router v7

- CRITICAL: this project uses React Router **v7**. `create-react-router@latest` installs v8.
  Always pin `@7` for `react-router`, `@react-router/dev` and `@react-router/node`.
- SPA mode: `ssr: false` in `react-router.config.ts`.
- Routes are declared in `web/app/routes.ts`. The index route renders `routes/materials.tsx`.
- `root.tsx` exports `Layout`, the default `App`, `HydrateFallback` and `ErrorBoundary`.
- Use `useSearchParams` for table state. The URL is the single source of truth.
- The dev log 404 for `/.well-known/appspecific/com.chrome.devtools.json` is harmless. Ignore it.

=== react rules ===

# React

- Components receive data through props and report changes up through callbacks (`onChange`, `onSort`, `onClear`).
- Presentational components hold no URL or fetching logic.
- Lists use a stable `key` from a real id, never the array index (skeleton rows are the only exception).
- Get `useMemo` and `useEffect` dependency arrays right. `useMemo(..., [setSearchParams])` never re-runs;
  depend on `searchParams`.
- Declare a value before using it. `useState(state.search)` must come after `state` is created.

=== url state rules ===

# URL State

- `web/app/lib/table-state.ts` owns `parseTableState` (URL to state), `toSearchParams` (state to URL)
  and `toQueryInput` (state to API input).
- Params: `q`, `type` (repeated), `status` (repeated), `plant` (repeated), `sort`, `dir`, `page`.
  Defaults are left out of the URL.
- Parse defensively with allow-lists. Unknown values fall back to defaults and never crash.
- One `update(patch)` function writes the URL. Any change resets to page 1 unless the patch sets a page.
- Search: local state for typing, `useDebouncedValue(text.trim(), 300)`, written with `replace: true`.

=== tanstack-query rules ===

# TanStack Query

- Use `useQuery(trpc.<router>.<procedure>.queryOptions(input, options))` with `useTRPC()`.
- Use `placeholderData: keepPreviousData` on the materials query so the table does not flash.
- One `QueryClient`, created outside components, with `staleTime: 30_000` and `retry: 1`.
- Use `isPending` for first load, `isPlaceholderData` / `isFetching` for refetching,
  `isError` with `refetch()` for errors.

=== mantine rules ===

# Mantine

- Use Mantine's default theme and components. No custom CSS files, no Tailwind.
- Import `@mantine/core/styles.css` once in `root.tsx`. Wrap the app in `MantineProvider` inside `Layout`.
- `postcss.config.cjs` uses `postcss-preset-mantine` and `postcss-simple-vars`.
- Every input has a visible `label`. Sortable headers are real buttons with `aria-sort`.
- Use style props (`py`, `w`, `c`, `ta`, `ff`) instead of inline styles where Mantine offers them.
- Format with `en-AU`: AUD currency for price, `dateStyle: "medium"` for dates.

=== ui states rules ===

# UI States

- Every data view has four states: first load (skeleton rows), refetching (faded rows + small loader),
  empty (message + clear action when filters are set), error (message + Try again).
- Check them in this order: error with no data, then empty, then the table.
- When adding deferred or slow data, show a skeleton, not a blank area.

=== tests rules ===

# Verification

- A task is not done until `npm run typecheck` passes in both `api/` and `web/`, and `npm run build` passes in `web/`.
- `qa-tester` checks every change against SPEC.md with evidence: happy path, bad input returns 400,
  stable pagination under tied sorts, debounce request count, URL refresh, empty and error states.
- Pure copy, styling and layout-only changes still need typecheck, but no new behaviour checks.
- Do not add a test framework without approval. Automated tests are an optional extra in SPEC.md.

=== git rules ===

# Git

- Commit only through `git-commit-push`, after reviewer approval, when the user asks.
- One feature per commit. Message names the change and the requirement IDs:
  `Add debounced search stored in the URL (R3.3, R6.4)`.
- Stage specific paths. Never commit `.env`, `node_modules`, `build` or `.react-router`.
- Never force-push or rewrite history.
</material-register-guidelines>
