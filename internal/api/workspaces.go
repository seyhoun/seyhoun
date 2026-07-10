package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"seyhoun/internal/models"
	"seyhoun/internal/rbac"
)

type WorkspaceHandler struct {
	db   *gorm.DB
	rbac *rbac.RBAC
}

func NewWorkspaceHandler(db *gorm.DB) *WorkspaceHandler {
	return &WorkspaceHandler{db: db, rbac: rbac.New(db)}
}

// ─── Workspace CRUD ───────────────────────────────────────────────────────────

// List returns all workspaces the authenticated user belongs to.
func (h *WorkspaceHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := UserIDFromContext(r.Context())
	var workspaces []models.Workspace
	if err := h.db.
		Joins("JOIN workspace_members ON workspace_members.workspace_id = workspaces.id").
		Where("workspace_members.user_id = ?", userID).
		Order("workspaces.created_at asc").
		Find(&workspaces).Error; err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, workspaces)
}

// Create creates a new (non-personal) workspace owned by the current user.
func (h *WorkspaceHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := UserIDFromContext(r.Context())
	var req struct {
		Name      string `json:"name"`
		Slug      string `json:"slug"`
		AvatarURL string `json:"avatarUrl"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}
	if req.Name == "" || req.Slug == "" {
		writeError(w, 400, "name and slug are required")
		return
	}
	req.Slug = strings.ToLower(strings.TrimSpace(req.Slug))

	ws := models.Workspace{
		ID:         uuid.New().String(),
		Slug:       req.Slug,
		Name:       req.Name,
		OwnerID:    userID,
		IsPersonal: false,
		AvatarURL:  req.AvatarURL,
	}
	member := models.WorkspaceMember{
		ID:          uuid.New().String(),
		WorkspaceID: ws.ID,
		UserID:      userID,
		Role:        models.RoleOwner,
	}

	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&ws).Error; err != nil {
			return err
		}
		return tx.Create(&member).Error
	})
	if err != nil {
		writeError(w, 409, "slug already in use")
		return
	}
	writeJSON(w, 201, ws)
}

// Get returns a single workspace by ID. The user must be a member.
func (h *WorkspaceHandler) Get(w http.ResponseWriter, r *http.Request) {
	wsID := chi.URLParam(r, "wsId")
	userID := UserIDFromContext(r.Context())

	var ws models.Workspace
	if err := h.db.First(&ws, "id = ?", wsID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "workspace not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}
	if !h.rbac.CanView(userID, wsID, "") {
		writeError(w, 403, "forbidden")
		return
	}
	writeJSON(w, 200, ws)
}

// Update updates a workspace's name and avatarUrl. Owner only.
func (h *WorkspaceHandler) Update(w http.ResponseWriter, r *http.Request) {
	wsID := chi.URLParam(r, "wsId")
	userID := UserIDFromContext(r.Context())

	if !h.rbac.CanOwn(userID, wsID, "") {
		writeError(w, 403, "forbidden")
		return
	}

	var ws models.Workspace
	if err := h.db.First(&ws, "id = ?", wsID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "workspace not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}
	if ws.IsPersonal {
		writeError(w, 400, "personal workspaces cannot be renamed")
		return
	}

	var req struct {
		Name      string `json:"name"`
		AvatarURL string `json:"avatarUrl"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}

	if err := h.db.Model(&models.Workspace{ID: wsID}).
		Select("Name", "AvatarURL").
		Updates(models.Workspace{Name: req.Name, AvatarURL: req.AvatarURL}).Error; err != nil {
		writeError(w, 500, err.Error())
		return
	}
	h.Get(w, r)
}

// Delete deletes a workspace. Owner only; personal workspaces cannot be deleted.
func (h *WorkspaceHandler) Delete(w http.ResponseWriter, r *http.Request) {
	wsID := chi.URLParam(r, "wsId")
	userID := UserIDFromContext(r.Context())

	if !h.rbac.CanOwn(userID, wsID, "") {
		writeError(w, 403, "forbidden")
		return
	}

	var ws models.Workspace
	if err := h.db.First(&ws, "id = ?", wsID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "workspace not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}
	if ws.IsPersonal {
		writeError(w, 400, "personal workspace cannot be deleted")
		return
	}

	if err := h.db.Delete(&models.Workspace{}, "id = ?", wsID).Error; err != nil {
		writeError(w, 500, err.Error())
		return
	}
	w.WriteHeader(204)
}

// ─── Workspace Members ────────────────────────────────────────────────────────

// ListMembers lists all members of a workspace.
func (h *WorkspaceHandler) ListMembers(w http.ResponseWriter, r *http.Request) {
	wsID := chi.URLParam(r, "wsId")
	userID := UserIDFromContext(r.Context())

	if !h.rbac.CanView(userID, wsID, "") {
		writeError(w, 403, "forbidden")
		return
	}

	var members []models.WorkspaceMember
	if err := h.db.Where("workspace_id = ?", wsID).Preload("User").Find(&members).Error; err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, members)
}

// AddMember adds a user to the workspace. Owner/maintainer only.
func (h *WorkspaceHandler) AddMember(w http.ResponseWriter, r *http.Request) {
	wsID := chi.URLParam(r, "wsId")
	userID := UserIDFromContext(r.Context())

	if !h.rbac.CanMaintain(userID, wsID, "") {
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
	// Maintainers cannot assign owner role.
	if req.Role == models.RoleOwner && !h.rbac.CanOwn(userID, wsID, "") {
		writeError(w, 403, "only owners can assign the owner role")
		return
	}

	member := models.WorkspaceMember{
		ID:          uuid.New().String(),
		WorkspaceID: wsID,
		UserID:      req.UserID,
		Role:        req.Role,
	}
	if err := h.db.Create(&member).Error; err != nil {
		writeError(w, 409, "user is already a member")
		return
	}
	writeJSON(w, 201, member)
}

// UpdateMember changes a member's role. Owner/maintainer only; cannot demote owners.
func (h *WorkspaceHandler) UpdateMember(w http.ResponseWriter, r *http.Request) {
	wsID := chi.URLParam(r, "wsId")
	memberID := chi.URLParam(r, "memberId")
	userID := UserIDFromContext(r.Context())

	if !h.rbac.CanMaintain(userID, wsID, "") {
		writeError(w, 403, "forbidden")
		return
	}

	var member models.WorkspaceMember
	if err := h.db.Where("id = ? AND workspace_id = ?", memberID, wsID).First(&member).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "member not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}

	// Cannot change an owner's role unless you are also an owner.
	if member.Role == models.RoleOwner && !h.rbac.CanOwn(userID, wsID, "") {
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
	if req.Role == models.RoleOwner && !h.rbac.CanOwn(userID, wsID, "") {
		writeError(w, 403, "only owners can assign the owner role")
		return
	}

	if err := h.db.Model(&member).Update("role", req.Role).Error; err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, member)
}

// RemoveMember removes a user from the workspace. Owner/maintainer only.
func (h *WorkspaceHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	wsID := chi.URLParam(r, "wsId")
	memberID := chi.URLParam(r, "memberId")
	userID := UserIDFromContext(r.Context())

	if !h.rbac.CanMaintain(userID, wsID, "") {
		writeError(w, 403, "forbidden")
		return
	}

	var member models.WorkspaceMember
	if err := h.db.Where("id = ? AND workspace_id = ?", memberID, wsID).First(&member).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "member not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}

	if member.Role == models.RoleOwner && !h.rbac.CanOwn(userID, wsID, "") {
		writeError(w, 403, "only owners can remove other owners")
		return
	}

	if err := h.db.Delete(&member).Error; err != nil {
		writeError(w, 500, err.Error())
		return
	}
	w.WriteHeader(204)
}

// ─── Workspace Projects ───────────────────────────────────────────────────────

// ListProjects lists all projects in the workspace visible to the user.
func (h *WorkspaceHandler) ListProjects(w http.ResponseWriter, r *http.Request) {
	wsID := chi.URLParam(r, "wsId")
	userID := UserIDFromContext(r.Context())

	if !h.rbac.CanView(userID, wsID, "") {
		writeError(w, 403, "forbidden")
		return
	}

	var projects []models.Project
	if err := h.db.Where("workspace_id = ?", wsID).
		Order("created_at desc").
		Find(&projects).Error; err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, projects)
}

// CreateProject creates a new project in the workspace.
func (h *WorkspaceHandler) CreateProject(w http.ResponseWriter, r *http.Request) {
	wsID := chi.URLParam(r, "wsId")
	userID := UserIDFromContext(r.Context())

	if !h.rbac.CanDevelop(userID, wsID, "") {
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
	if req.Name == "" {
		writeError(w, 400, "name is required")
		return
	}
	if req.Visibility == "" {
		req.Visibility = "private"
	}

	projectID := uuid.New().String()
	project := models.Project{
		ID:          projectID,
		WorkspaceID: wsID,
		OwnerID:     userID,
		Name:        req.Name,
		Description: req.Description,
		Visibility:  req.Visibility,
	}
	member := models.ProjectMember{
		ID:        uuid.New().String(),
		ProjectID: projectID,
		UserID:    userID,
		Role:      models.RoleOwner,
	}

	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&project).Error; err != nil {
			return err
		}
		return tx.Create(&member).Error
	})
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 201, project)
}
