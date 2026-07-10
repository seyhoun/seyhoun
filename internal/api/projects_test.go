package api_test

import (
	"bytes"
	"encoding/json"
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

// workspaceProjectRouter builds a router that covers both workspace-scoped
// project creation/listing and direct project access, with the given userID
// injected into every request context.
func workspaceProjectRouter(db *gorm.DB, userID string) http.Handler {
	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			next.ServeHTTP(w, r.WithContext(
				api.ContextWithUserID(r.Context(), userID),
			))
		})
	})

	wh := api.NewWorkspaceHandler(db)
	ph := api.NewProjectHandler(db)

	r.Get("/workspaces/{wsId}/projects", wh.ListProjects)
	r.Post("/workspaces/{wsId}/projects", wh.CreateProject)
	r.Get("/projects/{id}", ph.Get)
	r.Put("/projects/{id}", ph.Update)
	r.Delete("/projects/{id}", ph.Delete)
	r.Get("/projects/{projectId}/diagrams", ph.ListDiagrams)
	return r
}

func TestProjects_CRUD(t *testing.T) {
	db := testutil.TestDB(t)
	userID := testutil.SeedUser(t, db)
	wsID := testutil.SeedWorkspace(t, db, userID)
	srv := workspaceProjectRouter(db, userID)

	// Create via workspace-scoped endpoint
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/workspaces/"+wsID+"/projects",
		bytes.NewBufferString(`{"name":"Test Project","description":"a description"}`))
	req.Header.Set("Content-Type", "application/json")
	srv.ServeHTTP(rec, req)
	require.Equal(t, http.StatusCreated, rec.Code)

	var created models.Project
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&created))
	assert.Equal(t, "Test Project", created.Name)
	assert.Equal(t, "a description", created.Description)
	assert.NotEmpty(t, created.ID)
	assert.Equal(t, wsID, created.WorkspaceID)

	// Get
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/projects/"+created.ID, nil)
	srv.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)

	var got models.Project
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&got))
	assert.Equal(t, created.ID, got.ID)
	assert.Equal(t, created.Name, got.Name)

	// List — should contain at least the one we just created
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/workspaces/"+wsID+"/projects", nil)
	srv.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)

	var list []models.Project
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&list))
	assert.GreaterOrEqual(t, len(list), 1)

	// Update — clear description (tests zero-value update)
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPut, "/projects/"+created.ID,
		bytes.NewBufferString(`{"name":"Updated Name","description":""}`))
	req.Header.Set("Content-Type", "application/json")
	srv.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)

	var updated models.Project
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&updated))
	assert.Equal(t, "Updated Name", updated.Name)
	assert.Equal(t, "", updated.Description)

	// Delete
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodDelete, "/projects/"+created.ID, nil)
	srv.ServeHTTP(rec, req)
	require.Equal(t, http.StatusNoContent, rec.Code)

	// Get after delete → 404
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/projects/"+created.ID, nil)
	srv.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusNotFound, rec.Code)
}

func TestProjects_Create_ValidationErrors(t *testing.T) {
	db := testutil.TestDB(t)
	userID := testutil.SeedUser(t, db)
	wsID := testutil.SeedWorkspace(t, db, userID)
	srv := workspaceProjectRouter(db, userID)

	tests := []struct {
		name string
		body string
		code int
	}{
		{"missing name field", `{"description":"d"}`, http.StatusBadRequest},
		{"empty name string", `{"name":""}`, http.StatusBadRequest},
		{"invalid JSON", `{bad json}`, http.StatusBadRequest},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodPost, "/workspaces/"+wsID+"/projects", bytes.NewBufferString(tc.body))
			req.Header.Set("Content-Type", "application/json")
			srv.ServeHTTP(rec, req)
			assert.Equal(t, tc.code, rec.Code)

			var body map[string]string
			require.NoError(t, json.NewDecoder(rec.Body).Decode(&body))
			assert.NotEmpty(t, body["error"])
		})
	}
}

func TestProjects_Get_NotFound(t *testing.T) {
	db := testutil.TestDB(t)
	userID := testutil.SeedUser(t, db)
	srv := workspaceProjectRouter(db, userID)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/projects/does-not-exist", nil)
	srv.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusNotFound, rec.Code)
}

func TestProjects_ListDiagrams(t *testing.T) {
	db := testutil.TestDB(t)
	userID := testutil.SeedUser(t, db)
	wsID := testutil.SeedWorkspace(t, db, userID)
	testutil.SeedProject(t, db, userID, wsID, "list-diag-proj")
	srv := workspaceProjectRouter(db, userID)

	d1 := models.Diagram{ID: "list-diag-1", ProjectID: "list-diag-proj", Name: "First"}
	d2 := models.Diagram{ID: "list-diag-2", ProjectID: "list-diag-proj", Name: "Second"}
	require.NoError(t, db.Create(&d1).Error)
	require.NoError(t, db.Create(&d2).Error)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/projects/list-diag-proj/diagrams", nil)
	srv.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)

	var diagrams []models.DiagramSummary
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&diagrams))
	assert.Len(t, diagrams, 2)
}

func TestProjects_ListDiagrams_EmptyForUnknownProject(t *testing.T) {
	db := testutil.TestDB(t)
	userID := testutil.SeedUser(t, db)
	srv := workspaceProjectRouter(db, userID)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/projects/unknown-project/diagrams", nil)
	srv.ServeHTTP(rec, req)
	// Returns 404 now since the project is not found during RBAC lookup
	assert.Equal(t, http.StatusNotFound, rec.Code)
}
