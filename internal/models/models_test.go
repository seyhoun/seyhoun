package models_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"seyhoun/internal/models"
	"seyhoun/internal/testutil"
)

func TestCascadeDelete_ProjectDeletesDiagrams(t *testing.T) {
	db := testutil.TestDB(t)
	userID := testutil.SeedUser(t, db)
	wsID := testutil.SeedWorkspace(t, db, userID)

	p := models.Project{ID: "cascade-proj-1", WorkspaceID: wsID, OwnerID: userID, Name: "Cascade Project", Visibility: "private"}
	require.NoError(t, db.Create(&p).Error)

	d := models.Diagram{ID: "cascade-diag-1", ProjectID: "cascade-proj-1", Name: "D"}
	require.NoError(t, db.Create(&d).Error)

	// Confirm diagram exists
	var count int64
	db.Model(&models.Diagram{}).Where("id = ?", "cascade-diag-1").Count(&count)
	assert.Equal(t, int64(1), count)

	// Delete project → should cascade to diagram
	require.NoError(t, db.Delete(&models.Project{}, "id = ?", "cascade-proj-1").Error)

	db.Model(&models.Diagram{}).Where("id = ?", "cascade-diag-1").Count(&count)
	assert.Equal(t, int64(0), count, "diagram should be deleted when its project is deleted")
}

func TestCascadeDelete_DiagramDeletesPluginConfigs(t *testing.T) {
	db := testutil.TestDB(t)
	userID := testutil.SeedUser(t, db)
	wsID := testutil.SeedWorkspace(t, db, userID)

	p := models.Project{ID: "cascade-proj-2", WorkspaceID: wsID, OwnerID: userID, Name: "P", Visibility: "private"}
	require.NoError(t, db.Create(&p).Error)

	d := models.Diagram{ID: "cascade-diag-2", ProjectID: "cascade-proj-2", Name: "D"}
	require.NoError(t, db.Create(&d).Error)

	pc := models.PluginConfig{
		ID: "cascade-pc-1", DiagramID: "cascade-diag-2",
		NodeID: "node-1", PluginType: "postgres", ConfigJSON: "{}",
	}
	require.NoError(t, db.Create(&pc).Error)

	// Confirm plugin config exists
	var count int64
	db.Model(&models.PluginConfig{}).Where("id = ?", "cascade-pc-1").Count(&count)
	assert.Equal(t, int64(1), count)

	// Delete diagram → should cascade to plugin config
	require.NoError(t, db.Delete(&models.Diagram{}, "id = ?", "cascade-diag-2").Error)

	db.Model(&models.PluginConfig{}).Where("id = ?", "cascade-pc-1").Count(&count)
	assert.Equal(t, int64(0), count, "plugin config should be deleted when its diagram is deleted")
}

func TestCascadeDelete_PluginConfigDeletesMetricSnapshots(t *testing.T) {
	db := testutil.TestDB(t)
	userID := testutil.SeedUser(t, db)
	wsID := testutil.SeedWorkspace(t, db, userID)

	p := models.Project{ID: "cascade-proj-3", WorkspaceID: wsID, OwnerID: userID, Name: "P", Visibility: "private"}
	require.NoError(t, db.Create(&p).Error)

	d := models.Diagram{ID: "cascade-diag-3", ProjectID: "cascade-proj-3", Name: "D"}
	require.NoError(t, db.Create(&d).Error)

	pc := models.PluginConfig{
		ID: "cascade-pc-2", DiagramID: "cascade-diag-3",
		NodeID: "node-1", PluginType: "redis", ConfigJSON: "{}",
	}
	require.NoError(t, db.Create(&pc).Error)

	ms := models.MetricSnapshot{
		PluginConfigID: "cascade-pc-2", DataJSON: `{"used_memory":1024}`,
	}
	require.NoError(t, db.Create(&ms).Error)
	snapshotID := ms.ID

	// Confirm snapshot exists
	var count int64
	db.Model(&models.MetricSnapshot{}).Where("id = ?", snapshotID).Count(&count)
	assert.Equal(t, int64(1), count)

	// Delete plugin config → should cascade to metric snapshot
	require.NoError(t, db.Delete(&models.PluginConfig{}, "id = ?", "cascade-pc-2").Error)

	db.Model(&models.MetricSnapshot{}).Where("id = ?", snapshotID).Count(&count)
	assert.Equal(t, int64(0), count, "metric snapshot should be deleted when its plugin config is deleted")
}

func TestCascadeDelete_DiagramDeletesBranches(t *testing.T) {
	db := testutil.TestDB(t)
	userID := testutil.SeedUser(t, db)
	wsID := testutil.SeedWorkspace(t, db, userID)

	p := models.Project{ID: "cascade-proj-4", WorkspaceID: wsID, OwnerID: userID, Name: "P", Visibility: "private"}
	require.NoError(t, db.Create(&p).Error)

	d := models.Diagram{ID: "cascade-diag-4", ProjectID: "cascade-proj-4", Name: "D"}
	require.NoError(t, db.Create(&d).Error)

	b := models.Branch{
		ID: "cascade-branch-1", DiagramID: "cascade-diag-4",
		Name: "main", CreatedByID: userID,
	}
	require.NoError(t, db.Create(&b).Error)

	var count int64
	db.Model(&models.Branch{}).Where("id = ?", "cascade-branch-1").Count(&count)
	assert.Equal(t, int64(1), count)

	require.NoError(t, db.Delete(&models.Diagram{}, "id = ?", "cascade-diag-4").Error)

	db.Model(&models.Branch{}).Where("id = ?", "cascade-branch-1").Count(&count)
	assert.Equal(t, int64(0), count, "branch should be deleted when its diagram is deleted")
}
