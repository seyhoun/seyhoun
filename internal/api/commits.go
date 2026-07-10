package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"seyhoun/internal/hash"
	"seyhoun/internal/models"
	"seyhoun/internal/rbac"
)

// ErrConcurrentCommit is returned when the optimistic lock on branch.head_commit_id
// detects that another commit landed between our read and write.
var ErrConcurrentCommit = errors.New("concurrent commit detected")

type CommitHandler struct {
	db   *gorm.DB
	rbac *rbac.RBAC
}

func NewCommitHandler(db *gorm.DB) *CommitHandler {
	return &CommitHandler{db: db, rbac: rbac.New(db)}
}

// List returns commit history for a branch, newest first.
func (h *CommitHandler) List(w http.ResponseWriter, r *http.Request) {
	branchID := chi.URLParam(r, "branchId")
	userID := UserIDFromContext(r.Context())

	var branch models.Branch
	if err := h.db.Select("id, diagram_id").First(&branch, "id = ?", branchID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "branch not found")
			return
		}
		serverError(w, err)
		return
	}

	wsID, projID, err := workspaceAndProjectForDiagram(h.db, branch.DiagramID)
	if err != nil {
		serverError(w, err)
		return
	}
	if !h.rbac.CanView(userID, wsID, projID) {
		writeError(w, 403, "forbidden")
		return
	}

	var commits []models.CommitSummary
	if err := h.db.Model(&models.Commit{}).
		Select("id, diagram_id, branch_id, parent_id, author_id, message, content_hash, created_at").
		Where("branch_id = ?", branchID).
		Order("created_at desc").
		Find(&commits).Error; err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, 200, commits)
}

// Create creates a new commit on a branch with full diagram snapshot content.
// Uses optimistic locking: updates branch.head_commit_id only if it still matches
// the parent commit. Returns 409 if another commit landed in between.
func (h *CommitHandler) Create(w http.ResponseWriter, r *http.Request) {
	branchID := chi.URLParam(r, "branchId")
	userID := UserIDFromContext(r.Context())

	var branch models.Branch
	if err := h.db.First(&branch, "id = ?", branchID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "branch not found")
			return
		}
		serverError(w, err)
		return
	}

	wsID, projID, err := workspaceAndProjectForDiagram(h.db, branch.DiagramID)
	if err != nil {
		serverError(w, err)
		return
	}
	if !h.rbac.CanDevelop(userID, wsID, projID) {
		writeError(w, 403, "forbidden")
		return
	}

	var req struct {
		Message    string `json:"message"`
		NodesJSON  string `json:"nodesJson"`
		EdgesJSON  string `json:"edgesJson"`
		Viewport   string `json:"viewport"`
		PumlSource string `json:"pumlSource"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}
	if req.Message == "" {
		writeError(w, 400, "message is required")
		return
	}
	if req.NodesJSON == "" {
		req.NodesJSON = "[]"
	}
	if req.EdgesJSON == "" {
		req.EdgesJSON = "[]"
	}
	if req.Viewport == "" {
		req.Viewport = `{"x":0,"y":0,"zoom":1}`
	}

	commit := models.Commit{
		ID:          uuid.New().String(),
		DiagramID:   branch.DiagramID,
		BranchID:    branchID,
		ParentID:    branch.HeadCommitID,
		AuthorID:    userID,
		Message:     req.Message,
		NodesJSON:   req.NodesJSON,
		EdgesJSON:   req.EdgesJSON,
		Viewport:    req.Viewport,
		PumlSource:  req.PumlSource,
		ContentHash: hash.Content(req.NodesJSON, req.EdgesJSON),
	}

	// Optimistic locking: update head_commit_id only if it still matches what we
	// read above. This prevents two concurrent saves from silently overwriting each other.
	if err = h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&commit).Error; err != nil {
			return err
		}
		result := tx.Model(&models.Branch{}).
			Where("id = ? AND head_commit_id = ?", branchID, branch.HeadCommitID).
			Update("head_commit_id", commit.ID)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return ErrConcurrentCommit
		}
		return nil
	}); err != nil {
		if errors.Is(err, ErrConcurrentCommit) {
			writeError(w, 409, "another commit was created on this branch; please fetch the latest state and retry")
			return
		}
		serverError(w, err)
		return
	}
	writeJSON(w, 201, commit)
}

// ListForDiagram returns commit history for a diagram's default branch, newest first.
func (h *CommitHandler) ListForDiagram(w http.ResponseWriter, r *http.Request) {
	diagramID := chi.URLParam(r, "id")
	userID := UserIDFromContext(r.Context())

	var d models.Diagram
	if err := h.db.Select("id, project_id, default_branch_id").First(&d, "id = ?", diagramID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "diagram not found")
			return
		}
		serverError(w, err)
		return
	}

	wsID, projID, err := workspaceAndProjectForDiagram(h.db, diagramID)
	if err != nil {
		serverError(w, err)
		return
	}
	if !h.rbac.CanView(userID, wsID, projID) {
		writeError(w, 403, "forbidden")
		return
	}

	if d.DefaultBranchID == "" {
		writeJSON(w, 200, []models.CommitSummary{})
		return
	}

	var commits []models.CommitSummary
	if err := h.db.Model(&models.Commit{}).
		Select("id, diagram_id, branch_id, parent_id, author_id, message, content_hash, created_at").
		Where("branch_id = ?", d.DefaultBranchID).
		Order("created_at desc").
		Find(&commits).Error; err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, 200, commits)
}

// Revert creates a new commit on the default branch that restores the content of a prior commit.
func (h *CommitHandler) Revert(w http.ResponseWriter, r *http.Request) {
	diagramID := chi.URLParam(r, "id")
	commitID := chi.URLParam(r, "commitId")
	userID := UserIDFromContext(r.Context())

	var d models.Diagram
	if err := h.db.Select("id, project_id, default_branch_id").First(&d, "id = ?", diagramID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "diagram not found")
			return
		}
		serverError(w, err)
		return
	}

	wsID, projID, err := workspaceAndProjectForDiagram(h.db, diagramID)
	if err != nil {
		serverError(w, err)
		return
	}
	if !h.rbac.CanDevelop(userID, wsID, projID) {
		writeError(w, 403, "forbidden")
		return
	}

	var target models.Commit
	if err := h.db.First(&target, "id = ? AND diagram_id = ?", commitID, diagramID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "commit not found")
			return
		}
		serverError(w, err)
		return
	}

	var branch models.Branch
	if err := h.db.First(&branch, "id = ?", d.DefaultBranchID).Error; err != nil {
		serverError(w, err)
		return
	}

	revertCommit := models.Commit{
		ID:          uuid.New().String(),
		DiagramID:   diagramID,
		BranchID:    d.DefaultBranchID,
		ParentID:    branch.HeadCommitID,
		AuthorID:    userID,
		Message:     fmt.Sprintf("Revert to \"%s\"", target.Message),
		NodesJSON:   target.NodesJSON,
		EdgesJSON:   target.EdgesJSON,
		Viewport:    target.Viewport,
		PumlSource:  target.PumlSource,
		ContentHash: target.ContentHash,
	}

	if err = h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&revertCommit).Error; err != nil {
			return err
		}
		result := tx.Model(&models.Branch{}).
			Where("id = ? AND head_commit_id = ?", d.DefaultBranchID, branch.HeadCommitID).
			Update("head_commit_id", revertCommit.ID)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return ErrConcurrentCommit
		}
		return nil
	}); err != nil {
		if errors.Is(err, ErrConcurrentCommit) {
			writeError(w, 409, "another commit was created on this branch; please retry")
			return
		}
		serverError(w, err)
		return
	}
	writeJSON(w, 201, revertCommit)
}

// Get returns the full content of a single commit.
func (h *CommitHandler) Get(w http.ResponseWriter, r *http.Request) {
	commitID := chi.URLParam(r, "commitId")
	userID := UserIDFromContext(r.Context())

	var commit models.Commit
	if err := h.db.First(&commit, "id = ?", commitID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "commit not found")
			return
		}
		serverError(w, err)
		return
	}

	wsID, projID, err := workspaceAndProjectForDiagram(h.db, commit.DiagramID)
	if err != nil {
		serverError(w, err)
		return
	}
	if !h.rbac.CanView(userID, wsID, projID) {
		writeError(w, 403, "forbidden")
		return
	}
	writeJSON(w, 200, commit)
}
