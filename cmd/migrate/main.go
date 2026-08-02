// cmd/migrate applies, rolls back, or reports the status of database
// migrations via goose. It shares config loading with the API server, so it
//
// Usage:
//	migrate up               apply all pending migrations
//	migrate down              roll back the last applied migration
//	migrate status             show applied vs pending migrations
//	migrate create <name> sql   scaffold a new SQL migration file
package main

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
	"github.com/pressly/goose/v3"

	"seyhoun/internal/config"
	_ "seyhoun/migrations"
)

func main() {
	if err := godotenv.Load(); err != nil && !os.IsNotExist(err) {
		log.Printf("warning: could not load .env file: %v", err)
	}

	if len(os.Args) < 2 {
		log.Fatal("usage: migrate <up|down|status|create> [args...]")
	}
	command, args := os.Args[1], os.Args[2:]

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	db, err := sql.Open("pgx", cfg.Database.DSN())
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer db.Close()

	if err := goose.SetDialect("postgres"); err != nil {
		log.Fatalf("set dialect: %v", err)
	}

	if err := goose.Run(command, db, "migrations", args...); err != nil {
		log.Fatalf("migrate %s: %v", command, err)
	}
}
