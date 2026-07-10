// cmd/cli is the Seyhoun admin command-line tool.
//
// It connects directly to the database (no HTTP server required) and lets
// administrators manage users, workspaces, projects, and diagrams.
//
// Usage:
//
//	seyhoun-cli <resource> <action> [flags]
//
// Resources and actions:
//
//	user   list
//	user   create  --email <e> --name <n> --password <p> [--admin]
//	user   update  --id <id>  [--name <n>] [--email <e>] [--admin] [--no-admin]
//	user   delete  --id <id>
//	user   make-admin --id <id>
//
//	workspace  list
//	workspace  create  --name <n> --slug <s> --owner-id <id>
//	workspace  delete  --id <id>
//
//	project  list   [--workspace-id <id>]
//	project  create --workspace-id <id> --owner-id <id> --name <n>
//	project  delete --id <id>
//
//	diagram  list   [--project-id <id>]
//	diagram  create --project-id <id> --name <n> [--type <t>]
//	diagram  delete --id <id>
package main

import (
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"text/tabwriter"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"seyhoun/internal/config"
	"seyhoun/internal/db"
	"seyhoun/internal/hash"
	"seyhoun/internal/models"
	"seyhoun/internal/slug"
)

func main() {
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelWarn})))

	if len(os.Args) < 3 {
		printUsage()
		os.Exit(1)
	}

	resource := os.Args[1]
	action := os.Args[2]
	args := os.Args[3:]

	cfg, err := config.Load()
	if err != nil {
		fatalf("load config: %v", err)
	}
	database, err := db.Connect(cfg)
	if err != nil {
		fatalf("connect to database: %v", err)
	}

	switch resource {
	case "user":
		runUser(database, action, args)
	case "workspace":
		runWorkspace(database, action, args)
	case "project":
		runProject(database, action, args)
	case "diagram":
		runDiagram(database, action, args)
	default:
		fatalf("unknown resource %q — valid resources: user, workspace, project, diagram", resource)
	}
}

// ─── User commands ────────────────────────────────────────────────────────────

func runUser(database *gorm.DB, action string, args []string) {
	switch action {
	case "list":
		var users []models.User
		must(database.Order("created_at desc").Find(&users).Error)
		tw := newTable("ID", "EMAIL", "NAME", "ADMIN", "CREATED")
		for _, u := range users {
			fmt.Fprintf(tw, "%s\t%s\t%s\t%v\t%s\n",
				u.ID, u.Email, u.Name, u.IsAdmin, u.CreatedAt.Format(time.RFC3339))
		}
		tw.Flush()

	case "create":
		fs := flag.NewFlagSet("user create", flag.ExitOnError)
		email := fs.String("email", "", "user email (required)")
		name := fs.String("name", "", "display name (required)")
		password := fs.String("password", "", "password, min 8 chars (required)")
		isAdmin := fs.Bool("admin", false, "grant admin privileges")
		fs.Parse(args)

		requireFlags(map[string]string{"email": *email, "name": *name, "password": *password})
		if len(*password) < 8 {
			fatalf("password must be at least 8 characters")
		}

		hash, err := bcrypt.GenerateFromPassword([]byte(*password), bcrypt.DefaultCost)
		must(err)

		userID := uuid.New().String()
		wsSlug, err := slug.Unique(database, &models.Workspace{}, "slug", *email)
		must(err)
		user := models.User{
			ID:       userID,
			Email:    *email,
			Name:     *name,
			PassHash: string(hash),
			IsAdmin:  *isAdmin,
		}
		ws := models.Workspace{
			ID:         uuid.New().String(),
			Slug:       wsSlug,
			Name:       *name,
			OwnerID:    userID,
			IsPersonal: true,
		}
		wsMember := models.WorkspaceMember{
			ID:          uuid.New().String(),
			WorkspaceID: ws.ID,
			UserID:      userID,
			Role:        models.RoleOwner,
		}
		must(database.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(&user).Error; err != nil {
				return err
			}
			if err := tx.Create(&ws).Error; err != nil {
				return err
			}
			return tx.Create(&wsMember).Error
		}))
		fmt.Printf("Created user %s (%s) — personal workspace: %s\n", user.ID, user.Email, ws.ID)

	case "update":
		fs := flag.NewFlagSet("user update", flag.ExitOnError)
		id := fs.String("id", "", "user ID (required)")
		name := fs.String("name", "", "new display name")
		email := fs.String("email", "", "new email")
		isAdmin := fs.Bool("admin", false, "grant admin")
		noAdmin := fs.Bool("no-admin", false, "revoke admin")
		fs.Parse(args)
		requireFlags(map[string]string{"id": *id})

		var user models.User
		if err := database.First(&user, "id = ?", *id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				fatalf("user not found: %s", *id)
			}
			must(err)
		}

		updates := map[string]any{}
		if *name != "" {
			updates["name"] = *name
		}
		if *email != "" {
			updates["email"] = *email
		}
		if *isAdmin {
			updates["is_admin"] = true
		}
		if *noAdmin {
			updates["is_admin"] = false
		}
		if len(updates) == 0 {
			fatalf("specify at least one flag to update: --name, --email, --admin, --no-admin")
		}
		must(database.Model(&user).Updates(updates).Error)
		fmt.Printf("Updated user %s\n", *id)

	case "delete":
		fs := flag.NewFlagSet("user delete", flag.ExitOnError)
		id := fs.String("id", "", "user ID (required)")
		fs.Parse(args)
		requireFlags(map[string]string{"id": *id})

		result := database.Delete(&models.User{}, "id = ?", *id)
		must(result.Error)
		if result.RowsAffected == 0 {
			fatalf("user not found: %s", *id)
		}
		fmt.Printf("Deleted user %s\n", *id)

	case "make-admin":
		fs := flag.NewFlagSet("user make-admin", flag.ExitOnError)
		id := fs.String("id", "", "user ID (required)")
		fs.Parse(args)
		requireFlags(map[string]string{"id": *id})

		result := database.Model(&models.User{}).Where("id = ?", *id).Update("is_admin", true)
		must(result.Error)
		if result.RowsAffected == 0 {
			fatalf("user not found: %s", *id)
		}
		fmt.Printf("User %s is now an admin\n", *id)

	default:
		fatalf("unknown user action %q — valid actions: list, create, update, delete, make-admin", action)
	}
}

// ─── Workspace commands ───────────────────────────────────────────────────────

func runWorkspace(database *gorm.DB, action string, args []string) {
	switch action {
	case "list":
		var workspaces []models.Workspace
		must(database.Order("created_at desc").Find(&workspaces).Error)
		tw := newTable("ID", "SLUG", "NAME", "OWNER_ID", "PERSONAL", "CREATED")
		for _, w := range workspaces {
			fmt.Fprintf(tw, "%s\t%s\t%s\t%s\t%v\t%s\n",
				w.ID, w.Slug, w.Name, w.OwnerID, w.IsPersonal, w.CreatedAt.Format(time.RFC3339))
		}
		tw.Flush()

	case "create":
		fs := flag.NewFlagSet("workspace create", flag.ExitOnError)
		name := fs.String("name", "", "workspace name (required)")
		slug := fs.String("slug", "", "URL slug, e.g. acme-corp (required)")
		ownerID := fs.String("owner-id", "", "owner user ID (required)")
		avatarURL := fs.String("avatar-url", "", "avatar image URL")
		fs.Parse(args)
		requireFlags(map[string]string{"name": *name, "slug": *slug, "owner-id": *ownerID})

		ws := models.Workspace{
			ID:        uuid.New().String(),
			Slug:      strings.ToLower(strings.TrimSpace(*slug)),
			Name:      *name,
			OwnerID:   *ownerID,
			AvatarURL: *avatarURL,
		}
		member := models.WorkspaceMember{
			ID:          uuid.New().String(),
			WorkspaceID: ws.ID,
			UserID:      *ownerID,
			Role:        models.RoleOwner,
		}
		must(database.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(&ws).Error; err != nil {
				return err
			}
			return tx.Create(&member).Error
		}))
		fmt.Printf("Created workspace %s (%s)\n", ws.ID, ws.Slug)

	case "delete":
		fs := flag.NewFlagSet("workspace delete", flag.ExitOnError)
		id := fs.String("id", "", "workspace ID (required)")
		fs.Parse(args)
		requireFlags(map[string]string{"id": *id})

		result := database.Delete(&models.Workspace{}, "id = ?", *id)
		must(result.Error)
		if result.RowsAffected == 0 {
			fatalf("workspace not found: %s", *id)
		}
		fmt.Printf("Deleted workspace %s\n", *id)

	default:
		fatalf("unknown workspace action %q — valid actions: list, create, delete", action)
	}
}

// ─── Project commands ─────────────────────────────────────────────────────────

func runProject(database *gorm.DB, action string, args []string) {
	switch action {
	case "list":
		fs := flag.NewFlagSet("project list", flag.ExitOnError)
		wsID := fs.String("workspace-id", "", "filter by workspace ID")
		fs.Parse(args)

		q := database.Order("created_at desc")
		if *wsID != "" {
			q = q.Where("workspace_id = ?", *wsID)
		}
		var projects []models.Project
		must(q.Find(&projects).Error)

		tw := newTable("ID", "NAME", "WORKSPACE_ID", "OWNER_ID", "VISIBILITY", "CREATED")
		for _, p := range projects {
			fmt.Fprintf(tw, "%s\t%s\t%s\t%s\t%s\t%s\n",
				p.ID, p.Name, p.WorkspaceID, p.OwnerID, p.Visibility, p.CreatedAt.Format(time.RFC3339))
		}
		tw.Flush()

	case "create":
		fs := flag.NewFlagSet("project create", flag.ExitOnError)
		wsID := fs.String("workspace-id", "", "workspace ID (required)")
		ownerID := fs.String("owner-id", "", "owner user ID (required)")
		name := fs.String("name", "", "project name (required)")
		description := fs.String("description", "", "project description")
		visibility := fs.String("visibility", "private", "visibility: private | workspace | public")
		fs.Parse(args)
		requireFlags(map[string]string{"workspace-id": *wsID, "owner-id": *ownerID, "name": *name})

		projectID := uuid.New().String()
		p := models.Project{
			ID:          projectID,
			WorkspaceID: *wsID,
			OwnerID:     *ownerID,
			Name:        *name,
			Description: *description,
			Visibility:  *visibility,
		}
		member := models.ProjectMember{
			ID:        uuid.New().String(),
			ProjectID: projectID,
			UserID:    *ownerID,
			Role:      models.RoleOwner,
		}
		must(database.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(&p).Error; err != nil {
				return err
			}
			return tx.Create(&member).Error
		}))
		fmt.Printf("Created project %s (%s)\n", projectID, *name)

	case "delete":
		fs := flag.NewFlagSet("project delete", flag.ExitOnError)
		id := fs.String("id", "", "project ID (required)")
		fs.Parse(args)
		requireFlags(map[string]string{"id": *id})

		result := database.Delete(&models.Project{}, "id = ?", *id)
		must(result.Error)
		if result.RowsAffected == 0 {
			fatalf("project not found: %s", *id)
		}
		fmt.Printf("Deleted project %s\n", *id)

	default:
		fatalf("unknown project action %q — valid actions: list, create, delete", action)
	}
}

// ─── Diagram commands ─────────────────────────────────────────────────────────

func runDiagram(database *gorm.DB, action string, args []string) {
	switch action {
	case "list":
		fs := flag.NewFlagSet("diagram list", flag.ExitOnError)
		projID := fs.String("project-id", "", "filter by project ID")
		fs.Parse(args)

		q := database.Model(&models.Diagram{}).
			Select("id, project_id, name, diagram_type, created_at, updated_at").
			Order("created_at desc")
		if *projID != "" {
			q = q.Where("project_id = ?", *projID)
		}
		var diagrams []models.DiagramSummary
		must(q.Find(&diagrams).Error)

		tw := newTable("ID", "NAME", "TYPE", "PROJECT_ID", "CREATED")
		for _, d := range diagrams {
			fmt.Fprintf(tw, "%s\t%s\t%s\t%s\t%s\n",
				d.ID, d.Name, d.DiagramType, d.ProjectID, d.CreatedAt.Format(time.RFC3339))
		}
		tw.Flush()

	case "create":
		fs := flag.NewFlagSet("diagram create", flag.ExitOnError)
		projID := fs.String("project-id", "", "project ID (required)")
		name := fs.String("name", "", "diagram name (required)")
		diagType := fs.String("type", "architecture", "diagram type (architecture|sequence|class|er|flowchart|network|platform|state_machine|activity|component|deployment|use_case)")
		fs.Parse(args)
		requireFlags(map[string]string{"project-id": *projID, "name": *name})

		var project models.Project
		if err := database.Select("id, owner_id").First(&project, "id = ?", *projID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				fatalf("project not found: %s", *projID)
			}
			must(err)
		}

		dt := models.DiagramType(*diagType)
		diagramID := uuid.New().String()
		branchID := uuid.New().String()
		commitID := uuid.New().String()

		diagram := models.Diagram{
			ID:              diagramID,
			ProjectID:       *projID,
			Name:            *name,
			DiagramType:     dt,
			DefaultBranchID: branchID,
		}
		branch := models.Branch{
			ID:           branchID,
			DiagramID:    diagramID,
			Name:         "main",
			HeadCommitID: commitID,
			CreatedByID:  project.OwnerID,
		}
		commit := models.Commit{
			ID:          commitID,
			DiagramID:   diagramID,
			BranchID:    branchID,
			AuthorID:    project.OwnerID,
			Message:     "Initial commit",
			NodesJSON:   "[]",
			EdgesJSON:   "[]",
			Viewport:    `{"x":0,"y":0,"zoom":1}`,
			ContentHash: hash.Content("[]", "[]"),
		}
		must(database.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(&diagram).Error; err != nil {
				return err
			}
			if err := tx.Create(&branch).Error; err != nil {
				return err
			}
			return tx.Create(&commit).Error
		}))
		fmt.Printf("Created diagram %s (%s) in project %s\n", diagramID, *name, *projID)

	case "delete":
		fs := flag.NewFlagSet("diagram delete", flag.ExitOnError)
		id := fs.String("id", "", "diagram ID (required)")
		fs.Parse(args)
		requireFlags(map[string]string{"id": *id})

		result := database.Delete(&models.Diagram{}, "id = ?", *id)
		must(result.Error)
		if result.RowsAffected == 0 {
			fatalf("diagram not found: %s", *id)
		}
		fmt.Printf("Deleted diagram %s\n", *id)

	default:
		fatalf("unknown diagram action %q — valid actions: list, create, delete", action)
	}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func newTable(headers ...string) *tabwriter.Writer {
	tw := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintln(tw, strings.Join(headers, "\t"))
	fmt.Fprintln(tw, strings.Repeat("-\t", len(headers)))
	return tw
}

func requireFlags(m map[string]string) {
	var missing []string
	for k, v := range m {
		if v == "" {
			missing = append(missing, "--"+k)
		}
	}
	if len(missing) > 0 {
		fatalf("missing required flags: %s", strings.Join(missing, ", "))
	}
}

func fatalf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, "error: "+format+"\n", args...)
	os.Exit(1)
}

func must(err error) {
	if err != nil {
		fatalf("%v", err)
	}
}


func printUsage() {
	fmt.Fprintln(os.Stderr, `Seyhoun Admin CLI

Usage:
  seyhoun-cli <resource> <action> [flags]

Resources:
  user       list | create | update | delete | make-admin
  workspace  list | create | delete
  project    list | create | delete
  diagram    list | create | delete

Examples:
  seyhoun-cli user list
  seyhoun-cli user create --email alice@example.com --name "Alice" --password secret123 --admin
  seyhoun-cli user make-admin --id <user-id>
  seyhoun-cli user update --id <user-id> --name "Alice Smith"
  seyhoun-cli user delete --id <user-id>

  seyhoun-cli workspace list
  seyhoun-cli workspace create --name "Acme Corp" --slug acme-corp --owner-id <user-id>
  seyhoun-cli workspace delete --id <workspace-id>

  seyhoun-cli project list --workspace-id <workspace-id>
  seyhoun-cli project create --workspace-id <ws-id> --owner-id <user-id> --name "Backend"
  seyhoun-cli project delete --id <project-id>

  seyhoun-cli diagram list --project-id <project-id>
  seyhoun-cli diagram create --project-id <proj-id> --name "Auth Flow" --type sequence
  seyhoun-cli diagram delete --id <diagram-id>

Config is loaded from config.yml (same as the server). Override DB via DATABASE_* env vars.`)
}
