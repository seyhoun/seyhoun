package migrations

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"

	"github.com/google/uuid"
	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationNoTxContext(upPersonalWorkspaces, downPersonalWorkspaces)
}

func upPersonalWorkspaces(ctx context.Context, db *sql.DB) error {
	rows, err := db.QueryContext(ctx, `SELECT id, email, name FROM users`)
	if err != nil {
		return fmt.Errorf("list users: %w", err)
	}
	defer rows.Close()

	type user struct{ id, email, name string }
	var users []user
	for rows.Next() {
		var u user
		if err := rows.Scan(&u.id, &u.email, &u.name); err != nil {
			return err
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	for _, u := range users {
		slug, err := uniqueSlug(ctx, db, makeSlug(u.email))
		if err != nil {
			return fmt.Errorf("generate slug for %s: %w", u.email, err)
		}
		wsID := uuid.New().String()
		memberID := uuid.New().String()

		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			return err
		}
		_, err = tx.ExecContext(ctx,
			`INSERT INTO workspaces (id, slug, name, owner_id, is_personal)
			 VALUES ($1, $2, $3, $4, true)
			 ON CONFLICT DO NOTHING`,
			wsID, slug, u.name, u.id,
		)
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("create workspace for %s: %w", u.email, err)
		}
		_, err = tx.ExecContext(ctx,
			`INSERT INTO workspace_members (id, workspace_id, user_id, role)
			 VALUES ($1, $2, $3, 'owner')
			 ON CONFLICT DO NOTHING`,
			memberID, wsID, u.id,
		)
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("create workspace member for %s: %w", u.email, err)
		}
		if err := tx.Commit(); err != nil {
			return err
		}
		slog.Info("created personal workspace", "user", u.email, "workspace", wsID, "slug", slug)
	}
	return nil
}

func downPersonalWorkspaces(ctx context.Context, db *sql.DB) error {
	// workspace_members cascade-deletes when the workspace is deleted.
	_, err := db.ExecContext(ctx, `DELETE FROM workspaces WHERE is_personal = true`)
	return err
}
