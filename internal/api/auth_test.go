package api_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"seyhoun/internal/api"
	"seyhoun/internal/models"
	"seyhoun/internal/testutil"
)

const testJWTSecret = "test-secret-key-for-tests"

func authRouter(db *gorm.DB) http.Handler {
	r := chi.NewRouter()
	ah := api.NewAuthHandler(db, testJWTSecret)
	r.Post("/auth/register", ah.Register)
	r.Post("/auth/login", ah.Login)
	r.With(api.RequireAuth(testJWTSecret)).Get("/auth/me", ah.Me)
	return r
}

func TestAuth_Register(t *testing.T) {
	db := testutil.TestDB(t)
	srv := authRouter(db)

	body := `{"email":"alice@example.com","name":"Alice","password":"secret123"}`
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/auth/register", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	srv.ServeHTTP(rec, req)
	require.Equal(t, http.StatusCreated, rec.Code)

	var resp map[string]any
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&resp))
	assert.NotEmpty(t, resp["token"])
	user := resp["user"].(map[string]any)
	assert.Equal(t, "alice@example.com", user["email"])
	assert.Equal(t, "Alice", user["name"])
	assert.Empty(t, user["passHash"]) // never serialised
}

func TestAuth_Register_DuplicateEmail(t *testing.T) {
	db := testutil.TestDB(t)
	srv := authRouter(db)

	body := `{"email":"dup@example.com","name":"Dup","password":"secret123"}`
	for i := 0; i < 2; i++ {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/auth/register", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		srv.ServeHTTP(rec, req)
		if i == 0 {
			require.Equal(t, http.StatusCreated, rec.Code)
		} else {
			assert.Equal(t, http.StatusConflict, rec.Code)
		}
	}
}

func TestAuth_Register_ValidationErrors(t *testing.T) {
	db := testutil.TestDB(t)
	srv := authRouter(db)

	tests := []struct {
		name string
		body string
		code int
	}{
		{"missing email", `{"name":"X","password":"secret123"}`, http.StatusBadRequest},
		{"missing password", `{"email":"x@x.com","name":"X"}`, http.StatusBadRequest},
		{"short password", `{"email":"x@x.com","name":"X","password":"short"}`, http.StatusBadRequest},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodPost, "/auth/register", bytes.NewBufferString(tc.body))
			req.Header.Set("Content-Type", "application/json")
			srv.ServeHTTP(rec, req)
			assert.Equal(t, tc.code, rec.Code)
		})
	}
}

func TestAuth_Login(t *testing.T) {
	db := testutil.TestDB(t)
	srv := authRouter(db)

	// Register first
	reg := `{"email":"bob@example.com","name":"Bob","password":"mypassword"}`
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/auth/register", bytes.NewBufferString(reg))
	req.Header.Set("Content-Type", "application/json")
	srv.ServeHTTP(rec, req)
	require.Equal(t, http.StatusCreated, rec.Code)

	// Login
	login := `{"email":"bob@example.com","password":"mypassword"}`
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewBufferString(login))
	req.Header.Set("Content-Type", "application/json")
	srv.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)

	var resp map[string]any
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&resp))
	assert.NotEmpty(t, resp["token"])
}

func TestAuth_Login_WrongPassword(t *testing.T) {
	db := testutil.TestDB(t)
	srv := authRouter(db)

	reg := `{"email":"carol@example.com","name":"Carol","password":"correctpass"}`
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/auth/register", bytes.NewBufferString(reg))
	req.Header.Set("Content-Type", "application/json")
	srv.ServeHTTP(rec, req)
	require.Equal(t, http.StatusCreated, rec.Code)

	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/auth/login",
		bytes.NewBufferString(`{"email":"carol@example.com","password":"wrongpass"}`))
	req.Header.Set("Content-Type", "application/json")
	srv.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestAuth_Login_UnknownEmail(t *testing.T) {
	db := testutil.TestDB(t)
	srv := authRouter(db)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/auth/login",
		bytes.NewBufferString(`{"email":"ghost@example.com","password":"whatever"}`))
	req.Header.Set("Content-Type", "application/json")
	srv.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestAuth_Me(t *testing.T) {
	db := testutil.TestDB(t)
	srv := authRouter(db)

	// Register and capture token
	reg := `{"email":"dave@example.com","name":"Dave","password":"password123"}`
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/auth/register", bytes.NewBufferString(reg))
	req.Header.Set("Content-Type", "application/json")
	srv.ServeHTTP(rec, req)
	require.Equal(t, http.StatusCreated, rec.Code)

	var regResp map[string]any
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&regResp))
	token := regResp["token"].(string)

	// Call /auth/me with the token
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/auth/me", nil)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
	srv.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)

	var user models.User
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&user))
	assert.Equal(t, "dave@example.com", user.Email)
}

func TestAuth_Me_NoToken(t *testing.T) {
	db := testutil.TestDB(t)
	srv := authRouter(db)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
	srv.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestAuth_Me_InvalidToken(t *testing.T) {
	db := testutil.TestDB(t)
	srv := authRouter(db)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
	req.Header.Set("Authorization", "Bearer not-a-real-jwt")
	srv.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}
