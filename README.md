# Material Register

A full stack app for maintenance planners to search, filter, sort and page through a large
catalogue of materials (spare parts, consumables, raw materials and tools), for example
"all active SKF bearings at the Brisbane plant".


> **Status: in progress.** This README will be replaced with the full version
> (architecture, trade-offs, performance results and AI notes) when the build is complete.

## Tech stack

| Layer | Choice |
|---|---|
| Database | PostgreSQL 17 (Docker Compose) |
| ORM | Drizzle ORM with drizzle-kit migrations |
| API | Node 22, TypeScript, Express, tRPC v11, Zod |
| Front end | React Router v7 (SPA mode), React 19 |
| UI | Mantine |
| Data fetching | TanStack Query via tRPC |

## How this project is built

This repo is built with **Claude Code and four subagents**, with me as the lead who plans,
reviews every change and commits.

| Agent | Role |
|---|---|
| `backend-engineer` | Schema, migrations, seed data and the tRPC API (`api/` only) |
| `frontend-engineer` | Routes, components, URL state and UI states (`web/` only) |
| `qa-tester` | Tests the running app against the spec, never edits code |
| `spec-reviewer` | Reviews each change against the spec and project rules, never edits code |

Each feature follows the same loop: **plan, build, QA, review, then I read the diff and commit.**

The agent context files are kept in the repo, as the brief asks:

| File | Purpose |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Shared rules for any AI agent: stack, rules, known traps |
| [`CLAUDE.md`](CLAUDE.md) | Claude Code workflow (imports `AGENTS.md`) |
| [`SPEC.md`](SPEC.md) | The brief as numbered requirements (R1.1, R3.2 ...) |
| [`.claude/agents/`](.claude/agents) | The four subagent definitions |
| [`.claude/commands/`](.claude/commands) | `/feature`, `/review` and `/explain` slash commands |
| [`docs/AI-LOG.md`](docs/AI-LOG.md) | What the agents built and what I corrected |

## Setup

> These steps will work once the build is complete. Requires **Node 22** and **Docker**.

```bash
nvm use                                   # Node 22, from .nvmrc
docker compose up -d                      # Postgres on port 5433

cd api
cp .env.sample .env
npm install
npm run db:migrate                        # tables, indexes
npm run db:seed                           # 20,000 materials
npm run dev                               # http://localhost:3001

# in a second terminal
cd web
npm install
npm run dev                               # http://localhost:5173
```

## Project structure

```
material-register/
├── AGENTS.md, CLAUDE.md, SPEC.md   agent context and requirements
├── .claude/                        subagents and slash commands
├── docs/                           AI log and README template
├── docker-compose.yml              Postgres
├── api/                            Node + tRPC + Drizzle back end
└── web/                            React Router v7 SPA front end
```


## Author

Hiran Nuwanpriya
