package testutil

import (
	"os"
	"testing"

	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"seyhoun/internal/models"
)

// TestDB returns a *gorm.DB wrapped in a transaction that is rolled back when
// the test ends, giving each test full isolation without truncating tables.
//
// Set TEST_DATABASE_DSN to override the default connection string:
//
//	TEST_DATABASE_DSN="host=localhost user=seyhounapp password=secret dbname=seyhoundb_test sslmode=disable"
func TestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		dsn = "host=localhost user=seyhounapp password=password1 dbname=seyhoundb_test port=5432 sslmode=disable TimeZone=UTC"
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("testutil: connect to test DB: %v", err)
	}

	// Ensure schema is up-to-date (idempotent).
	//
	// Branch and Commit reference each other (Branch.HeadCommit <-> Commit.Branch),
	// so GORM's association traversal tries to create whichever table it reaches
	// second with a FK to a table that doesn't exist yet, regardless of the order
	// passed below. Migrate once with FK constraints off to create bare tables,
	// then again with them on to add the constraints now both tables exist.
	migrate := func(disableFK bool) error {
		db.Config.DisableForeignKeyConstraintWhenMigrating = disableFK
		return db.AutoMigrate(
			&models.User{},
			&models.Workspace{},
			&models.WorkspaceMember{},
			&models.Project{},
			&models.ProjectMember{},
			&models.Branch{},
			&models.Diagram{},
			&models.Commit{},
			&models.PullRequest{},
			&models.PRComment{},
			&models.PluginConfig{},
			&models.MetricSnapshot{},
			&models.DiagramVersion{},
		)
	}
	if err := migrate(true); err != nil {
		t.Fatalf("testutil: auto-migrate (tables): %v", err)
	}
	if err := migrate(false); err != nil {
		t.Fatalf("testutil: auto-migrate (constraints): %v", err)
	}

	tx := db.Begin()
	if tx.Error != nil {
		t.Fatalf("testutil: begin transaction: %v", tx.Error)
	}
	t.Cleanup(func() { tx.Rollback() })

	return tx
}

// SeedUser inserts a test user and returns its ID.
func SeedUser(t *testing.T, db *gorm.DB) string {
	t.Helper()
	u := models.User{
		ID:       uuid.New().String(),
		Email:    uuid.New().String() + "@test.local",
		Name:     "Test User",
		PassHash: "$2a$10$dummy.hash.for.tests.only.XXXXXXXXXXXXXXXXXXXXXXXXXX",
	}
	if err := db.Create(&u).Error; err != nil {
		t.Fatalf("testutil: seed user: %v", err)
	}
	return u.ID
}

// SeedWorkspace creates a workspace and adds the user as owner. Returns the workspace ID.
func SeedWorkspace(t *testing.T, db *gorm.DB, userID string) string {
	t.Helper()
	ws := models.Workspace{
		ID:         uuid.New().String(),
		Slug:       uuid.New().String()[:8],
		Name:       "Test Workspace",
		OwnerID:    userID,
		IsPersonal: true,
	}
	if err := db.Create(&ws).Error; err != nil {
		t.Fatalf("testutil: seed workspace: %v", err)
	}
	member := models.WorkspaceMember{
		ID:          uuid.New().String(),
		WorkspaceID: ws.ID,
		UserID:      userID,
		Role:        models.RoleOwner,
	}
	if err := db.Create(&member).Error; err != nil {
		t.Fatalf("testutil: seed workspace member: %v", err)
	}
	return ws.ID
}

// SeedProject creates a project in the given workspace with the user as owner.
// Returns the project ID.
func SeedProject(t *testing.T, db *gorm.DB, userID, workspaceID, projectID string) string {
	t.Helper()
	if projectID == "" {
		projectID = uuid.New().String()
	}
	p := models.Project{
		ID:          projectID,
		WorkspaceID: workspaceID,
		OwnerID:     userID,
		Name:        "Test Project",
		Visibility:  "private",
	}
	if err := db.Create(&p).Error; err != nil {
		t.Fatalf("testutil: seed project: %v", err)
	}
	member := models.ProjectMember{
		ID:        uuid.New().String(),
		ProjectID: projectID,
		UserID:    userID,
		Role:      models.RoleOwner,
	}
	if err := db.Create(&member).Error; err != nil {
		t.Fatalf("testutil: seed project member: %v", err)
	}
	return projectID
}
