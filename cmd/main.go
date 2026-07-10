package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"seyhoun/internal/config"
	"seyhoun/internal/db"
	"seyhoun/internal/server"
)

// version is set at build time via -ldflags "-X main.version=x.y.z".
var version = "0.0.1"

func main() {
	// Load .env file if present — sets env vars before Viper reads them.
	// Existing OS env vars are not overwritten (godotenv.Load is a no-op for already-set vars).
	if err := godotenv.Load(); err != nil && !os.IsNotExist(err) {
		log.Printf("warning: could not load .env file: %v", err)
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	level := cfg.Log.SlogLevel()
	handler := slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: level})
	slog.SetDefault(slog.New(handler))

	slog.Info("starting seyhoun", "version", version, "log_level", cfg.Log.Level)

	if cfg.Auth.JWTSecret == "" || cfg.Auth.JWTSecret == "change-me-in-production" {
		log.Fatal("AUTH_JWT_SECRET must be set to a secure random value before starting the server. " +
			"Generate one with: openssl rand -hex 32")
	}

	database, err := db.Connect(cfg)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	// Close the database connection pool on exit.
	sqlDB, err := database.DB()
	if err != nil {
		log.Fatalf("failed to get sql.DB: %v", err)
	}
	defer sqlDB.Close()

	srv := server.New(database, cfg)
	addr := fmt.Sprintf(":%d", cfg.Server.Port)

	httpServer := &http.Server{
		Addr:         addr,
		Handler:      srv.Handler(),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Start server in background.
	go func() {
		slog.Info("server starting", "addr", addr)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server error: %v", err)
		}
	}()

	// Wait for SIGINT or SIGTERM.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(ctx); err != nil {
		log.Fatalf("server forced to shutdown: %v", err)
	}
	slog.Info("server stopped")
}
