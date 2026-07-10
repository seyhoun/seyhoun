-- +goose Up
-- Full schema for Seyhoun. Uses IF NOT EXISTS so it is safe to run on an
-- existing database that was previously managed by GORM AutoMigrate.

CREATE TABLE IF NOT EXISTS users (
    id         text PRIMARY KEY,
    email      text NOT NULL,
    name       text NOT NULL,
    pass_hash  text NOT NULL,
    is_admin   boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS workspaces (
    id          text PRIMARY KEY,
    slug        text NOT NULL,
    name        text NOT NULL,
    owner_id    text NOT NULL,
    is_personal boolean NOT NULL DEFAULT false,
    avatar_url  text NOT NULL DEFAULT '',
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces (slug);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces (owner_id);

CREATE TABLE IF NOT EXISTS workspace_members (
    id           text PRIMARY KEY,
    workspace_id text NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    user_id      text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role         text NOT NULL DEFAULT 'viewer',
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ws_member ON workspace_members (workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ws_member_user ON workspace_members (user_id);

CREATE TABLE IF NOT EXISTS projects (
    id           text PRIMARY KEY,
    workspace_id text NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    owner_id     text NOT NULL,
    name         text NOT NULL,
    description  text NOT NULL DEFAULT '',
    visibility   text NOT NULL DEFAULT 'private',
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects (workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects (owner_id);

CREATE TABLE IF NOT EXISTS project_members (
    id         text PRIMARY KEY,
    project_id text NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    user_id    text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role       text NOT NULL DEFAULT 'viewer',
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_proj_member ON project_members (project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_proj_member_user ON project_members (user_id);

CREATE TABLE IF NOT EXISTS diagrams (
    id                text PRIMARY KEY,
    project_id        text NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    name              text NOT NULL,
    diagram_type      text NOT NULL DEFAULT 'architecture',
    default_branch_id text,
    nodes_json        text NOT NULL DEFAULT '[]',
    edges_json        text NOT NULL DEFAULT '[]',
    puml_source       text NOT NULL DEFAULT '',
    viewport          text NOT NULL DEFAULT '{"x":0,"y":0,"zoom":1}',
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_diagrams_project ON diagrams (project_id);

CREATE TABLE IF NOT EXISTS branches (
    id             text PRIMARY KEY,
    diagram_id     text NOT NULL REFERENCES diagrams (id) ON DELETE CASCADE,
    name           text NOT NULL,
    head_commit_id text,
    base_branch_id text,
    base_commit_id text,
    created_by_id  text NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_branch_name ON branches (diagram_id, name);
CREATE INDEX IF NOT EXISTS idx_branches_diagram ON branches (diagram_id);
CREATE INDEX IF NOT EXISTS idx_branches_created_by ON branches (created_by_id);

CREATE TABLE IF NOT EXISTS commits (
    id           text PRIMARY KEY,
    diagram_id   text NOT NULL REFERENCES diagrams (id) ON DELETE CASCADE,
    branch_id    text NOT NULL REFERENCES branches (id) ON DELETE CASCADE,
    parent_id    text,
    author_id    text NOT NULL,
    message      text NOT NULL,
    nodes_json   text NOT NULL,
    edges_json   text NOT NULL,
    viewport     text NOT NULL,
    puml_source  text NOT NULL DEFAULT '',
    content_hash text NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_commits_diagram   ON commits (diagram_id);
CREATE INDEX IF NOT EXISTS idx_commits_branch    ON commits (branch_id);
CREATE INDEX IF NOT EXISTS idx_commits_parent    ON commits (parent_id);
CREATE INDEX IF NOT EXISTS idx_commits_author    ON commits (author_id);
CREATE INDEX IF NOT EXISTS idx_commits_hash      ON commits (content_hash);

CREATE TABLE IF NOT EXISTS pull_requests (
    id               text PRIMARY KEY,
    diagram_id       text NOT NULL REFERENCES diagrams (id) ON DELETE CASCADE,
    number           integer NOT NULL,
    title            text NOT NULL,
    description      text NOT NULL DEFAULT '',
    source_branch_id text NOT NULL,
    target_branch_id text NOT NULL,
    author_id        text NOT NULL,
    status           text NOT NULL DEFAULT 'open',
    merged_by_id     text,
    merged_at        timestamptz,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pr_number ON pull_requests (diagram_id, number);
CREATE INDEX IF NOT EXISTS idx_prs_diagram ON pull_requests (diagram_id);
CREATE INDEX IF NOT EXISTS idx_prs_author  ON pull_requests (author_id);

CREATE TABLE IF NOT EXISTS pr_comments (
    id              text PRIMARY KEY,
    pull_request_id text NOT NULL REFERENCES pull_requests (id) ON DELETE CASCADE,
    author_id       text NOT NULL,
    body            text NOT NULL,
    node_id         text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pr_comments_pr ON pr_comments (pull_request_id);

CREATE TABLE IF NOT EXISTS plugin_configs (
    id          text PRIMARY KEY,
    diagram_id  text NOT NULL REFERENCES diagrams (id) ON DELETE CASCADE,
    node_id     text NOT NULL,
    plugin_type text NOT NULL,
    config_json text NOT NULL DEFAULT '{}',
    enabled     boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plugin_configs_diagram ON plugin_configs (diagram_id);

CREATE TABLE IF NOT EXISTS metric_snapshots (
    id               serial PRIMARY KEY,
    plugin_config_id text NOT NULL REFERENCES plugin_configs (id) ON DELETE CASCADE,
    data_json        text NOT NULL,
    captured_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_snapshots_config_time ON metric_snapshots (plugin_config_id, captured_at);

CREATE TABLE IF NOT EXISTS diagram_versions (
    id         text PRIMARY KEY,
    diagram_id text NOT NULL REFERENCES diagrams (id) ON DELETE CASCADE,
    version    integer NOT NULL,
    nodes_json text NOT NULL,
    edges_json text NOT NULL,
    viewport   text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_versions_diagram ON diagram_versions (diagram_id);

-- +goose Down
DROP TABLE IF EXISTS diagram_versions;
DROP TABLE IF EXISTS metric_snapshots;
DROP TABLE IF EXISTS plugin_configs;
DROP TABLE IF EXISTS pr_comments;
DROP TABLE IF EXISTS pull_requests;
DROP TABLE IF EXISTS commits;
DROP TABLE IF EXISTS branches;
DROP TABLE IF EXISTS diagrams;
DROP TABLE IF EXISTS project_members;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS workspace_members;
DROP TABLE IF EXISTS workspaces;
DROP TABLE IF EXISTS users;
