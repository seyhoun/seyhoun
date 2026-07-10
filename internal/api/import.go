package api

import (
	"io"
	"net/http"

	"github.com/go-chi/chi/v5"
	"seyhoun/internal/importer"
)

// ImportHandler handles file import and template endpoints.
type ImportHandler struct{}

func NewImportHandler() *ImportHandler { return &ImportHandler{} }

// ImportJSON handles POST /api/import/json
// Accepts a multipart form with a "file" field containing a Seyhoun JSON export.
func (h *ImportHandler) ImportJSON(w http.ResponseWriter, r *http.Request) {
	data, err := readUpload(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	result, err := importer.FromJSON(data)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, result)
}

// ImportCompose handles POST /api/import/compose
// Accepts a multipart form with a "file" field containing a docker-compose.yml.
func (h *ImportHandler) ImportCompose(w http.ResponseWriter, r *http.Request) {
	data, err := readUpload(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	result, err := importer.FromCompose(data)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, result)
}

// ImportTerraform handles POST /api/import/terraform
// Accepts a multipart form with a "file" field containing a .tf file.
func (h *ImportHandler) ImportTerraform(w http.ResponseWriter, r *http.Request) {
	data, err := readUpload(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	result, err := importer.FromTerraform(data)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, result)
}

// ListTemplates handles GET /api/templates
func (h *ImportHandler) ListTemplates(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, importer.AllTemplates())
}

// GetTemplate handles GET /api/templates/{id}
func (h *ImportHandler) GetTemplate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	result, err := importer.GetTemplate(id)
	if err != nil {
		writeError(w, http.StatusNotFound, "template not found")
		return
	}
	writeJSON(w, http.StatusOK, result)
}

// readUpload reads the "file" field from a multipart form, falling back to the
// raw request body for clients that POST application/octet-stream directly.
func readUpload(r *http.Request) ([]byte, error) {
	const maxSize = 10 << 20 // 10 MB

	ct := r.Header.Get("Content-Type")
	if len(ct) >= 9 && ct[:9] == "multipart" {
		if err := r.ParseMultipartForm(maxSize); err != nil {
			return nil, err
		}
		f, _, err := r.FormFile("file")
		if err != nil {
			return nil, err
		}
		defer f.Close()
		return io.ReadAll(io.LimitReader(f, maxSize))
	}
	// Fallback: raw body (used by JSON imports sent as application/json)
	return io.ReadAll(io.LimitReader(r.Body, maxSize))
}
