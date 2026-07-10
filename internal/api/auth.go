package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"seyhoun/internal/models"
	"seyhoun/internal/slug"
)

type AuthHandler struct {
	db        *gorm.DB
	jwtSecret []byte
}

func NewAuthHandler(db *gorm.DB, jwtSecret string) *AuthHandler {
	return &AuthHandler{db: db, jwtSecret: []byte(jwtSecret)}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Name     string `json:"name"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}
	if req.Email == "" || req.Name == "" || req.Password == "" {
		writeError(w, 400, "email, name, and password are required")
		return
	}
	if _, err := mail.ParseAddress(req.Email); err != nil {
		writeError(w, 400, "invalid email address")
		return
	}
	if len(req.Password) < 8 {
		writeError(w, 400, "password must be at least 8 characters")
		return
	}
	// bcrypt silently truncates inputs over 72 bytes; reject them to avoid silent data loss.
	if len(req.Password) > 72 {
		writeError(w, 400, "password must be at most 72 characters")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
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

	user := models.User{
		ID:       userID,
		Email:    req.Email,
		Name:     req.Name,
		PassHash: string(hash),
	}
	ws := models.Workspace{
		ID:         uuid.New().String(),
		Slug:       wsSlug,
		Name:       req.Name,
		OwnerID:    userID,
		IsPersonal: true,
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
		// Email is the only unique constraint on users; anything else is a server error.
		if strings.Contains(err.Error(), "users_email_key") || strings.Contains(err.Error(), "uni_users_email") {
			writeError(w, 409, "email already in use")
			return
		}
		serverError(w, err)
		return
	}

	token, err := h.issueToken(userID)
	if err != nil {
		serverError(w, err)
		return
	}

	writeJSON(w, 201, map[string]any{"token": token, "user": user, "workspace": ws})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}
	if req.Email == "" || req.Password == "" {
		writeError(w, 400, "email and password are required")
		return
	}

	var user models.User
	if err := h.db.First(&user, "email = ?", req.Email).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, 401, "invalid credentials")
			return
		}
		serverError(w, err)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PassHash), []byte(req.Password)); err != nil {
		writeError(w, 401, "invalid credentials")
		return
	}

	token, err := h.issueToken(user.ID)
	if err != nil {
		serverError(w, err)
		return
	}

	writeJSON(w, 200, map[string]any{"token": token, "user": user})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID := UserIDFromContext(r.Context())
	var user models.User
	if err := h.db.First(&user, "id = ?", userID).Error; err != nil {
		writeError(w, 404, "user not found")
		return
	}
	writeJSON(w, 200, user)
}

func (h *AuthHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID := UserIDFromContext(r.Context())
	var req struct {
		Name  string `json:"name"`
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}
	if req.Name == "" || req.Email == "" {
		writeError(w, 400, "name and email are required")
		return
	}
	if _, err := mail.ParseAddress(req.Email); err != nil {
		writeError(w, 400, "invalid email address")
		return
	}

	if err := h.db.Model(&models.User{}).Where("id = ?", userID).
		Select("Name", "Email").
		Updates(map[string]any{"name": req.Name, "email": req.Email}).Error; err != nil {
		if strings.Contains(err.Error(), "users_email_key") || strings.Contains(err.Error(), "uni_users_email") {
			writeError(w, 409, "email already in use")
			return
		}
		serverError(w, err)
		return
	}

	var user models.User
	if err := h.db.First(&user, "id = ?", userID).Error; err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, 200, user)
}

func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID := UserIDFromContext(r.Context())
	var req struct {
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}
	if req.CurrentPassword == "" || req.NewPassword == "" {
		writeError(w, 400, "currentPassword and newPassword are required")
		return
	}
	if len(req.NewPassword) < 8 {
		writeError(w, 400, "new password must be at least 8 characters")
		return
	}
	if len(req.NewPassword) > 72 {
		writeError(w, 400, "new password must be at most 72 characters")
		return
	}

	var user models.User
	if err := h.db.First(&user, "id = ?", userID).Error; err != nil {
		writeError(w, 404, "user not found")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PassHash), []byte(req.CurrentPassword)); err != nil {
		writeError(w, 401, "current password is incorrect")
		return
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		serverError(w, err)
		return
	}

	if err := h.db.Model(&models.User{}).Where("id = ?", userID).
		Update("pass_hash", string(newHash)).Error; err != nil {
		serverError(w, err)
		return
	}

	writeJSON(w, 200, map[string]any{"message": "password updated"})
}

// SearchUsers returns users matching the query (email or name prefix). Requires at least 3 characters.
func (h *AuthHandler) SearchUsers(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if len(q) < 3 {
		writeJSON(w, 200, []any{})
		return
	}
	pattern := "%" + q + "%"
	var users []struct {
		ID    string `json:"id"`
		Email string `json:"email"`
		Name  string `json:"name"`
	}
	if err := h.db.Model(&models.User{}).
		Select("id, email, name").
		Where("email ILIKE ? OR name ILIKE ?", pattern, pattern).
		Limit(10).
		Find(&users).Error; err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, 200, users)
}

func (h *AuthHandler) issueToken(userID string) (string, error) {
	claims := jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(30 * 24 * time.Hour).Unix(),
		"iat": time.Now().Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(h.jwtSecret)
}
