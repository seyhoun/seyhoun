# Seyhoun

A self-hostable architecture and UML diagramming tool with git-like versioning, multi-user workspaces, and support for 12 diagram types.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE)
[![Go Version](https://img.shields.io/badge/Go-1.23-00ADD8)](https://go.dev/)

---

## Features

- **12 diagram types** — architecture, network, platform, deployment, component, sequence, class, ER, flowchart, state machine, activity, use case
- **Git-like versioning** — every save creates a commit; browse history and revert to any prior state
- **Workspaces & projects** — multi-tenant hierarchy with role-based access (owner → developer → viewer)
- **Export / Import** — JSON round-trip and PNG export; import from Docker Compose and Terraform
- **Per-diagram edge types** — each diagram type exposes only the relevant relationship kinds (e.g. inheritance/composition for class, transition for state machine, message types for sequence)
- **Rich UML palette** — full element sets per diagram type: lifelines, fragments, swim lanes, fork/join, signal nodes, composite states, and more
- **Self-hostable** — single binary serving the frontend, backed by PostgreSQL

---

## Diagram Types

| Family | Types |
|---|---|
| **Infrastructure** | Architecture, Network, Platform, Deployment, Component |
| **UML** | Sequence, Class, State Machine, Activity, Use Case |
| **Other** | ER Diagram, Flowchart |

---

## Quick Start (Docker)

```bash
git clone https://github.com/your-org/seyhoun.git
cd seyhoun

# Set required secrets
export AUTH_JWT_SECRET=$(openssl rand -hex 32)
export DATABASE_PASSWORD=changeme

docker compose up
```

Open [http://localhost:1374](http://localhost:1374).

Run migrations after the first boot:

```bash
docker compose exec app seyhoun migrate up
```

---

## Quick Start (Development)

### Prerequisites

- Go 1.23+
- Node.js 20+
- PostgreSQL 15+

### Setup

```bash
# 1. Clone
git clone https://github.com/your-org/seyhoun.git
cd seyhoun

# 2. Install frontend dependencies
make install

# 3. Configure
cp config.example.yml config.yml
# Edit config.yml — set database credentials

# Set secrets in .env (gitignored)
echo "AUTH_JWT_SECRET=$(openssl rand -hex 32)" > .env
echo "DATABASE_PASSWORD=changeme" >> .env

# 4. Create the database and apply migrations
createdb seyhoundb
make migrate

# 5. Start both servers (two terminals)
make dev-api   # Terminal 1 — Go API on :1375
make dev-web   # Terminal 2 — Vite on :1374 (proxies /api → :1375)
```

Open [http://localhost:1374](http://localhost:1374).

---

## Configuration

All settings can be overridden with environment variables using `_` as the key separator. `AUTH_JWT_SECRET` is required in production — the server will refuse to start without it.

| Environment variable | Default | Description |
|---|---|---|
| `SERVER_PORT` | `1374` | HTTP listen port |
| `SERVER_CORS_ORIGINS` | `["*"]` | Allowed CORS origins |
| `DATABASE_HOST` | `localhost` | PostgreSQL host |
| `DATABASE_PORT` | `5432` | PostgreSQL port |
| `DATABASE_NAME` | `seyhoundb` | Database name |
| `DATABASE_USER` | `seyhounapp` | Database user |
| `DATABASE_PASSWORD` | — | Database password (**required**) |
| `DATABASE_SSLMODE` | `disable` | PostgreSQL SSL mode |
| `AUTH_JWT_SECRET` | — | JWT signing secret (**required in production**) |
| `LOG_LEVEL` | `info` | Log level (`debug`, `info`, `warn`, `error`) |

See `config.example.yml` for the full list with comments.

---

## Project Structure

```
cmd/
  main.go               Entry point — loads config, connects DB, starts server
  migrate/main.go       Migration runner (goose)
  cli/main.go           Admin CLI (create users, workspaces, etc.)
internal/
  config/config.go      Config structs and Viper loader
  db/db.go              GORM connection with pool tuning
  hash/hash.go          SHA-256 content hashing (shared utility)
  slug/slug.go          Slug generation (shared utility)
  models/models.go      GORM models: User, Workspace, Project, Diagram, Branch, Commit …
  api/                  HTTP handlers (auth, projects, diagrams, commits, branches …)
  server/server.go      Chi router, middleware, SPA handler, health endpoint
  merge/                Three-way merge for diagram branches
  diff/                 Structural diff between diagram commits
  importer/             Import from JSON / Docker Compose / Terraform
migrations/
  001_initial_schema.sql        Full schema (CREATE TABLE IF NOT EXISTS)
  002_personal_workspaces.go    Data migration
  003_assign_projects.go        Data migration
  004_diagram_branch_commit.go  Data migration
web/src/
  modes/                HomePage, SchemaPage, DesignMode, PresentMode, MonitorMode
  components/
    canvas/             ArchCanvas, nodeTypes registry
    edges/              UmlEdge (all UML relationship and sequence message types)
    nodes/              BaseNode (infra), FlowchartNode, StateNode, ClassNode, EntityNode,
                        ActivityNode, ActorNode, UseCaseNode, SystemBoundaryNode,
                        LifelineNode, MessageNode, FragmentNode
    panels/             Per-diagram-type inspectors, EdgeInspector, VersionHistory
    layout/             Sidebar (element palette + project tree), TopBar
  stores/               Zustand stores: diagram, auth, ui
  lib/
    api.ts              Typed fetch wrapper for all API calls
    techRegistry.ts     Infrastructure palette + DIAGRAM_TYPES registry
    elementRegistry.ts  UML element palette, category groups, per-diagram edge config
  types/diagram.ts      TypeScript types, ElementKind union, node data interfaces, type guards
```

---

## Database Migrations

Seyhoun uses [goose](https://github.com/pressly/goose) — not GORM AutoMigrate. Migration files live in `migrations/`.

```bash
make migrate                           # Apply all pending migrations
make migrate-down                      # Roll back the last migration
make migrate-status                    # Show applied vs pending migrations
make migrate-create name=add_foo       # Scaffold a new SQL migration
```

SQL migrations use `-- +goose Up` / `-- +goose Down` markers. Applied migrations are tracked in the `goose_db_version` table.

---

## API Overview

All endpoints are under `/api` and require a JWT bearer token unless noted.

| Group | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PUT /auth/me` |
| Workspaces | `GET /workspaces`, `POST /workspaces`, `GET /workspaces/:id` … |
| Projects | `GET /projects`, `POST /projects`, `GET /projects/:id` … |
| Diagrams | `GET /diagrams/:id`, `POST /projects/:id/diagrams`, `PUT /diagrams/:id`, `DELETE /diagrams/:id` |
| Commits | `GET /diagrams/:id/commits`, `POST /branches/:id/commits`, `POST /diagrams/:id/revert/:commitId` |
| Branches | `GET /diagrams/:id/branches`, `POST /diagrams/:id/branches` |
| Import | `POST /import/json`, `POST /import/compose`, `POST /import/terraform` |
| Export | `GET /diagrams/:id/export` |
| Templates | `GET /templates`, `GET /templates/:id` |
| Health | `GET /health` (unauthenticated) |

> **Saving diagram content** always goes through `POST /branches/:id/commits` — not `PUT /diagrams/:id`. The PUT endpoint only updates the diagram name and type.

---

## Contributing

1. Fork and create a feature branch.
2. Follow existing Go and TypeScript style conventions.
3. Add or update tests for changed behaviour.
4. Open a pull request — one logical change per PR.

---

## License

Seyhoun is licensed under the [GNU Affero General Public License v3.0](./LICENSE). If you run a modified version as a network service, you must make the source available to its users.
