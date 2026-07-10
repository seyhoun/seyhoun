package api

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v) //nolint:errcheck
}

func writeError(w http.ResponseWriter, code int, msg string) {
	writeJSON(w, code, map[string]string{"error": msg})
}

// serverError logs the real error internally and returns a generic 500 to the
// client. Never expose raw database or internal error messages to users.
func serverError(w http.ResponseWriter, err error) {
	slog.Error("internal server error", "error", err)
	writeJSON(w, 500, map[string]string{"error": "internal server error"})
}
