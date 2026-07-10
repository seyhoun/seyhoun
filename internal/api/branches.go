package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"seyhoun/internal/models"
	"seyhoun/internal/rbac"
)

type BranchHandler struct {
	db   *gorm.DB
	rbac *rbac.RBAC
}

func NewBranchHandler(db *gorm.DB) *BranchHandler {
	return &BranchHandler{db: db, rbac: rbac.New(db)}
}

// workspaceAndProjectForDiagram resolves a diagramID to its parent workspace and project IDs.
func workspaceAndProjectForDiagram(db *gorm.DB, diagramID string) (wsID, projectID string, err error) {
	var d models.Diagram
	if err = db.Select("project_id").First(&d, "id = ?", diagramID).Error; err != nil {
		return
	}
	projectID = d.ProjectID
	var p models.Project
	if err = db.Select("workspace_id").First(&p, "id = ?", projectID).Error; err != nil {
		return
	}
	wsID = p.WorkspaceID
	return
}

// List lists all branches for a diagram.
func (h *BranchHandler) List(w http.ResponseWriter, r *http.Request) {
	diagramID := chi.URLParam(r, "id")
	userID := UserIDFromContext(r.Context())

	wsID, projID, err := workspaceAndProjectForDiagram(h.db, diagramID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "diagram not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}
	if !h.rbac.CanView(userID, wsID, projID) {
		writeError(w, 403, "forbidden")
		return
	}

	var branches []models.Branch
	if err := h.db.Where("diagram_id = ?", diagramID).Order("created_at asc").Find(&branches).Error; err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, branches)
}

// Create creates a new branch forked from another branch's HEAD.
func (h *BranchHandler) Create(w http.ResponseWriter, r *http.Request) {
	diagramID := chi.URLParam(r, "id")
	userID := UserIDFromContext(r.Context())

	wsID, projID, err := workspaceAndProjectForDiagram(h.db, diagramID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "diagram not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}
	if !h.rbac.CanDevelop(userID, wsID, projID) {
		writeError(w, 403, "forbidden")
		return
	}

	var req struct {
		Name         string `json:"name"`
		FromBranchID string `json:"fromBranchId"` // branch to fork from
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}
	if req.Name == "" || req.FromBranchID == "" {
		writeError(w, 400, "name and fromBranchId are required")
		return
	}

	// Load the source branch to get the fork point.
	var sourceBranch models.Branch
	if err := h.db.Where("id = ? AND diagram_id = ?", req.FromBranchID, diagramID).First(&sourceBranch).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "source branch not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}

	branch := models.Branch{
		ID:           uuid.New().String(),
		DiagramID:    diagramID,
		Name:         req.Name,
		HeadCommitID: sourceBranch.HeadCommitID, // starts at same HEAD
		BaseBranchID: sourceBranch.ID,
		BaseCommitID: sourceBranch.HeadCommitID,
		CreatedByID:  userID,
	}
	if err := h.db.Create(&branch).Error; err != nil {
		writeError(w, 409, "branch name already exists for this diagram")
		return
	}
	writeJSON(w, 201, branch)
}

// Get returns a single branch with its HEAD commit content.
func (h *BranchHandler) Get(w http.ResponseWriter, r *http.Request) {
	branchID := chi.URLParam(r, "branchId")
	userID := UserIDFromContext(r.Context())

	var branch models.Branch
	if err := h.db.Preload("HeadCommit").First(&branch, "id = ?", branchID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "branch not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}

	wsID, projID, err := workspaceAndProjectForDiagram(h.db, branch.DiagramID)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	if !h.rbac.CanView(userID, wsID, projID) {
		writeError(w, 403, "forbidden")
		return
	}
	writeJSON(w, 200, branch)
}

// Delete deletes a branch. Cannot delete the default branch or branches with open PRs.
func (h *BranchHandler) Delete(w http.ResponseWriter, r *http.Request) {
	branchID := chi.URLParam(r, "branchId")
	userID := UserIDFromContext(r.Context())

	var branch models.Branch
	if err := h.db.First(&branch, "id = ?", branchID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "branch not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}

	wsID, projID, err := workspaceAndProjectForDiagram(h.db, branch.DiagramID)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	if !h.rbac.CanMaintain(userID, wsID, projID) {
		writeError(w, 403, "forbidden")
		return
	}

	// Prevent deleting the default branch.
	var diagram models.Diagram
	if err := h.db.Select("default_branch_id").First(&diagram, "id = ?", branch.DiagramID).Error; err == nil {
		if diagram.DefaultBranchID == branchID {
			writeError(w, 400, "cannot delete the default branch")
			return
		}
	}

	// Prevent deleting branches with open PRs.
	var openPRCount int64
	h.db.Model(&models.PullRequest{}).
		Where("(source_branch_id = ? OR target_branch_id = ?) AND status = ?", branchID, branchID, models.PRStatusOpen).
		Count(&openPRCount)
	if openPRCount > 0 {
		writeError(w, 400, "cannot delete a branch with open pull requests")
		return
	}

	if err := h.db.Delete(&branch).Error; err != nil {
		writeError(w, 500, err.Error())
		return
	}
	w.WriteHeader(204)
}
