# SPEC.md: Material Register

Source: Lexin Solutions take-home "The Pragmatist". Requirement IDs are used by the
agents, the QA report and the AI log. Keep this file in the repo.

## R1 Data and schema

- **R1.1** A `materials` table and at least one related table linked by a foreign key.
  We use `plants` and `manufacturers`.
- **R1.2** Material fields: material number (unique, e.g. `MAT-000123`), description,
  material type (fixed set: Spare Part, Consumable, Raw Material, Tool), manufacturer,
  manufacturer part number (MPN), plant, status (Active, Obsolete, Pending Review),
  unit of measure, unit price in AUD, quantity on hand, last updated timestamp.
- **R1.3** Indexes on every column used to filter or sort, including foreign keys.
- **R1.4** Schema and migrations managed with Drizzle.
- **R1.5** A seed script that creates **at least 5,000** realistic records
  (we use 20,000 with a fixed faker seed so data is repeatable).

## R2 Data table

- **R2.1** Show materials in a clean, readable table including plant and manufacturer.
- **R2.2** Pagination handled on the server.
- **R2.3** Sorting by at least two columns (we support 5: material number, description,
  unit price, stock, last updated).

## R3 Search

- **R3.1** One search box matching material number, description and MPN.
- **R3.2** Case-insensitive.
- **R3.3** Does not send a request on every keystroke (debounced).

## R4 Filtering

- **R4.1** At least two filters (we use type, status, plant; each multi-select).
- **R4.2** Filters and search work together (AND between fields, OR within one filter).
- **R4.3** The user can clear search and filters easily.

## R5 API

- **R5.1** Search, filtering, sorting and pagination happen in the database.
- **R5.2** All inputs validated (Zod). Bad input returns HTTP 400 with a clear message.
- **R5.3** tRPC for end-to-end type safety.

## R6 User experience

- **R6.1** Loading state.
- **R6.2** Empty state.
- **R6.3** Error state with a way to retry.
- **R6.4** Search, filters, sort and page are kept in the URL, so a view can be refreshed
  or shared.

## R7 Optional extra (pick one)

- **R7.1** Faster search with Postgres `pg_trgm` trigram indexes, measured with
  `EXPLAIN ANALYZE` before and after, results written in the README.

## R8 Deliverables

- **R8.1** Runs locally in a few commands from the README.
- **R8.2** README covers: setup, architecture decisions and trade-offs, what I would do next,
  how I used AI tools (which tools, what worked, what I corrected).
- **R8.3** Agent context files (`CLAUDE.md`, `AGENTS.md`, `.claude/`) left in the repo.

## Out of scope

Authentication, editing materials, deployment, natural-language filters, a detail view.
Do not build these unless the human adds them here first.

## Interview prep (not code)

- Live change practice: add a **Manufacturer** filter (R4.1 style) and a **UoM** column.
- Be able to explain every file with `/explain <file>`.
