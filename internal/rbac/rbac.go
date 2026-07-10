// Package rbac resolves effective roles and checks permissions for users
// acting on workspaces and projects.
//
// Permission resolution order:
//  1. If the user has an explicit ProjectMember record, use that role.
//  2. Otherwise fall back to the user's WorkspaceMember role.
//  3. Effective role = max(project role, workspace role).
package rbac

import (
	"seyhoun/internal/models"

	"gorm.io/gorm"
)

// RBAC provides permission checks backed by the database.
type RBAC struct {
	db *gorm.DB
}

func New(db *gorm.DB) *RBAC {
	return &RBAC{db: db}
}

// EffectiveRole returns the most permissive role the user holds for the given
// project (considering both project-level and workspace-level membership).
// Returns empty string if the user has no access at all.
func (rb *RBAC) EffectiveRole(userID, workspaceID, projectID string) models.Role {
	var wsRole, projRole models.Role

	var wm models.WorkspaceMember
	if err := rb.db.Where("workspace_id = ? AND user_id = ?", workspaceID, userID).
		First(&wm).Error; err == nil {
		wsRole = wm.Role
	}

	if projectID != "" {
		var pm models.ProjectMember
		if err := rb.db.Where("project_id = ? AND user_id = ?", projectID, userID).
			First(&pm).Error; err == nil {
			projRole = pm.Role
		}
	}

	if models.RoleWeight(projRole) >= models.RoleWeight(wsRole) {
		return projRole
	}
	return wsRole
}

// CanView returns true for any non-zero role (viewer and above).
func (rb *RBAC) CanView(userID, workspaceID, projectID string) bool {
	return models.RoleWeight(rb.EffectiveRole(userID, workspaceID, projectID)) >= models.RoleWeight(models.RoleViewer)
}

// CanComment returns true for commenter and above.
func (rb *RBAC) CanComment(userID, workspaceID, projectID string) bool {
	return models.RoleWeight(rb.EffectiveRole(userID, workspaceID, projectID)) >= models.RoleWeight(models.RoleCommenter)
}

// CanDevelop returns true for developer and above (can commit, create branches, open PRs).
func (rb *RBAC) CanDevelop(userID, workspaceID, projectID string) bool {
	return models.RoleWeight(rb.EffectiveRole(userID, workspaceID, projectID)) >= models.RoleWeight(models.RoleDeveloper)
}

// CanMaintain returns true for maintainer and above (can merge PRs, manage non-owner members).
func (rb *RBAC) CanMaintain(userID, workspaceID, projectID string) bool {
	return models.RoleWeight(rb.EffectiveRole(userID, workspaceID, projectID)) >= models.RoleWeight(models.RoleMaintainer)
}

// CanOwn returns true only for owners (delete workspace/project, manage all members).
func (rb *RBAC) CanOwn(userID, workspaceID, projectID string) bool {
	return models.RoleWeight(rb.EffectiveRole(userID, workspaceID, projectID)) >= models.RoleWeight(models.RoleOwner)
}
