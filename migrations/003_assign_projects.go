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
	goose.AddMigrationNoTxContext(upAssignProjects, downAssignProjects)
}

func upAssignProjects(ctx context.Context, db *sql.DB) error {
	// Build user → personal workspace map.
	rows, err := db.QueryContext(ctx, `SELECT owner_id, id FROM workspaces WHERE is_personal = true`)
	if err != nil {
		return fmt.Errorf("list personal workspaces: %w", err)
	}
	defer rows.Close()
	userToWS := make(map[string]string)
	for rows.Next() {
		var ownerID, wsID string
		if err := rows.Scan(&ownerID, &wsID); err != nil {
			return err
		}
		userToWS[ownerID] = wsID
	}
	if err := rows.Err(); err != nil {
		return err
	}

	// Load projects that have no workspace yet.
	prows, err := db.QueryContext(ctx, `SELECT id, owner_id FROM projects WHERE workspace_id = '' OR workspace_id IS NULL`)
	if err != nil {
		return fmt.Errorf("list unassigned projects: %w", err)
	}
	defer prows.Close()

	type proj struct{ id, ownerID string }
	var projects []proj
	for prows.Next() {
		var p proj
		if err := prows.Scan(&p.id, &p.ownerID); err != nil {
			return err
		}
		projects = append(projects, p)
	}
	if err := prows.Err(); err != nil {
		return err
	}

	for _, p := range projects {
		wsID, ok := userToWS[p.ownerID]
		if !ok {
			slog.Warn("no personal workspace for project owner, skipping", "project", p.id, "owner", p.ownerID)
			continue
		}
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx,
			`UPDATE projects SET workspace_id = $1 WHERE id = $2`,
			wsID, p.id,
		); err != nil {
			tx.Rollback()
			return fmt.Errorf("assign project %s: %w", p.id, err)
		}
		memberID := uuid.New().String()
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO project_members (id, project_id, user_id, role)
			 VALUES ($1, $2, $3, 'owner')
			 ON CONFLICT (project_id, user_id) DO NOTHING`,
			memberID, p.id, p.ownerID,
		); err != nil {
			tx.Rollback()
			return fmt.Errorf("create project member for %s: %w", p.id, err)
		}
		if err := tx.Commit(); err != nil {
			return err
		}
		slog.Info("assigned project to workspace", "project", p.id, "workspace", wsID)
	}
	return nil
}

func downAssignProjects(ctx context.Context, db *sql.DB) error {
	_, err := db.ExecContext(ctx, `UPDATE projects SET workspace_id = '' WHERE workspace_id != ''`)
	if err != nil {
		return err
	}
	_, err = db.ExecContext(ctx, `DELETE FROM project_members WHERE role = 'owner'`)
	return err
}
