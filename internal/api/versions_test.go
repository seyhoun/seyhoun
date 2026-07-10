package api_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"seyhoun/internal/api"
	"seyhoun/internal/models"
	"seyhoun/internal/testutil"
)

func versionedRouter(db *gorm.DB) http.Handler {
	r := chi.NewRouter()
	vh := api.NewVersionHandler(db)
	r.Get("/diagrams/{id}/versions", vh.List)
	r.Post("/diagrams/{id}/restore/{versionId}", vh.Restore)
	r.Get("/versions/{id}", vh.Get)
	return r
}

func TestVersions_List_Empty(t *testing.T) {
	db := testutil.TestDB(t)
	uid := testutil.SeedUser(t, db)
	wsID := testutil.SeedWorkspace(t, db, uid)
	projID := testutil.SeedProject(t, db, uid, wsID, "ver-proj-1")
	diagramID := "ver-diag-1"
	d := models.Diagram{ID: diagramID, ProjectID: projID, Name: "D"}
	require.NoError(t, db.Create(&d).Error)

	srv := versionedRouter(db)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/diagrams/"+diagramID+"/versions", nil)
	srv.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)

	var versions []models.DiagramVersionSummary
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&versions))
	assert.Len(t, versions, 0)
}

func TestVersions_ListAndGet(t *testing.T) {
	db := testutil.TestDB(t)
	uid := testutil.SeedUser(t, db)
	wsID := testutil.SeedWorkspace(t, db, uid)
	projID := testutil.SeedProject(t, db, uid, wsID, "ver-proj-2")
	diagramID := "ver-diag-2"
	d := models.Diagram{ID: diagramID, ProjectID: projID, Name: "D"}
	require.NoError(t, db.Create(&d).Error)

	v1 := models.DiagramVersion{
		ID:        uuid.New().String(),
		DiagramID: diagramID,
		Version:   1,
		NodesJSON: `[{"id":"n1"}]`,
		EdgesJSON: "[]",
		Viewport:  `{"x":0,"y":0,"zoom":1}`,
	}
	v2 := models.DiagramVersion{
		ID:        uuid.New().String(),
		DiagramID: diagramID,
		Version:   2,
		NodesJSON: `[{"id":"n2"}]`,
		EdgesJSON: "[]",
		Viewport:  `{"x":0,"y":0,"zoom":1}`,
	}
	require.NoError(t, db.Create(&v1).Error)
	require.NoError(t, db.Create(&v2).Error)

	srv := versionedRouter(db)

	// List — should return both, newest first.
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/diagrams/"+diagramID+"/versions", nil)
	srv.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)

	var summaries []models.DiagramVersionSummary
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&summaries))
	require.Len(t, summaries, 2)
	assert.Equal(t, 2, summaries[0].Version)
	assert.Equal(t, 1, summaries[1].Version)

	// Get the full snapshot for v1.
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/versions/"+v1.ID, nil)
	srv.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)

	var full models.DiagramVersion
	require.NoError(t, json.NewDecoder(rec.Body).Decode(&full))
	assert.Equal(t, `[{"id":"n1"}]`, full.NodesJSON)
}

func TestVersions_Restore(t *testing.T) {
	db := testutil.TestDB(t)
	uid := testutil.SeedUser(t, db)
	wsID := testutil.SeedWorkspace(t, db, uid)
	projID := testutil.SeedProject(t, db, uid, wsID, "ver-proj-3")
	diagramID := "ver-diag-3"
	d := models.Diagram{
		ID: diagramID, ProjectID: projID, Name: "D",
		NodesJSON: `[{"id":"n1"}]`, EdgesJSON: "[]", Viewport: `{"x":0,"y":0,"zoom":1}`,
	}
	require.NoError(t, db.Create(&d).Error)

	v1 := models.DiagramVersion{
		ID:        uuid.New().String(),
		DiagramID: diagramID,
		Version:   1,
		NodesJSON: `[{"id":"old-node"}]`,
		EdgesJSON: "[]",
		Viewport:  `{"x":0,"y":0,"zoom":1}`,
	}
	require.NoError(t, db.Create(&v1).Error)

	srv := versionedRouter(db)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/diagrams/"+diagramID+"/restore/"+v1.ID, nil)
	srv.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)

	// Verify the diagram's legacy field was updated in DB.
	var restored models.Diagram
	require.NoError(t, db.First(&restored, "id = ?", diagramID).Error)
	assert.Equal(t, `[{"id":"old-node"}]`, restored.NodesJSON)

	// A restore-point version should have been created.
	var count int64
	db.Model(&models.DiagramVersion{}).Where("diagram_id = ?", diagramID).Count(&count)
	assert.Equal(t, int64(2), count)
}

func TestVersions_Get_NotFound(t *testing.T) {
	db := testutil.TestDB(t)
	srv := versionedRouter(db)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/versions/does-not-exist", nil)
	srv.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusNotFound, rec.Code)
}
