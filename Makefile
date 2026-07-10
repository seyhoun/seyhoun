.PHONY: install dev-api dev-web build build-cli migrate migrate-down migrate-status migrate-create clean test test-api test-web docker docker-up

install:
	cd web && npm install

## Run Go API server (port 1374). Keep running alongside dev-web.
dev-api:
	go run ./cmd

## Run Vite dev server (port 1374, proxies /api → Go API on :1375).
dev-web:
	cd web && npm run dev

## Full production build: frontend → web/dist, then Go binary.
build:
	cd web && npm run build
	go build -o seyhoun ./cmd

## Run the production binary (serves everything on :1374).
run: build
	./seyhoun

## Run all tests (requires seyhoundb_test database).
test: test-api test-web

## Run Go API tests against the test database.
test-api:
	go test ./internal/...

## Run frontend Vitest tests.
test-web:
	cd web && npx vitest run

## Lint frontend code.
lint-web:
	cd web && npx eslint src/

## Build the admin CLI binary.
build-cli:
	go build -o seyhoun-cli ./cmd/cli

## Apply all pending migrations.
migrate:
	go run ./cmd/migrate up

## Roll back the last applied migration.
migrate-down:
	go run ./cmd/migrate down

## Show migration status (applied vs pending).
migrate-status:
	go run ./cmd/migrate status

## Create a new SQL migration file. Usage: make migrate-create name=add_foo_table
migrate-create:
	go run ./cmd/migrate create $(name) sql

## Build the Docker image.
docker:
	docker compose build

## Start all services with Docker Compose.
docker-up:
	docker compose up

clean:
	rm -rf web/dist seyhoun seyhoun-cli
