package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"seyhoun/internal/diff"
	"seyhoun/internal/merge"
	"seyhoun/internal/models"
	"seyhoun/internal/rbac"
)

type PullRequestHandler struct {
	db   *gorm.DB
	rbac *rbac.RBAC
}

func NewPullRequestHandler(db *gorm.DB) *PullRequestHandler {
	return &PullRequestHandler{db: db, rbac: rbac.New(db)}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// nextPRNumber returns COALESCE(MAX(number), 0) + 1 for a diagram.
func nextPRNumber(db *gorm.DB, diagramID string) (int, error) {
	var max int
	err := db.Model(&models.PullRequest{}).
		Where("diagram_id = ?", diagramID).
		Select("COALESCE(MAX(number), 0)").
		Scan(&max).Error
	return max + 1, err
}

// ─── List ─────────────────────────────────────────────────────────────────────

func (h *PullRequestHandler) List(w http.ResponseWriter, r *http.Request) {
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

	statusFilter := r.URL.Query().Get("status")
	q := h.db.Where("diagram_id = ?", diagramID).Order("number desc")
	if statusFilter != "" {
		q = q.Where("status = ?", statusFilter)
	}

	var prs []models.PullRequest
	if err := q.Find(&prs).Error; err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, prs)
}

// ─── Create ───────────────────────────────────────────────────────────────────

func (h *PullRequestHandler) Create(w http.ResponseWriter, r *http.Request) {
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
		Title          string `json:"title"`
		Description    string `json:"description"`
		SourceBranchID string `json:"sourceBranchId"`
		TargetBranchID string `json:"targetBranchId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}
	if req.Title == "" || req.SourceBranchID == "" || req.TargetBranchID == "" {
		writeError(w, 400, "title, sourceBranchId, and targetBranchId are required")
		return
	}
	if req.SourceBranchID == req.TargetBranchID {
		writeError(w, 400, "source and target branches must be different")
		return
	}

	// Verify both branches belong to this diagram.
	var count int64
	h.db.Model(&models.Branch{}).
		Where("id IN ? AND diagram_id = ?", []string{req.SourceBranchID, req.TargetBranchID}, diagramID).
		Count(&count)
	if count != 2 {
		writeError(w, 400, "one or both branches not found for this diagram")
		return
	}

	var pr models.PullRequest
	err = h.db.Transaction(func(tx *gorm.DB) error {
		number, err := nextPRNumber(tx, diagramID)
		if err != nil {
			return err
		}
		pr = models.PullRequest{
			ID:             uuid.New().String(),
			DiagramID:      diagramID,
			Number:         number,
			Title:          req.Title,
			Description:    req.Description,
			SourceBranchID: req.SourceBranchID,
			TargetBranchID: req.TargetBranchID,
			AuthorID:       userID,
			Status:         models.PRStatusOpen,
		}
		return tx.Create(&pr).Error
	})
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 201, pr)
}

// ─── Get ──────────────────────────────────────────────────────────────────────

func (h *PullRequestHandler) Get(w http.ResponseWriter, r *http.Request) {
	prID := chi.URLParam(r, "prId")
	userID := UserIDFromContext(r.Context())

	var pr models.PullRequest
	if err := h.db.Preload("SourceBranch").Preload("TargetBranch").
		First(&pr, "id = ?", prID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "pull request not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}

	wsID, projID, err := workspaceAndProjectForDiagram(h.db, pr.DiagramID)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	if !h.rbac.CanView(userID, wsID, projID) {
		writeError(w, 403, "forbidden")
		return
	}
	writeJSON(w, 200, pr)
}

// ─── Update ───────────────────────────────────────────────────────────────────

func (h *PullRequestHandler) Update(w http.ResponseWriter, r *http.Request) {
	prID := chi.URLParam(r, "prId")
	userID := UserIDFromContext(r.Context())

	var pr models.PullRequest
	if err := h.db.First(&pr, "id = ?", prID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "pull request not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}
	if pr.Status != models.PRStatusOpen {
		writeError(w, 400, "cannot update a closed or merged pull request")
		return
	}

	wsID, projID, err := workspaceAndProjectForDiagram(h.db, pr.DiagramID)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	// Only the author or a maintainer+ can update a PR.
	if pr.AuthorID != userID && !h.rbac.CanMaintain(userID, wsID, projID) {
		writeError(w, 403, "forbidden")
		return
	}

	var req struct {
		Title       string `json:"title"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}

	if err := h.db.Model(&pr).Select("Title", "Description").
		Updates(models.PullRequest{Title: req.Title, Description: req.Description}).Error; err != nil {
		writeError(w, 500, err.Error())
		return
	}
	h.Get(w, r)
}

// ─── Merge ────────────────────────────────────────────────────────────────────

func (h *PullRequestHandler) Merge(w http.ResponseWriter, r *http.Request) {
	prID := chi.URLParam(r, "prId")
	userID := UserIDFromContext(r.Context())

	var pr models.PullRequest
	if err := h.db.First(&pr, "id = ?", prID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "pull request not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}
	if pr.Status != models.PRStatusOpen {
		writeError(w, 400, "pull request is not open")
		return
	}

	wsID, projID, err := workspaceAndProjectForDiagram(h.db, pr.DiagramID)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	if !h.rbac.CanMaintain(userID, wsID, projID) {
		writeError(w, 403, "only maintainers and owners can merge pull requests")
		return
	}

	var req struct {
		Message string `json:"message"`
	}
	// Ignore parse error — message is optional.
	json.NewDecoder(r.Body).Decode(&req)

	var result *merge.Result
	err = h.db.Transaction(func(tx *gorm.DB) error {
		var sourceBranch, targetBranch models.Branch
		if err := tx.First(&sourceBranch, "id = ?", pr.SourceBranchID).Error; err != nil {
			return err
		}
		if err := tx.First(&targetBranch, "id = ?", pr.TargetBranchID).Error; err != nil {
			return err
		}

		var mergeErr error
		result, mergeErr = merge.Merge(tx, &sourceBranch, &targetBranch, userID, req.Message)
		if mergeErr != nil {
			return mergeErr
		}

		// If there are conflicts, roll back the transaction (nothing was persisted).
		if len(result.Conflicts) > 0 {
			return errConflict
		}

		// Mark PR as merged.
		now := time.Now()
		return tx.Model(&pr).Updates(map[string]any{
			"status":      models.PRStatusMerged,
			"merged_by_id": userID,
			"merged_at":   now,
		}).Error
	})

	if err == errConflict {
		writeJSON(w, 409, map[string]any{
			"error":     "merge conflict",
			"conflicts": result.Conflicts,
		})
		return
	}
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, result)
}

// sentinel error used to trigger transaction rollback on conflict.
var errConflict = errors.New("merge conflict")

// ─── Close ────────────────────────────────────────────────────────────────────

func (h *PullRequestHandler) Close(w http.ResponseWriter, r *http.Request) {
	prID := chi.URLParam(r, "prId")
	userID := UserIDFromContext(r.Context())

	var pr models.PullRequest
	if err := h.db.First(&pr, "id = ?", prID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "pull request not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}
	if pr.Status != models.PRStatusOpen {
		writeError(w, 400, "pull request is already closed or merged")
		return
	}

	wsID, projID, err := workspaceAndProjectForDiagram(h.db, pr.DiagramID)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	if pr.AuthorID != userID && !h.rbac.CanMaintain(userID, wsID, projID) {
		writeError(w, 403, "forbidden")
		return
	}

	if err := h.db.Model(&pr).Update("status", models.PRStatusClosed).Error; err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, pr)
}

// ─── Diff ─────────────────────────────────────────────────────────────────────

// Diff returns the structural diff between the source and target branch HEADs.
func (h *PullRequestHandler) Diff(w http.ResponseWriter, r *http.Request) {
	prID := chi.URLParam(r, "prId")
	userID := UserIDFromContext(r.Context())

	var pr models.PullRequest
	if err := h.db.Preload("SourceBranch").Preload("TargetBranch").
		First(&pr, "id = ?", prID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "pull request not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}

	wsID, projID, err := workspaceAndProjectForDiagram(h.db, pr.DiagramID)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	if !h.rbac.CanView(userID, wsID, projID) {
		writeError(w, 403, "forbidden")
		return
	}

	var srcCommit, tgtCommit models.Commit
	if pr.SourceBranch.HeadCommitID != "" {
		if err := h.db.First(&srcCommit, "id = ?", pr.SourceBranch.HeadCommitID).Error; err != nil {
			writeError(w, 500, err.Error())
			return
		}
	}
	if pr.TargetBranch.HeadCommitID != "" {
		if err := h.db.First(&tgtCommit, "id = ?", pr.TargetBranch.HeadCommitID).Error; err != nil {
			writeError(w, 500, err.Error())
			return
		}
	}

	// Diff: target → source (what would be added to target if this PR is merged).
	result, err := diff.Diff(tgtCommit.NodesJSON, tgtCommit.EdgesJSON, srcCommit.NodesJSON, srcCommit.EdgesJSON)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, result)
}

// ─── Comments ─────────────────────────────────────────────────────────────────

func (h *PullRequestHandler) ListComments(w http.ResponseWriter, r *http.Request) {
	prID := chi.URLParam(r, "prId")
	userID := UserIDFromContext(r.Context())

	var pr models.PullRequest
	if err := h.db.Select("diagram_id").First(&pr, "id = ?", prID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "pull request not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}

	wsID, projID, err := workspaceAndProjectForDiagram(h.db, pr.DiagramID)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	if !h.rbac.CanView(userID, wsID, projID) {
		writeError(w, 403, "forbidden")
		return
	}

	var comments []models.PRComment
	if err := h.db.Where("pull_request_id = ?", prID).Order("created_at asc").Find(&comments).Error; err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, comments)
}

func (h *PullRequestHandler) AddComment(w http.ResponseWriter, r *http.Request) {
	prID := chi.URLParam(r, "prId")
	userID := UserIDFromContext(r.Context())

	var pr models.PullRequest
	if err := h.db.Select("diagram_id").First(&pr, "id = ?", prID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 404, "pull request not found")
			return
		}
		writeError(w, 500, err.Error())
		return
	}

	wsID, projID, err := workspaceAndProjectForDiagram(h.db, pr.DiagramID)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	if !h.rbac.CanComment(userID, wsID, projID) {
		writeError(w, 403, "forbidden")
		return
	}

	var req struct {
		Body   string `json:"body"`
		NodeID string `json:"nodeId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}
	if req.Body == "" {
		writeError(w, 400, "body is required")
		return
	}

	comment := models.PRComment{
		ID:            uuid.New().String(),
		PullRequestID: prID,
		AuthorID:      userID,
		Body:          req.Body,
		NodeID:        req.NodeID,
	}
	if err := h.db.Create(&comment).Error; err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 201, comment)
}
