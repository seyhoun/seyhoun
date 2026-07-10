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
	"seyhoun/internal/testutil"
)

// diagramsRouterWithUser builds a test router that injects userID into context.
func diagramsRouterWithUser(db *gorm.DB, userID string) http.Handler {
	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			next.ServeHTTP(w, r.WithContext(
				api.ContextWithUserID(r.Context(), userID),
			))
		})
	})
	dh := api.NewDiagramHandler(db)
	r.Post("/diagrams", dh.Create)
	r.Get("/diagrams/{id}", dh.Get)
	r.Put("/diagrams/{id}", dh.Update)
	r.Delete("/diagrams/{id}", dh.Delete)
	r.Get("/diagrams/{id}/export", dh.Export)
	return r
}

// seedProjectForDiagram creates a user, workspace, and project, then returns
// the userID and projectID needed for diagram tests.
func seedProjectForDiagram(t *testing.T, db *gorm.DB, projectID string) (userID string) {
	t.Helper()
	uid := testutil.SeedUser(t, db)
	wsID := testutil.SeedWorkspace(t, db, uid)
	testutil.SeedProject(t, db, uid, wsID, projectID)
	return uid
}

// DiagramResponse matches the response shape returned by DiagramHandler.
type DiagramResponse struct {
	ID          string `json:"id"`
	ProjectID   string `json:"projectId"`
	Name        string `json:"name"`
	DiagramType string `json:"diagramType"`
	NodesJSON   string `json:"nodesJson"`
	EdgesJSON   string `json:"edgesJson"`
	PumlSource  string `json:"pumlSource"`
	Viewport    string `json:"viewport"`
}

func TestDiagrams_CRUD(t *testing.T) {
	db := testutil.TestDB(t)
	userID := seedProjectForDiagram(t, db, "diag-crud-proj")
	srv := diagramsRouterWithUser(db, userID)

	// Create with minimal fields — defaults should fill in nodesJson / edgesJson / viewport
	body, _ := json.Marshal(map[string]string{
		"projectId": "diag-crud-proj",
		"name":      "My Diagram",
	})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/diagrams", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	srv.ServeHTTP(rec, req)
	require.Equal(t, http.StatusCreated, rec.Code)

	var created DiagramResponse
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&created))
	assert.Equal(t, "My Diagram", created.Name)
	assert.Equal(t, "diag-crud-proj", created.ProjectID)
	assert.Equal(t, "[]", created.NodesJSON)
	assert.Equal(t, "[]", created.EdgesJSON)
	assert.NotEmpty(t, created.ID)

	// Get
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/diagrams/"+created.ID, nil)
	srv.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)

	var got DiagramResponse
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&got))
	assert.Equal(t, created.ID, got.ID)

	// Update — metadata only (name and diagramType)
	updateBody := `{"name":"Renamed","diagramType":"sequence"}`
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPut, "/diagrams/"+created.ID, bytes.NewBufferString(updateBody))
	req.Header.Set("Content-Type", "application/json")
	srv.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)

	var updated DiagramResponse
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&updated))
	assert.Equal(t, "Renamed", updated.Name)
	assert.Equal(t, "sequence", updated.DiagramType)

	// Delete
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodDelete, "/diagrams/"+created.ID, nil)
	srv.ServeHTTP(rec, req)
	require.Equal(t, http.StatusNoContent, rec.Code)

	// Get after delete → 404
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/diagrams/"+created.ID, nil)
	srv.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusNotFound, rec.Code)
}

func TestDiagrams_Create_DefaultsPopulated(t *testing.T) {
	db := testutil.TestDB(t)
	userID := seedProjectForDiagram(t, db, "diag-defaults-proj")
	srv := diagramsRouterWithUser(db, userID)

	body, _ := json.Marshal(map[string]string{
		"projectId": "diag-defaults-proj",
		"name":      "Defaults Test",
		// nodesJson, edgesJson, viewport intentionally omitted
	})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/diagrams", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	srv.ServeHTTP(rec, req)
	require.Equal(t, http.StatusCreated, rec.Code)

	var d DiagramResponse
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&d))
	assert.Equal(t, "[]", d.NodesJSON)
	assert.Equal(t, "[]", d.EdgesJSON)
	assert.Equal(t, `{"x":0,"y":0,"zoom":1}`, d.Viewport)
	assert.Equal(t, "architecture", d.DiagramType)
}

func TestDiagrams_Create_ValidationErrors(t *testing.T) {
	db := testutil.TestDB(t)
	userID := seedProjectForDiagram(t, db, "diag-val-proj")
	srv := diagramsRouterWithUser(db, userID)

	tests := []struct {
		name string
		body string
		code int
	}{
		{"missing projectId", `{"name":"X"}`, http.StatusBadRequest},
		{"missing name", fmt.Sprintf(`{"projectId":"%s"}`, "diag-val-proj"), http.StatusBadRequest},
		{"both missing", `{}`, http.StatusBadRequest},
		{"invalid JSON", `{bad}`, http.StatusBadRequest},
		{"invalid diagramType", `{"projectId":"diag-val-proj","name":"X","diagramType":"invalid"}`, http.StatusBadRequest},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodPost, "/diagrams", bytes.NewBufferString(tc.body))
			req.Header.Set("Content-Type", "application/json")
			srv.ServeHTTP(rec, req)
			assert.Equal(t, tc.code, rec.Code)
		})
	}
}

func TestDiagrams_Get_NotFound(t *testing.T) {
	db := testutil.TestDB(t)
	userID := testutil.SeedUser(t, db)
	srv := diagramsRouterWithUser(db, userID)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/diagrams/does-not-exist", nil)
	srv.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusNotFound, rec.Code)
}

func TestDiagrams_Export(t *testing.T) {
	db := testutil.TestDB(t)
	userID := seedProjectForDiagram(t, db, "export-proj")

	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			next.ServeHTTP(w, r.WithContext(
				api.ContextWithUserID(r.Context(), userID),
			))
		})
	})
	dh := api.NewDiagramHandler(db)
	r.Post("/diagrams", dh.Create)
	r.Get("/diagrams/{id}/export", dh.Export)
	srv := http.Handler(r)

	// Create diagram
	body, _ := json.Marshal(map[string]string{"projectId": "export-proj", "name": "Export Me"})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/diagrams", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	srv.ServeHTTP(rec, req)
	require.Equal(t, http.StatusCreated, rec.Code)

	var created DiagramResponse
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&created))

	// Export
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/diagrams/"+created.ID+"/export", nil)
	srv.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)

	assert.Contains(t, rec.Header().Get("Content-Disposition"), "attachment")
	assert.Contains(t, rec.Header().Get("Content-Disposition"), "Export Me")

	var bundle map[string]any
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&bundle))
	assert.Equal(t, "seyhoun-v2", bundle["format"])
	assert.NotEmpty(t, bundle["exportedAt"])
	assert.NotNil(t, bundle["diagram"])
	assert.NotNil(t, bundle["project"])
}
