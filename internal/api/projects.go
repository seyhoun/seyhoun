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

type ProjectHandler struct {
	db   *gorm.DB
	rbac *rbac.RBAC
}

func NewProjectHandler(db *gorm.DB) *ProjectHandler {
	return &ProjectHandler{db: db, rbac: rbac.New(db)}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// resolveWorkspaceID looks up the workspaceID for a project (needed for RBAC checks).
func (h *ProjectHandler) resolveWorkspaceID(projectID string) (string, error) {
	var p models.Project
	if err := h.db.Select("workspace_id").First(&p, "id = ?", projectID).Error; err != nil {
		return "", err
	}
	return p.WorkspaceID, nil
}

// ─── Project CRUD ─────────────────────────────────────────────────────────────

// Get returns a project by ID. The caller must have at least viewer access.
func (h *ProjectHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := UserIDFromContext(r.Context())

	var p models.Project
	if err := h.db.First(&p, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "project not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}
	if !h.rbac.CanView(userID, p.WorkspaceID, p.ID) {
		writeError(w, 403, "forbidden")
		return
	}
	writeJSON(w, 200, p)
}

// Update updates a project's name, description, and visibility. Maintainer+ only.
func (h *ProjectHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := UserIDFromContext(r.Context())

	wsID, err := h.resolveWorkspaceID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "project not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}
	if !h.rbac.CanMaintain(userID, wsID, id) {
		writeError(w, 403, "forbidden")
		return
	}

	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Visibility  string `json:"visibility"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}

	if err := h.db.Model(&models.Project{ID: id}).
		Select("Name", "Description", "Visibility").
		Updates(models.Project{Name: req.Name, Description: req.Description, Visibility: req.Visibility}).Error; err != nil {
		writeError(w, 500, err.Error())
		return
	}
	h.Get(w, r)
}

// Delete deletes a project. Owner only.
func (h *ProjectHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := UserIDFromContext(r.Context())

	wsID, err := h.resolveWorkspaceID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "project not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}
	if !h.rbac.CanOwn(userID, wsID, id) {
		writeError(w, 403, "forbidden")
		return
	}

	if err := h.db.Delete(&models.Project{}, "id = ?", id).Error; err != nil {
		writeError(w, 500, err.Error())
		return
	}
	w.WriteHeader(204)
}

// ListDiagrams lists diagram summaries for a project.
func (h *ProjectHandler) ListDiagrams(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "projectId")
	userID := UserIDFromContext(r.Context())

	wsID, err := h.resolveWorkspaceID(projectID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "project not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}
	if !h.rbac.CanView(userID, wsID, projectID) {
		writeError(w, 403, "forbidden")
		return
	}

	var diagrams []models.DiagramSummary
	if err := h.db.Model(&models.Diagram{}).
		Select("id, project_id, name, diagram_type, created_at, updated_at").
		Where("project_id = ?", projectID).
		Order("created_at desc").
		Find(&diagrams).Error; err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, diagrams)
}

// ─── Project Members ──────────────────────────────────────────────────────────

// ListMembers lists all project-level member overrides.
func (h *ProjectHandler) ListMembers(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "id")
	userID := UserIDFromContext(r.Context())

	wsID, err := h.resolveWorkspaceID(projectID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "project not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}
	if !h.rbac.CanView(userID, wsID, projectID) {
		writeError(w, 403, "forbidden")
		return
	}

	var members []models.ProjectMember
	if err := h.db.Where("project_id = ?", projectID).Preload("User").Find(&members).Error; err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, members)
}

// AddMember adds a project-level role for a user. Maintainer+ only.
func (h *ProjectHandler) AddMember(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "id")
	userID := UserIDFromContext(r.Context())

	wsID, err := h.resolveWorkspaceID(projectID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "project not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}
	if !h.rbac.CanMaintain(userID, wsID, projectID) {
		writeError(w, 403, "forbidden")
		return
	}

	var req struct {
		UserID string      `json:"userId"`
		Role   models.Role `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}
	if req.UserID == "" || req.Role == "" {
		writeError(w, 400, "userId and role are required")
		return
	}
	if req.Role == models.RoleOwner && !h.rbac.CanOwn(userID, wsID, projectID) {
		writeError(w, 403, "only owners can assign the owner role")
		return
	}

	member := models.ProjectMember{
		ID:        uuid.New().String(),
		ProjectID: projectID,
		UserID:    req.UserID,
		Role:      req.Role,
	}
	if err := h.db.Create(&member).Error; err != nil {
		writeError(w, 409, "user already has a project-level role")
		return
	}
	writeJSON(w, 201, member)
}

// UpdateMember changes a project-level member's role.
func (h *ProjectHandler) UpdateMember(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "id")
	memberID := chi.URLParam(r, "memberId")
	userID := UserIDFromContext(r.Context())

	wsID, err := h.resolveWorkspaceID(projectID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "project not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}
	if !h.rbac.CanMaintain(userID, wsID, projectID) {
		writeError(w, 403, "forbidden")
		return
	}

	var member models.ProjectMember
	if err := h.db.Where("id = ? AND project_id = ?", memberID, projectID).First(&member).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "member not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}
	if member.Role == models.RoleOwner && !h.rbac.CanOwn(userID, wsID, projectID) {
		writeError(w, 403, "only owners can change another owner's role")
		return
	}

	var req struct {
		Role models.Role `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}
	if req.Role == models.RoleOwner && !h.rbac.CanOwn(userID, wsID, projectID) {
		writeError(w, 403, "only owners can assign the owner role")
		return
	}

	if err := h.db.Model(&member).Update("role", req.Role).Error; err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, member)
}

// RemoveMember removes a project-level role.
func (h *ProjectHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "id")
	memberID := chi.URLParam(r, "memberId")
	userID := UserIDFromContext(r.Context())

	wsID, err := h.resolveWorkspaceID(projectID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "project not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}
	if !h.rbac.CanMaintain(userID, wsID, projectID) {
		writeError(w, 403, "forbidden")
		return
	}

	var member models.ProjectMember
	if err := h.db.Where("id = ? AND project_id = ?", memberID, projectID).First(&member).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "member not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}
	if member.Role == models.RoleOwner && !h.rbac.CanOwn(userID, wsID, projectID) {
		writeError(w, 403, "only owners can remove other owners")
		return
	}

	if err := h.db.Delete(&member).Error; err != nil {
		writeError(w, 500, err.Error())
		return
	}
	w.WriteHeader(204)
}
