package api

import (
	"net/http"
	"seyhoun/internal/diagrams"
)

type DiagramTypeHandler struct{}

func NewDiagramTypeHandler() *DiagramTypeHandler {
	return &DiagramTypeHandler{}
}

// List returns the static registry of all supported diagram types.
func (h *DiagramTypeHandler) List(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, diagrams.Registry)
}
