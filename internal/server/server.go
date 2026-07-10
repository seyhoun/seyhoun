package server

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"gorm.io/gorm"
	"seyhoun/internal/api"
	"seyhoun/internal/config"
)

type Server struct {
	db     *gorm.DB
	cfg    *config.Config
	router chi.Router
}

func New(db *gorm.DB, cfg *config.Config) *Server {
	s := &Server{db: db, cfg: cfg}
	s.router = s.buildRouter()
	return s
}

// Handler returns the underlying http.Handler for use with http.Server.
func (s *Server) Handler() http.Handler {
	return s.router
}

func (s *Server) buildRouter() chi.Router {
	r := chi.NewRouter()

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: s.cfg.Server.CORSOrigins,
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type", "Authorization"},
	}))
	r.Use(middleware.Recoverer)
	r.Use(middleware.Logger)
	r.Use(middleware.Timeout(30 * time.Second))
	r.Use(middleware.RequestSize(1 << 20)) // 1 MB default; import handler enforces its own 10 MB

	wh := api.NewWorkspaceHandler(s.db)
	ph := api.NewProjectHandler(s.db)
	dh := api.NewDiagramHandler(s.db)
	bh := api.NewBranchHandler(s.db)
	ch := api.NewCommitHandler(s.db)
	prh := api.NewPullRequestHandler(s.db)
	vh := api.NewVersionHandler(s.db)
	ah := api.NewAuthHandler(s.db, s.cfg.Auth.JWTSecret)
	ih := api.NewImportHandler()
	dth := api.NewDiagramTypeHandler()
	adh := api.NewAdminHandler(s.db)

	r.Route("/api", func(r chi.Router) {
		// ── Health check (unauthenticated) ───────────────────────────────────
		r.Get("/health", s.healthHandler)

		// ── Public auth ──────────────────────────────────────────────────────
		r.Post("/auth/register", ah.Register)
		r.Post("/auth/login", ah.Login)

		// ── Authenticated routes ─────────────────────────────────────────────
		r.Group(func(r chi.Router) {
			r.Use(api.RequireAuth(s.cfg.Auth.JWTSecret))

			// Auth
			r.Get("/auth/me", ah.Me)
			r.Put("/auth/me", ah.UpdateProfile)
			r.Put("/auth/password", ah.ChangePassword)

			// ── Workspaces ───────────────────────────────────────────────────
			r.Get("/workspaces", wh.List)
			r.Post("/workspaces", wh.Create)
			r.Get("/workspaces/{wsId}", wh.Get)
			r.Put("/workspaces/{wsId}", wh.Update)
			r.Delete("/workspaces/{wsId}", wh.Delete)

			r.Get("/workspaces/{wsId}/members", wh.ListMembers)
			r.Post("/workspaces/{wsId}/members", wh.AddMember)
			r.Put("/workspaces/{wsId}/members/{memberId}", wh.UpdateMember)
			r.Delete("/workspaces/{wsId}/members/{memberId}", wh.RemoveMember)

			r.Get("/workspaces/{wsId}/projects", wh.ListProjects)
			r.Post("/workspaces/{wsId}/projects", wh.CreateProject)

			// ── Projects ─────────────────────────────────────────────────────
			r.Get("/projects/{id}", ph.Get)
			r.Put("/projects/{id}", ph.Update)
			r.Delete("/projects/{id}", ph.Delete)
			r.Get("/projects/{projectId}/diagrams", ph.ListDiagrams)

			r.Get("/projects/{id}/members", ph.ListMembers)
			r.Post("/projects/{id}/members", ph.AddMember)
			r.Put("/projects/{id}/members/{memberId}", ph.UpdateMember)
			r.Delete("/projects/{id}/members/{memberId}", ph.RemoveMember)

			// ── Diagrams ──────────────────────────────────────────────────────
			r.Post("/diagrams", dh.Create)
			r.Get("/diagrams/{id}", dh.Get)
			r.Put("/diagrams/{id}", dh.Update)
			r.Delete("/diagrams/{id}", dh.Delete)
			r.Get("/diagrams/{id}/export", dh.Export)

			r.Get("/diagrams/{id}/branches", bh.List)
			r.Post("/diagrams/{id}/branches", bh.Create)
			r.Get("/diagrams/{id}/commits", ch.ListForDiagram)
			r.Post("/diagrams/{id}/revert/{commitId}", ch.Revert)
			r.Get("/diagrams/{id}/diff", dh.Diff)
			r.Get("/diagrams/{id}/pulls", prh.List)
			r.Post("/diagrams/{id}/pulls", prh.Create)

			// Legacy version endpoints (kept for backward compat)
			r.Get("/diagrams/{id}/versions", vh.List)
			r.Post("/diagrams/{id}/restore/{versionId}", vh.Restore)

			// ── Branches ─────────────────────────────────────────────────────
			r.Get("/branches/{branchId}", bh.Get)
			r.Delete("/branches/{branchId}", bh.Delete)
			r.Get("/branches/{branchId}/commits", ch.List)
			r.Post("/branches/{branchId}/commits", ch.Create)

			// ── Commits ──────────────────────────────────────────────────────
			r.Get("/commits/{commitId}", ch.Get)

			// ── Pull Requests ─────────────────────────────────────────────────
			r.Get("/pulls/{prId}", prh.Get)
			r.Put("/pulls/{prId}", prh.Update)
			r.Post("/pulls/{prId}/merge", prh.Merge)
			r.Post("/pulls/{prId}/close", prh.Close)
			r.Get("/pulls/{prId}/diff", prh.Diff)
			r.Get("/pulls/{prId}/comments", prh.ListComments)
			r.Post("/pulls/{prId}/comments", prh.AddComment)

			// Legacy single version
			r.Get("/versions/{id}", vh.Get)

			// ── Users ─────────────────────────────────────────────────────────
			r.Get("/users/search", ah.SearchUsers)

			// ── Diagram Types ─────────────────────────────────────────────────
			r.Get("/diagram-types", dth.List)

			// ── Import / Templates ────────────────────────────────────────────
			r.Post("/import/json", ih.ImportJSON)
			r.Post("/import/compose", ih.ImportCompose)
			r.Post("/import/terraform", ih.ImportTerraform)
			r.Get("/templates", ih.ListTemplates)
			r.Get("/templates/{id}", ih.GetTemplate)

			// ── Admin (requires is_admin = true) ──────────────────────────────
			r.Group(func(r chi.Router) {
				r.Use(api.RequireAdmin(s.db))

				r.Get("/admin/users", adh.ListUsers)
				r.Post("/admin/users", adh.CreateUser)
				r.Put("/admin/users/{id}", adh.UpdateUser)
				r.Delete("/admin/users/{id}", adh.DeleteUser)

				r.Get("/admin/workspaces", adh.ListWorkspaces)
				r.Post("/admin/workspaces", adh.CreateWorkspace)
				r.Delete("/admin/workspaces/{id}", adh.DeleteWorkspace)

				r.Get("/admin/projects", adh.ListProjects)
				r.Post("/admin/projects", adh.CreateProject)
				r.Delete("/admin/projects/{id}", adh.DeleteProject)

				r.Get("/admin/diagrams", adh.ListDiagrams)
				r.Post("/admin/diagrams", adh.CreateDiagram)
				r.Delete("/admin/diagrams/{id}", adh.DeleteDiagram)
			})
		})
	})

	const distDir = "web/dist"
	if _, err := os.Stat(distDir); err == nil {
		r.Handle("/*", spaHandler(distDir))
	}

	return r
}

// healthHandler checks whether the database is reachable and returns 200 or 503.
func (s *Server) healthHandler(w http.ResponseWriter, r *http.Request) {
	sqlDB, err := s.db.DB()
	if err != nil || sqlDB.Ping() != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "unhealthy"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// writeJSON is a local helper for the server package (handlers use api.writeJSON internally).
func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v) //nolint:errcheck
}

// spaHandler serves static files from distDir and falls back to index.html for
// unknown paths so that client-side routing works correctly.
func spaHandler(distDir string) http.Handler {
	absDistDir, _ := filepath.Abs(distDir)
	fs := http.FileServer(http.Dir(distDir))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cleaned := filepath.Clean(r.URL.Path)
		path := filepath.Join(absDistDir, cleaned)

		// Guard against path traversal outside distDir.
		if !strings.HasPrefix(path, absDistDir+string(filepath.Separator)) && path != absDistDir {
			http.NotFound(w, r)
			return
		}

		if _, err := os.Stat(path); os.IsNotExist(err) {
			http.ServeFile(w, r, filepath.Join(distDir, "index.html"))
			return
		}
		fs.ServeHTTP(w, r)
	})
}
