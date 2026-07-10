package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"seyhoun/internal/diff"
	"seyhoun/internal/hash"
	"seyhoun/internal/models"
	"seyhoun/internal/rbac"
)

type DiagramHandler struct {
	db   *gorm.DB
	rbac *rbac.RBAC
}

func NewDiagramHandler(db *gorm.DB) *DiagramHandler {
	return &DiagramHandler{db: db, rbac: rbac.New(db)}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// headCommit loads the HEAD commit of a diagram's default branch.
// Returns nil, nil if the diagram has no default branch / no commits yet.
func (h *DiagramHandler) headCommit(diagramID string) (*models.Commit, error) {
	var d models.Diagram
	if err := h.db.Select("default_branch_id").First(&d, "id = ?", diagramID).Error; err != nil {
		return nil, err
	}
	if d.DefaultBranchID == "" {
		return nil, nil
	}
	var branch models.Branch
	if err := h.db.Select("head_commit_id").First(&branch, "id = ?", d.DefaultBranchID).Error; err != nil {
		return nil, err
	}
	if branch.HeadCommitID == "" {
		return nil, nil
	}
	var commit models.Commit
	if err := h.db.First(&commit, "id = ?", branch.HeadCommitID).Error; err != nil {
		return nil, err
	}
	return &commit, nil
}

// ─── Diagram response ─────────────────────────────────────────────────────────

// DiagramResponse is the API response for a diagram — metadata plus current content.
type DiagramResponse struct {
	models.Diagram
	// Current content from HEAD commit of the default branch.
	NodesJSON  string `json:"nodesJson"`
	EdgesJSON  string `json:"edgesJson"`
	PumlSource string `json:"pumlSource"`
	Viewport   string `json:"viewport"`
}

// ─── Create ───────────────────────────────────────────────────────────────────

func (h *DiagramHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := UserIDFromContext(r.Context())

	var req struct {
		ProjectID   string           `json:"projectId"`
		Name        string           `json:"name"`
		DiagramType models.DiagramType `json:"diagramType"`
		NodesJSON   string           `json:"nodesJson"`
		EdgesJSON   string           `json:"edgesJson"`
		PumlSource  string           `json:"pumlSource"`
		Viewport    string           `json:"viewport"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}
	if req.ProjectID == "" || req.Name == "" {
		writeError(w, 400, "projectId and name are required")
		return
	}
	if req.DiagramType == "" {
		req.DiagramType = models.DiagramTypeArchitecture
	}
	if !validDiagramType(req.DiagramType) {
		writeError(w, 400, "invalid diagramType")
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

	// Check project access.
	var project models.Project
	if err := h.db.Select("id, workspace_id").First(&project, "id = ?", req.ProjectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "project not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}
	if !h.rbac.CanDevelop(userID, project.WorkspaceID, project.ID) {
		writeError(w, 403, "forbidden")
		return
	}

	diagramID := uuid.New().String()
	branchID := uuid.New().String()
	commitID := uuid.New().String()

	diagram := models.Diagram{
		ID:              diagramID,
		ProjectID:       req.ProjectID,
		Name:            req.Name,
		DiagramType:     req.DiagramType,
		DefaultBranchID: branchID,
	}
	branch := models.Branch{
		ID:          branchID,
		DiagramID:   diagramID,
		Name:        "main",
		HeadCommitID: commitID,
		CreatedByID: userID,
	}
	commit := models.Commit{
		ID:          commitID,
		DiagramID:   diagramID,
		BranchID:    branchID,
		AuthorID:    userID,
		Message:     "Initial commit",
		NodesJSON:   req.NodesJSON,
		EdgesJSON:   req.EdgesJSON,
		Viewport:    req.Viewport,
		PumlSource:  req.PumlSource,
		ContentHash: hash.Content(req.NodesJSON, req.EdgesJSON),
	}

	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&diagram).Error; err != nil {
			return err
		}
		if err := tx.Create(&branch).Error; err != nil {
			return err
		}
		return tx.Create(&commit).Error
	})
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}

	writeJSON(w, 201, DiagramResponse{
		Diagram:    diagram,
		NodesJSON:  req.NodesJSON,
		EdgesJSON:  req.EdgesJSON,
		PumlSource: req.PumlSource,
		Viewport:   req.Viewport,
	})
}

// ─── Get ──────────────────────────────────────────────────────────────────────

func (h *DiagramHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := UserIDFromContext(r.Context())

	var d models.Diagram
	if err := h.db.First(&d, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "diagram not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}

	var project models.Project
	if err := h.db.Select("workspace_id").First(&project, "id = ?", d.ProjectID).Error; err != nil {
		writeError(w, 500, err.Error())
		return
	}
	if !h.rbac.CanView(userID, project.WorkspaceID, d.ProjectID) {
		writeError(w, 403, "forbidden")
		return
	}

	resp := DiagramResponse{Diagram: d}
	commit, err := h.headCommit(id)
	if err == nil && commit != nil {
		resp.NodesJSON = commit.NodesJSON
		resp.EdgesJSON = commit.EdgesJSON
		resp.PumlSource = commit.PumlSource
		resp.Viewport = commit.Viewport
	}
	writeJSON(w, 200, resp)
}

// ─── Update (metadata only) ───────────────────────────────────────────────────

// Update updates diagram metadata (name, diagramType). Content changes are made
// via commits on branches, not here.
func (h *DiagramHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := UserIDFromContext(r.Context())

	var d models.Diagram
	if err := h.db.Select("project_id").First(&d, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "diagram not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}

	var project models.Project
	if err := h.db.Select("workspace_id").First(&project, "id = ?", d.ProjectID).Error; err != nil {
		writeError(w, 500, err.Error())
		return
	}
	if !h.rbac.CanMaintain(userID, project.WorkspaceID, d.ProjectID) {
		writeError(w, 403, "forbidden")
		return
	}

	var req struct {
		Name        string             `json:"name"`
		DiagramType models.DiagramType `json:"diagramType"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}
	if req.DiagramType != "" && !validDiagramType(req.DiagramType) {
		writeError(w, 400, "invalid diagramType")
		return
	}

	updates := models.Diagram{Name: req.Name, DiagramType: req.DiagramType}
	if err := h.db.Model(&models.Diagram{ID: id}).
		Select("Name", "DiagramType").
		Updates(updates).Error; err != nil {
		writeError(w, 500, err.Error())
		return
	}
	h.Get(w, r)
}

// ─── Delete ───────────────────────────────────────────────────────────────────

func (h *DiagramHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := UserIDFromContext(r.Context())

	var d models.Diagram
	if err := h.db.Select("project_id").First(&d, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "diagram not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}

	var project models.Project
	if err := h.db.Select("workspace_id").First(&project, "id = ?", d.ProjectID).Error; err != nil {
		writeError(w, 500, err.Error())
		return
	}
	if !h.rbac.CanMaintain(userID, project.WorkspaceID, d.ProjectID) {
		writeError(w, 403, "forbidden")
		return
	}

	if err := h.db.Delete(&models.Diagram{}, "id = ?", id).Error; err != nil {
		writeError(w, 500, err.Error())
		return
	}
	w.WriteHeader(204)
}

// ─── Export ───────────────────────────────────────────────────────────────────

func (h *DiagramHandler) Export(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := UserIDFromContext(r.Context())

	var d models.Diagram
	if err := h.db.First(&d, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "diagram not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}

	var project models.Project
	if err := h.db.First(&project, "id = ?", d.ProjectID).Error; err != nil {
		writeError(w, 500, err.Error())
		return
	}
	if !h.rbac.CanView(userID, project.WorkspaceID, d.ProjectID) {
		writeError(w, 403, "forbidden")
		return
	}

	resp := DiagramResponse{Diagram: d}
	commit, err := h.headCommit(id)
	if err == nil && commit != nil {
		resp.NodesJSON = commit.NodesJSON
		resp.EdgesJSON = commit.EdgesJSON
		resp.PumlSource = commit.PumlSource
		resp.Viewport = commit.Viewport
	}

	bundle := map[string]any{
		"format":     "seyhoun-v2",
		"exportedAt": time.Now().UTC().Format(time.RFC3339),
		"project":    project,
		"diagram":    resp,
	}

	filename := fmt.Sprintf("%s.seyhoun.json", d.Name)
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(200)
	json.NewEncoder(w).Encode(bundle)
}

// ─── Diff ─────────────────────────────────────────────────────────────────────

// Diff computes the structural diff between two commits.
// Query params: from={commitId}&to={commitId}
func (h *DiagramHandler) Diff(w http.ResponseWriter, r *http.Request) {
	diagramID := chi.URLParam(r, "id")
	userID := UserIDFromContext(r.Context())
	fromID := r.URL.Query().Get("from")
	toID := r.URL.Query().Get("to")

	if fromID == "" || toID == "" {
		writeError(w, 400, "from and to query parameters are required")
		return
	}

	var d models.Diagram
	if err := h.db.Select("project_id").First(&d, "id = ?", diagramID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "diagram not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}
	var project models.Project
	if err := h.db.Select("workspace_id").First(&project, "id = ?", d.ProjectID).Error; err != nil {
		writeError(w, 500, err.Error())
		return
	}
	if !h.rbac.CanView(userID, project.WorkspaceID, d.ProjectID) {
		writeError(w, 403, "forbidden")
		return
	}

	var fromCommit, toCommit models.Commit
	if err := h.db.First(&fromCommit, "id = ? AND diagram_id = ?", fromID, diagramID).Error; err != nil {
		writeError(w, 404, "from commit not found")
		return
	}
	if err := h.db.First(&toCommit, "id = ? AND diagram_id = ?", toID, diagramID).Error; err != nil {
		writeError(w, 404, "to commit not found")
		return
	}

	result, err := diff.Diff(fromCommit.NodesJSON, fromCommit.EdgesJSON, toCommit.NodesJSON, toCommit.EdgesJSON)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, result)
}

// ─── Validation ───────────────────────────────────────────────────────────────

func validDiagramType(dt models.DiagramType) bool {
	switch dt {
	case models.DiagramTypeArchitecture, models.DiagramTypeSequence, models.DiagramTypeClass,
		models.DiagramTypeER, models.DiagramTypeFlowchart, models.DiagramTypeNetwork,
		models.DiagramTypePlatform, models.DiagramTypeStateMachine, models.DiagramTypeActivity,
		models.DiagramTypeComponent, models.DiagramTypeDeployment, models.DiagramTypeUseCase:
		return true
	}
	return false
}
