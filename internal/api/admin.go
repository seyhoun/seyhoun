package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"seyhoun/internal/hash"
	"seyhoun/internal/models"
	"seyhoun/internal/slug"
)

// AdminHandler handles all /api/admin/* routes.
// Every handler in this file assumes the RequireAdmin middleware has already
// verified the caller is an authenticated admin user.
type AdminHandler struct {
	db *gorm.DB
}

func NewAdminHandler(db *gorm.DB) *AdminHandler {
	return &AdminHandler{db: db}
}

// ─── Users ────────────────────────────────────────────────────────────────────

// ListUsers returns all users.
func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	var users []models.User
	if err := h.db.Order("created_at desc").Find(&users).Error; err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, 200, users)
}

// CreateUser creates a new user. Optionally sets is_admin.
func (h *AdminHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Name     string `json:"name"`
		Password string `json:"password"`
		IsAdmin  bool   `json:"isAdmin"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}
	if req.Email == "" || req.Name == "" || req.Password == "" {
		writeError(w, 400, "email, name, and password are required")
		return
	}
	if len(req.Password) < 8 {
		writeError(w, 400, "password must be at least 8 characters")
		return
	}
	if len(req.Password) > 72 {
		writeError(w, 400, "password must be at most 72 characters")
		return
	}

	passHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		serverError(w, err)
		return
	}

	userID := uuid.New().String()
	wsSlug, err := slug.Unique(h.db, &models.Workspace{}, "slug", req.Email)
	if err != nil {
		serverError(w, err)
		return
	}
	ws := models.Workspace{
		ID:         uuid.New().String(),
		Slug:       wsSlug,
		Name:       req.Name,
		OwnerID:    userID,
		IsPersonal: true,
	}
	user := models.User{
		ID:       userID,
		Email:    req.Email,
		Name:     req.Name,
		PassHash: string(passHash),
		IsAdmin:  req.IsAdmin,
	}
	wsMember := models.WorkspaceMember{
		ID:          uuid.New().String(),
		WorkspaceID: ws.ID,
		UserID:      userID,
		Role:        models.RoleOwner,
	}

	if err = h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&user).Error; err != nil {
			return err
		}
		if err := tx.Create(&ws).Error; err != nil {
			return err
		}
		return tx.Create(&wsMember).Error
	}); err != nil {
		if strings.Contains(err.Error(), "users_email_key") || strings.Contains(err.Error(), "uni_users_email") {
			writeError(w, 409, "email already in use")
			return
		}
		serverError(w, err)
		return
	}
	writeJSON(w, 201, user)
}

// UpdateUser updates a user's name, email, and/or admin status.
func (h *AdminHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req struct {
		Name    string `json:"name"`
		Email   string `json:"email"`
		IsAdmin *bool  `json:"isAdmin"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}

	var user models.User
	if err := h.db.First(&user, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "user not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}

	fields := map[string]any{}
	if req.Name != "" {
		fields["name"] = req.Name
	}
	if req.Email != "" {
		fields["email"] = req.Email
	}
	if req.IsAdmin != nil {
		fields["is_admin"] = *req.IsAdmin
	}
	if len(fields) == 0 {
		writeError(w, 400, "at least one field (name, email, isAdmin) is required")
		return
	}

	if err := h.db.Model(&user).Updates(fields).Error; err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, 200, user)
}

// DeleteUser permanently deletes a user and all their owned data via CASCADE.
func (h *AdminHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// Prevent self-deletion.
	callerID := UserIDFromContext(r.Context())
	if id == callerID {
		writeError(w, 400, "admins cannot delete their own account via this endpoint")
		return
	}

	result := h.db.Delete(&models.User{}, "id = ?", id)
	if result.Error != nil {
		serverError(w, result.Error)
		return
	}
	if result.RowsAffected == 0 {
		writeError(w, 404, "user not found")
		return
	}
	w.WriteHeader(204)
}

// ─── Workspaces ───────────────────────────────────────────────────────────────

// ListWorkspaces returns all workspaces.
func (h *AdminHandler) ListWorkspaces(w http.ResponseWriter, r *http.Request) {
	var workspaces []models.Workspace
	if err := h.db.Order("created_at desc").Find(&workspaces).Error; err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, 200, workspaces)
}

// CreateWorkspace creates a workspace with the given owner.
func (h *AdminHandler) CreateWorkspace(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name      string `json:"name"`
		Slug      string `json:"slug"`
		OwnerID   string `json:"ownerId"`
		AvatarURL string `json:"avatarUrl"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}
	if req.Name == "" || req.Slug == "" || req.OwnerID == "" {
		writeError(w, 400, "name, slug, and ownerId are required")
		return
	}

	ws := models.Workspace{
		ID:        uuid.New().String(),
		Slug:      strings.ToLower(strings.TrimSpace(req.Slug)),
		Name:      req.Name,
		OwnerID:   req.OwnerID,
		AvatarURL: req.AvatarURL,
	}
	member := models.WorkspaceMember{
		ID:          uuid.New().String(),
		WorkspaceID: ws.ID,
		UserID:      req.OwnerID,
		Role:        models.RoleOwner,
	}

	if err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&ws).Error; err != nil {
			return err
		}
		return tx.Create(&member).Error
	}); err != nil {
		if strings.Contains(err.Error(), "workspaces_slug_key") || strings.Contains(err.Error(), "uni_workspaces_slug") {
			writeError(w, 409, "slug already in use")
			return
		}
		serverError(w, err)
		return
	}
	writeJSON(w, 201, ws)
}

// DeleteWorkspace permanently deletes a workspace and all contained projects/diagrams.
func (h *AdminHandler) DeleteWorkspace(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	result := h.db.Delete(&models.Workspace{}, "id = ?", id)
	if result.Error != nil {
		serverError(w, result.Error)
		return
	}
	if result.RowsAffected == 0 {
		writeError(w, 404, "workspace not found")
		return
	}
	w.WriteHeader(204)
}

// ─── Projects ─────────────────────────────────────────────────────────────────

// ListProjects returns all projects, optionally filtered by workspace.
func (h *AdminHandler) ListProjects(w http.ResponseWriter, r *http.Request) {
	q := h.db.Order("created_at desc")
	if wsID := r.URL.Query().Get("workspaceId"); wsID != "" {
		q = q.Where("workspace_id = ?", wsID)
	}
	var projects []models.Project
	if err := q.Find(&projects).Error; err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, 200, projects)
}

// CreateProject creates a project inside a workspace.
func (h *AdminHandler) CreateProject(w http.ResponseWriter, r *http.Request) {
	var req struct {
		WorkspaceID string `json:"workspaceId"`
		OwnerID     string `json:"ownerId"`
		Name        string `json:"name"`
		Description string `json:"description"`
		Visibility  string `json:"visibility"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}
	if req.WorkspaceID == "" || req.OwnerID == "" || req.Name == "" {
		writeError(w, 400, "workspaceId, ownerId, and name are required")
		return
	}
	if req.Visibility == "" {
		req.Visibility = "private"
	}

	projectID := uuid.New().String()
	p := models.Project{
		ID:          projectID,
		WorkspaceID: req.WorkspaceID,
		OwnerID:     req.OwnerID,
		Name:        req.Name,
		Description: req.Description,
		Visibility:  req.Visibility,
	}
	member := models.ProjectMember{
		ID:        uuid.New().String(),
		ProjectID: projectID,
		UserID:    req.OwnerID,
		Role:      models.RoleOwner,
	}

	if err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&p).Error; err != nil {
			return err
		}
		return tx.Create(&member).Error
	}); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, 201, p)
}

// DeleteProject permanently deletes a project and all its diagrams.
func (h *AdminHandler) DeleteProject(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	result := h.db.Delete(&models.Project{}, "id = ?", id)
	if result.Error != nil {
		serverError(w, result.Error)
		return
	}
	if result.RowsAffected == 0 {
		writeError(w, 404, "project not found")
		return
	}
	w.WriteHeader(204)
}

// ─── Diagrams ─────────────────────────────────────────────────────────────────

// ListDiagrams returns all diagrams, optionally filtered by project.
func (h *AdminHandler) ListDiagrams(w http.ResponseWriter, r *http.Request) {
	q := h.db.Model(&models.Diagram{}).
		Select("id, project_id, name, diagram_type, created_at, updated_at").
		Order("created_at desc")
	if projID := r.URL.Query().Get("projectId"); projID != "" {
		q = q.Where("project_id = ?", projID)
	}
	var diagrams []models.DiagramSummary
	if err := q.Find(&diagrams).Error; err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, 200, diagrams)
}

// CreateDiagram creates a diagram inside a project (with initial main branch + commit).
func (h *AdminHandler) CreateDiagram(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ProjectID   string             `json:"projectId"`
		Name        string             `json:"name"`
		DiagramType models.DiagramType `json:"diagramType"`
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

	// Resolve the project owner to use as the commit author.
	var project models.Project
	if err := h.db.Select("id, owner_id").First(&project, "id = ?", req.ProjectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "project not found")
			return
		}
		serverError(w, err)
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
		ID:           branchID,
		DiagramID:    diagramID,
		Name:         "main",
		HeadCommitID: commitID,
		CreatedByID:  project.OwnerID,
	}
	commit := models.Commit{
		ID:          commitID,
		DiagramID:   diagramID,
		BranchID:    branchID,
		AuthorID:    project.OwnerID,
		Message:     "Initial commit",
		NodesJSON:   "[]",
		EdgesJSON:   "[]",
		Viewport:    `{"x":0,"y":0,"zoom":1}`,
		ContentHash: hash.Content("[]", "[]"),
	}

	if err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&diagram).Error; err != nil {
			return err
		}
		if err := tx.Create(&branch).Error; err != nil {
			return err
		}
		return tx.Create(&commit).Error
	}); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, 201, diagram)
}

// DeleteDiagram permanently deletes a diagram and all its branches/commits.
func (h *AdminHandler) DeleteDiagram(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	result := h.db.Delete(&models.Diagram{}, "id = ?", id)
	if result.Error != nil {
		serverError(w, result.Error)
		return
	}
	if result.RowsAffected == 0 {
		writeError(w, 404, "diagram not found")
		return
	}
	w.WriteHeader(204)
}

