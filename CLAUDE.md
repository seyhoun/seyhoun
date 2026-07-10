# Seyhoun — Claude Code Guide

## Stack

- **Backend**: Go 1.23, GORM (`gorm.io/gorm`), PostgreSQL (`gorm.io/driver/postgres`)
- **Config**: Viper — reads `config.yml`, secrets overridden via `.env` (gitignored)
- **Frontend**: React + TypeScript, Vite, Tailwind, React Flow, Zustand
- **Routing**: Chi router (`go-chi/chi/v5`) with Recoverer, Logger, and CORS middleware

## Project structure

```
cmd/main.go               Entry point — loads config, connects DB, starts server
cmd/migrate/main.go       Migration runner — wraps goose, reads from migrations/
internal/
  config/config.go        Config structs (Config > ServerConfig, DatabaseConfig) + Viper loader
  db/db.go                GORM Connect() — opens connection only, no AutoMigrate
  models/models.go        GORM models: User, Workspace, Project, Diagram, Branch, Commit, …
  api/                    HTTP handlers (ProjectHandler, DiagramHandler, CommitHandler, …)
  server/server.go        Chi router setup, CORS/Recoverer/Logger middleware, SPA handler
migrations/
  001_initial_schema.sql  Full schema (CREATE TABLE IF NOT EXISTS for all 13 tables)
  002_personal_workspaces.go  Data migration: create personal workspace per user
  003_assign_projects.go  Data migration: assign projects to owner workspaces
  004_diagram_branch_commit.go  Data migration: create main branch + commit per diagram
  helpers.go              Shared helpers: makeSlug, uniqueSlug, hashContent
web/src/
  modes/                  DesignMode, PresentMode, MonitorMode, HomePage, SchemaPage
  components/             Canvas, panels, layout (Sidebar, TopBar), nodes/SubItems.tsx
  stores/                 Zustand: diagram.ts, ui.ts
  lib/                    api.ts (fetch wrapper), techRegistry.ts
config.yml                Default config (API port 1375, postgres localhost)
.env.example              Documents secret env var overrides
```

## Configuration

`config.yml` holds non-secret defaults. `.env` overrides any key using `_` as separator:

| Env var | Config key |
|---|---|
| `SERVER_PORT` | `server.port` |
| `DATABASE_HOST` | `database.host` |
| `DATABASE_PASSWORD` | `database.password` |
| `DATABASE_NAME` | `database.name` |
| `LOG_LEVEL` | `log.level` |

See `.env.example` for the full list.

## Database

PostgreSQL only. Schema is managed by **goose** (`github.com/pressly/goose/v3`) — not GORM AutoMigrate. Migration files live in `migrations/`. The server no longer touches schema at startup.

```bash
make migrate          # apply all pending migrations (goose up)
make migrate-down     # roll back last migration (goose down)
make migrate-status   # show applied vs pending migrations
make migrate-create name=add_foo_table   # scaffold a new SQL migration file
```

- SQL migrations use `-- +goose Up` / `-- +goose Down` markers.
- Go migrations register via `goose.AddMigrationNoTxContext` in `init()`.
- Goose tracks applied migrations in the `goose_db_version` table.
- FK cascade deletes are defined in `001_initial_schema.sql` (matching GORM `constraint:OnDelete:CASCADE` tags on the models).

**Existing databases** (previously managed by GORM AutoMigrate): migration `001` uses `CREATE TABLE IF NOT EXISTS` so it is safe to run. The old `migration_history` table is left in place and can be dropped in a future migration.

## Dev workflow

```bash
# Terminal 1 — Go API (port 1375, set in config.yml)
make dev-api

# Terminal 2 — Vite dev server (port 1374, proxies /api → :1375)
make dev-web
```

Vite proxy target is configured in `web/vite.config.ts`.

## Frontend routing

React Router drives the top-level layout from `web/src/App.tsx`:

| Route | Component | Purpose |
|---|---|---|
| `/` | `HomePage` | Project/diagram hub — list, create, delete |
| `/schema/:id` | `SchemaPage` | Diagram canvas with Design/Present/Monitor modes |

`SchemaPage` fetches the diagram by ID, loads it into the Zustand store, and renders `TopBar` + `Sidebar` around the active mode component.

`SubItems.tsx` renders inline topic/queue/database lists on broker and datastore nodes, with sub-handle IDs encoded as `slug+kind` for edge connections.

## Diagram versioning (branch/commit model)

Diagram content is versioned via a git-like branch/commit model. **Do not use `PUT /diagrams/{id}` to save content** — that endpoint only accepts `name` and `diagramType`.

### How saving works
- Each diagram has a `defaultBranchId` pointing to its `main` branch.
- Saving diagram content creates a commit: `POST /branches/{branchId}/commits` with `message`, `nodesJson`, `edgesJson`, `viewport`, `pumlSource`.
- The branch's `head_commit_id` is updated atomically (optimistic lock: fails with 409 if a concurrent commit landed).
- `GET /diagrams/{id}` returns content from the HEAD commit of the default branch via `DiagramResponse`.

### Key API endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/diagrams/{id}/commits` | List commits for the default branch, newest first |
| `GET` | `/commits/{commitId}` | Full commit content (nodesJson, edgesJson, viewport, pumlSource) |
| `POST` | `/branches/{branchId}/commits` | Create a new commit (saves content) |
| `POST` | `/diagrams/{id}/revert/{commitId}` | Create a revert commit restoring a prior commit's content |
| `GET` | `/diagrams/{id}/branches` | List all branches |
| `POST` | `/diagrams/{id}/branches` | Create a new branch |
| `GET` | `/branches/{branchId}/commits` | List commits for any branch |

### Frontend store
`useDiagramStore` (diagram.ts) carries `defaultBranchId: string | null`. It is set by every `loadDiagram()` call. All code that calls `loadDiagram` must pass `defaultBranchId: d.defaultBranchId` from the API response.

`TopBar.save()` creates a commit via `api.commits.create(defaultBranchId, { message, nodesJson, edgesJson })`.

`VersionHistory` panel (`components/panels/VersionHistory.tsx`) reads from `api.commits.listForDiagram(diagramId)` and reverts via `api.commits.revert(diagramId, commitId)`.

### Legacy DiagramVersion table
`diagram_versions` and the `VersionHandler` (`internal/api/versions.go`) still exist for backward compatibility but are no longer written to. Do not add new code that writes to `diagram_versions`.

## Key conventions

- UUIDs generated in application code (`github.com/google/uuid`), stored as `text` PK
- Timestamps are `time.Time` with `gorm:"autoCreateTime"` / `gorm:"autoUpdateTime"` — no manual `time.Now()` in handlers
- All update handlers use `.Select(fields...)` before `.Updates()` to force zero-value fields through
- `DiagramSummary` is a read-only projection (not a GORM model), queried via `db.Model(&Diagram{}).Select(...)`
- `CommitSummary` is the same for commit list endpoints — excludes the large JSON content fields
- `Diagram.NodesJSON/EdgesJSON` fields are tagged `json:"-"` (legacy, kept for migration tooling only); content comes from commits
- `PluginConfig` and `MetricSnapshot` models exist in the schema but have no API endpoints yet (Monitor mode, Phase 4)
