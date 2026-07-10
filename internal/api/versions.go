package api

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"seyhoun/internal/models"
	"seyhoun/internal/rbac"
)

type VersionHandler struct {
	db   *gorm.DB
	rbac *rbac.RBAC
}

func NewVersionHandler(db *gorm.DB) *VersionHandler {
	return &VersionHandler{db: db, rbac: rbac.New(db)}
}

// List returns all version summaries for a diagram, newest first.
func (h *VersionHandler) List(w http.ResponseWriter, r *http.Request) {
	diagramID := chi.URLParam(r, "id")
	userID := UserIDFromContext(r.Context())

	wsID, projID, err := workspaceAndProjectForDiagram(h.db, diagramID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "diagram not found")
			return
		}
		serverError(w, err)
		return
	}
	if !h.rbac.CanView(userID, wsID, projID) {
		writeError(w, 403, "forbidden")
		return
	}

	var versions []models.DiagramVersionSummary
	if err := h.db.Model(&models.DiagramVersion{}).
		Select("id, diagram_id, version, created_at").
		Where("diagram_id = ?", diagramID).
		Order("version desc").
		Find(&versions).Error; err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, 200, versions)
}

// Get returns the full content of a single version snapshot.
func (h *VersionHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := UserIDFromContext(r.Context())

	var v models.DiagramVersion
	if err := h.db.First(&v, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "version not found")
			return
		}
		serverError(w, err)
		return
	}

	wsID, projID, err := workspaceAndProjectForDiagram(h.db, v.DiagramID)
	if err != nil {
		serverError(w, err)
		return
	}
	if !h.rbac.CanView(userID, wsID, projID) {
		writeError(w, 403, "forbidden")
		return
	}

	writeJSON(w, 200, v)
}

// Restore copies a version's content back into the live diagram.
// It first snapshots the current state as a new "restore-point" version,
// then overwrites the diagram with the chosen version's data.
func (h *VersionHandler) Restore(w http.ResponseWriter, r *http.Request) {
	diagramID := chi.URLParam(r, "id")
	versionID := chi.URLParam(r, "versionId")
	userID := UserIDFromContext(r.Context())

	wsID, projID, err := workspaceAndProjectForDiagram(h.db, diagramID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "diagram not found")
			return
		}
		serverError(w, err)
		return
	}
	if !h.rbac.CanDevelop(userID, wsID, projID) {
		writeError(w, 403, "forbidden")
		return
	}

	if err := h.db.Transaction(func(tx *gorm.DB) error {
		var target models.DiagramVersion
		if err := tx.First(&target, "id = ? AND diagram_id = ?", versionID, diagramID).Error; err != nil {
			return err
		}

		var current models.Diagram
		if err := tx.First(&current, "id = ?", diagramID).Error; err != nil {
			return err
		}

		nextVersion, err := nextVersionNumber(tx, diagramID)
		if err != nil {
			return err
		}
		restorePoint := models.DiagramVersion{
			ID:        uuid.New().String(),
			DiagramID: diagramID,
			Version:   nextVersion,
			NodesJSON: current.NodesJSON,
			EdgesJSON: current.EdgesJSON,
			Viewport:  current.Viewport,
		}
		if err := tx.Create(&restorePoint).Error; err != nil {
			return err
		}

		return tx.Model(&models.Diagram{ID: diagramID}).
			Select("NodesJSON", "EdgesJSON", "Viewport").
			Updates(models.Diagram{
				NodesJSON: target.NodesJSON,
				EdgesJSON: target.EdgesJSON,
				Viewport:  target.Viewport,
			}).Error
	}); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "version or diagram not found")
			return
		}
		serverError(w, err)
		return
	}

	var d models.Diagram
	if err := h.db.First(&d, "id = ?", diagramID).Error; err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, 200, d)
}

// nextVersionNumber returns MAX(version)+1 for a diagram's version history.
func nextVersionNumber(db *gorm.DB, diagramID string) (int, error) {
	var max int
	row := db.Model(&models.DiagramVersion{}).
		Where("diagram_id = ?", diagramID).
		Select("COALESCE(MAX(version), 0)").
		Row()
	if err := row.Scan(&max); err != nil {
		return 0, err
	}
	return max + 1, nil
}
