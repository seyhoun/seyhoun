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
	goose.AddMigrationNoTxContext(upDiagramBranchCommit, downDiagramBranchCommit)
}

func upDiagramBranchCommit(ctx context.Context, db *sql.DB) error {
	// Build project → owner map.
	prows, err := db.QueryContext(ctx, `SELECT id, owner_id FROM projects`)
	if err != nil {
		return fmt.Errorf("list projects: %w", err)
	}
	defer prows.Close()
	projectOwner := make(map[string]string)
	for prows.Next() {
		var id, ownerID string
		if err := prows.Scan(&id, &ownerID); err != nil {
			return err
		}
		projectOwner[id] = ownerID
	}
	if err := prows.Err(); err != nil {
		return err
	}

	// Load diagrams that have no default branch yet.
	drows, err := db.QueryContext(ctx,
		`SELECT id, project_id, nodes_json, edges_json, puml_source, viewport
		 FROM diagrams
		 WHERE default_branch_id IS NULL OR default_branch_id = ''`,
	)
	if err != nil {
		return fmt.Errorf("list unmigrated diagrams: %w", err)
	}
	defer drows.Close()

	type diagram struct {
		id, projectID, nodesJSON, edgesJSON, pumlSource, viewport string
	}
	var diagrams []diagram
	for drows.Next() {
		var d diagram
		if err := drows.Scan(&d.id, &d.projectID, &d.nodesJSON, &d.edgesJSON, &d.pumlSource, &d.viewport); err != nil {
			return err
		}
		diagrams = append(diagrams, d)
	}
	if err := drows.Err(); err != nil {
		return err
	}

	for _, d := range diagrams {
		ownerID, ok := projectOwner[d.projectID]
		if !ok {
			slog.Warn("project not found for diagram, skipping", "diagram", d.id)
			continue
		}

		nodesJSON := d.nodesJSON
		if nodesJSON == "" {
			nodesJSON = "[]"
		}
		edgesJSON := d.edgesJSON
		if edgesJSON == "" {
			edgesJSON = "[]"
		}
		viewport := d.viewport
		if viewport == "" {
			viewport = `{"x":0,"y":0,"zoom":1}`
		}

		branchID := uuid.New().String()
		commitID := uuid.New().String()

		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			return err
		}

		if _, err := tx.ExecContext(ctx,
			`INSERT INTO branches (id, diagram_id, name, head_commit_id, created_by_id)
			 VALUES ($1, $2, 'main', $3, $4)`,
			branchID, d.id, commitID, ownerID,
		); err != nil {
			tx.Rollback()
			return fmt.Errorf("create branch for diagram %s: %w", d.id, err)
		}

		if _, err := tx.ExecContext(ctx,
			`INSERT INTO commits (id, diagram_id, branch_id, author_id, message, nodes_json, edges_json, viewport, puml_source, content_hash)
			 VALUES ($1, $2, $3, $4, 'Initial import from legacy data', $5, $6, $7, $8, $9)`,
			commitID, d.id, branchID, ownerID, nodesJSON, edgesJSON, viewport, d.pumlSource, hashContent(nodesJSON, edgesJSON),
		); err != nil {
			tx.Rollback()
			return fmt.Errorf("create commit for diagram %s: %w", d.id, err)
		}

		if _, err := tx.ExecContext(ctx,
			`UPDATE diagrams SET default_branch_id = $1, diagram_type = 'architecture' WHERE id = $2`,
			branchID, d.id,
		); err != nil {
			tx.Rollback()
			return fmt.Errorf("update diagram %s: %w", d.id, err)
		}

		if err := tx.Commit(); err != nil {
			return err
		}
		slog.Info("migrated diagram", "diagram", d.id, "branch", branchID, "commit", commitID)

		// Migrate legacy diagram_versions as historical commits.
		vrows, err := db.QueryContext(ctx,
			`SELECT id, version, nodes_json, edges_json, viewport, created_at
			 FROM diagram_versions WHERE diagram_id = $1 ORDER BY version ASC`,
			d.id,
		)
		if err != nil {
			slog.Warn("could not load versions for diagram", "diagram", d.id, "err", err)
			continue
		}

		prevCommitID := commitID
		for vrows.Next() {
			var vID, vNodesJSON, vEdgesJSON, vViewport string
			var vVersion int
			var vCreatedAt sql.NullTime
			if err := vrows.Scan(&vID, &vVersion, &vNodesJSON, &vEdgesJSON, &vViewport, &vCreatedAt); err != nil {
				slog.Warn("scan version row", "err", err)
				continue
			}
			if vViewport == "" {
				vViewport = `{"x":0,"y":0,"zoom":1}`
			}
			vCommitID := uuid.New().String()
			_, err := db.ExecContext(ctx,
				`INSERT INTO commits (id, diagram_id, branch_id, parent_id, author_id, message, nodes_json, edges_json, viewport, puml_source, content_hash, created_at)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '', $10, $11)`,
				vCommitID, d.id, branchID, prevCommitID, ownerID,
				fmt.Sprintf("Version %d (migrated from legacy history)", vVersion),
				vNodesJSON, vEdgesJSON, vViewport,
				hashContent(vNodesJSON, vEdgesJSON),
				vCreatedAt.Time,
			)
			if err != nil {
				slog.Warn("failed to migrate version commit", "version", vVersion, "err", err)
				continue
			}
			prevCommitID = vCommitID
		}
		vrows.Close()
	}
	return nil
}

func downDiagramBranchCommit(ctx context.Context, db *sql.DB) error {
	// Clear default_branch_id; branches and commits cascade-delete via FK.
	if _, err := db.ExecContext(ctx, `UPDATE diagrams SET default_branch_id = NULL`); err != nil {
		return err
	}
	if _, err := db.ExecContext(ctx, `DELETE FROM commits`); err != nil {
		return err
	}
	_, err := db.ExecContext(ctx, `DELETE FROM branches`)
	return err
}
