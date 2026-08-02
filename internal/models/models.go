package models

import "time"

// ─── Roles ───────────────────────────────────────────────────────────────────

type Role string

const (
	RoleOwner      Role = "owner"
	RoleMaintainer Role = "maintainer"
	RoleDeveloper  Role = "developer"
	RoleCommenter  Role = "commenter"
	RoleViewer     Role = "viewer"
)

// RoleWeight returns a numeric weight for comparison (higher = more permissive).
func RoleWeight(r Role) int {
	switch r {
	case RoleOwner:
		return 5
	case RoleMaintainer:
		return 4
	case RoleDeveloper:
		return 3
	case RoleCommenter:
		return 2
	case RoleViewer:
		return 1
	default:
		return 0
	}
}

// ─── Diagram Types ────────────────────────────────────────────────────────────

type DiagramType string

const (
	DiagramTypeArchitecture DiagramType = "architecture"
	DiagramTypeSequence     DiagramType = "sequence"
	DiagramTypeClass        DiagramType = "class"
	DiagramTypeER           DiagramType = "er"
	DiagramTypeFlowchart    DiagramType = "flowchart"
	DiagramTypeNetwork      DiagramType = "network"
	DiagramTypePlatform     DiagramType = "platform"
	DiagramTypeStateMachine DiagramType = "state_machine"
	DiagramTypeActivity     DiagramType = "activity"
	DiagramTypeComponent    DiagramType = "component"
	DiagramTypeDeployment   DiagramType = "deployment"
	DiagramTypeUseCase      DiagramType = "use_case"
)

// ─── PR Status ────────────────────────────────────────────────────────────────

type PRStatus string

const (
	PRStatusOpen   PRStatus = "open"
	PRStatusMerged PRStatus = "merged"
	PRStatusClosed PRStatus = "closed"
)

// ─── User ─────────────────────────────────────────────────────────────────────

type User struct {
	ID        string    `gorm:"type:text;primaryKey"           json:"id"`
	Email     string    `gorm:"type:text;uniqueIndex;not null" json:"email"`
	Name      string    `gorm:"type:text;not null"             json:"name"`
	PassHash  string    `gorm:"type:text;not null"             json:"-"`
	IsAdmin   bool      `gorm:"not null;default:false"         json:"isAdmin"`
	CreatedAt time.Time `gorm:"autoCreateTime"                 json:"createdAt"`
}

func (User) TableName() string { return "users" }

// ─── Workspace ────────────────────────────────────────────────────────────────

type Workspace struct {
	ID         string    `gorm:"type:text;primaryKey"              json:"id"`
	Slug       string    `gorm:"type:text;uniqueIndex;not null"    json:"slug"`
	Name       string    `gorm:"type:text;not null"                json:"name"`
	OwnerID    string    `gorm:"type:text;not null;index"          json:"ownerId"`
	IsPersonal bool      `gorm:"not null;default:false"            json:"isPersonal"`
	AvatarURL  string    `gorm:"type:text;not null;default:''"     json:"avatarUrl"`
	CreatedAt  time.Time `gorm:"autoCreateTime"                    json:"createdAt"`
	UpdatedAt  time.Time `gorm:"autoUpdateTime"                    json:"updatedAt"`

	Owner    *User             `gorm:"foreignKey:OwnerID;constraint:-"                       json:"-"`
	Members  []WorkspaceMember `gorm:"foreignKey:WorkspaceID;constraint:OnDelete:CASCADE"    json:"members,omitempty"`
	Projects []Project         `gorm:"foreignKey:WorkspaceID;constraint:OnDelete:CASCADE"    json:"projects,omitempty"`
}

func (Workspace) TableName() string { return "workspaces" }

// ─── WorkspaceMember ──────────────────────────────────────────────────────────

type WorkspaceMember struct {
	ID          string    `gorm:"type:text;primaryKey"                                              json:"id"`
	WorkspaceID string    `gorm:"type:text;not null;uniqueIndex:idx_ws_member,priority:1"           json:"workspaceId"`
	UserID      string    `gorm:"type:text;not null;uniqueIndex:idx_ws_member,priority:2;index"     json:"userId"`
	Role        Role      `gorm:"type:text;not null;default:'viewer'"                               json:"role"`
	CreatedAt   time.Time `gorm:"autoCreateTime"                                                     json:"createdAt"`

	Workspace *Workspace `gorm:"foreignKey:WorkspaceID;constraint:OnDelete:CASCADE" json:"-"`
	User      *User      `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"      json:"-"`
}

func (WorkspaceMember) TableName() string { return "workspace_members" }

// ─── Project ──────────────────────────────────────────────────────────────────

type Project struct {
	ID          string    `gorm:"type:text;primaryKey"                                  json:"id"`
	WorkspaceID string    `gorm:"type:text;not null;index"                              json:"workspaceId"`
	OwnerID     string    `gorm:"type:text;not null;index:idx_projects_owner"           json:"ownerId"`
	Name        string    `gorm:"type:text;not null"                                    json:"name"`
	Description string    `gorm:"type:text;not null;default:''"                         json:"description"`
	Visibility  string    `gorm:"type:text;not null;default:'private'"                  json:"visibility"`
	CreatedAt   time.Time `gorm:"autoCreateTime"                                        json:"createdAt"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime"                                        json:"updatedAt"`

	Workspace *Workspace      `gorm:"foreignKey:WorkspaceID;constraint:OnDelete:CASCADE" json:"-"`
	Diagrams  []Diagram       `gorm:"foreignKey:ProjectID;constraint:OnDelete:CASCADE"   json:"diagrams,omitempty"`
	Members   []ProjectMember `gorm:"foreignKey:ProjectID;constraint:OnDelete:CASCADE"   json:"members,omitempty"`
}

func (Project) TableName() string { return "projects" }

// ─── ProjectMember ────────────────────────────────────────────────────────────

type ProjectMember struct {
	ID        string    `gorm:"type:text;primaryKey"                                           json:"id"`
	ProjectID string    `gorm:"type:text;not null;uniqueIndex:idx_proj_member,priority:1"      json:"projectId"`
	UserID    string    `gorm:"type:text;not null;uniqueIndex:idx_proj_member,priority:2;index" json:"userId"`
	Role      Role      `gorm:"type:text;not null;default:'viewer'"                            json:"role"`
	CreatedAt time.Time `gorm:"autoCreateTime"                                                 json:"createdAt"`

	Project *Project `gorm:"foreignKey:ProjectID;constraint:OnDelete:CASCADE" json:"-"`
	User    *User    `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"    json:"-"`
}

func (ProjectMember) TableName() string { return "project_members" }

// ─── Diagram ──────────────────────────────────────────────────────────────────

type Diagram struct {
	ID              string      `gorm:"type:text;primaryKey"                          json:"id"`
	ProjectID       string      `gorm:"type:text;not null;index:idx_diagrams_project" json:"projectId"`
	Name            string      `gorm:"type:text;not null"                            json:"name"`
	DiagramType     DiagramType `gorm:"type:text;not null;default:'architecture'"     json:"diagramType"`
	DefaultBranchID string      `gorm:"type:text"                                     json:"defaultBranchId"`
	CreatedAt       time.Time   `gorm:"autoCreateTime"                                json:"createdAt"`
	UpdatedAt       time.Time   `gorm:"autoUpdateTime"                                json:"updatedAt"`

	// Legacy content fields — kept for the migration script, not used by the git layer.
	// These will be removed after data migration is complete.
	NodesJSON  string `gorm:"type:text;not null;default:'[]'"                           json:"-"`
	EdgesJSON  string `gorm:"type:text;not null;default:'[]'"                           json:"-"`
	PumlSource string `gorm:"type:text;not null;default:''"                             json:"-"`
	Viewport   string `gorm:"type:text;not null;default:'{\"x\":0,\"y\":0,\"zoom\":1}'" json:"-"`

	Project       *Project       `gorm:"foreignKey:ProjectID;constraint:OnDelete:CASCADE" json:"-"`
	Branches      []Branch       `gorm:"foreignKey:DiagramID;constraint:OnDelete:CASCADE" json:"branches,omitempty"`
	PluginConfigs []PluginConfig `gorm:"foreignKey:DiagramID;constraint:OnDelete:CASCADE" json:"pluginConfigs,omitempty"`
}

func (Diagram) TableName() string { return "diagrams" }

// ─── Branch ───────────────────────────────────────────────────────────────────

type Branch struct {
	ID           string    `gorm:"type:text;primaryKey"                                               json:"id"`
	DiagramID    string    `gorm:"type:text;not null;uniqueIndex:idx_branch_name,priority:1;index"   json:"diagramId"`
	Name         string    `gorm:"type:text;not null;uniqueIndex:idx_branch_name,priority:2"          json:"name"`
	HeadCommitID string    `gorm:"type:text"                                                           json:"headCommitId"`
	BaseBranchID string    `gorm:"type:text"                                                           json:"baseBranchId"`
	BaseCommitID string    `gorm:"type:text"                                                           json:"baseCommitId"`
	CreatedByID  string    `gorm:"type:text;not null;index"                                            json:"createdById"`
	CreatedAt    time.Time `gorm:"autoCreateTime"                                                      json:"createdAt"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime"                                                      json:"updatedAt"`

	Diagram    *Diagram `gorm:"foreignKey:DiagramID;constraint:OnDelete:CASCADE" json:"-"`
	HeadCommit *Commit  `gorm:"foreignKey:HeadCommitID;constraint:-"             json:"headCommit,omitempty"`
	CreatedBy  *User    `gorm:"foreignKey:CreatedByID;constraint:-"              json:"-"`
}

func (Branch) TableName() string { return "branches" }

// ─── Commit ───────────────────────────────────────────────────────────────────

type Commit struct {
	ID          string    `gorm:"type:text;primaryKey"               json:"id"`
	DiagramID   string    `gorm:"type:text;not null;index"           json:"diagramId"`
	BranchID    string    `gorm:"type:text;not null;index"           json:"branchId"`
	ParentID    string    `gorm:"type:text;index"                    json:"parentId"`
	AuthorID    string    `gorm:"type:text;not null;index"           json:"authorId"`
	Message     string    `gorm:"type:text;not null"                 json:"message"`
	NodesJSON   string    `gorm:"type:text;not null"                 json:"nodesJson"`
	EdgesJSON   string    `gorm:"type:text;not null"                 json:"edgesJson"`
	Viewport    string    `gorm:"type:text;not null"                 json:"viewport"`
	PumlSource  string    `gorm:"type:text;not null;default:''"      json:"pumlSource"`
	ContentHash string    `gorm:"type:text;not null;index"           json:"contentHash"`
	CreatedAt   time.Time `gorm:"autoCreateTime"                     json:"createdAt"`

	Diagram *Diagram `gorm:"foreignKey:DiagramID;constraint:OnDelete:CASCADE" json:"-"`
	Branch  *Branch  `gorm:"foreignKey:BranchID;constraint:OnDelete:CASCADE"  json:"-"`
	Parent  *Commit  `gorm:"foreignKey:ParentID;constraint:-"                 json:"-"`
	Author  *User    `gorm:"foreignKey:AuthorID;constraint:-"                 json:"-"`
}

func (Commit) TableName() string { return "commits" }

// ─── PullRequest ──────────────────────────────────────────────────────────────

type PullRequest struct {
	ID             string     `gorm:"type:text;primaryKey"                                            json:"id"`
	DiagramID      string     `gorm:"type:text;not null;uniqueIndex:idx_pr_number,priority:1;index"  json:"diagramId"`
	Number         int        `gorm:"not null;uniqueIndex:idx_pr_number,priority:2"                  json:"number"`
	Title          string     `gorm:"type:text;not null"                                             json:"title"`
	Description    string     `gorm:"type:text;not null;default:''"                                  json:"description"`
	SourceBranchID string     `gorm:"type:text;not null"                                             json:"sourceBranchId"`
	TargetBranchID string     `gorm:"type:text;not null"                                             json:"targetBranchId"`
	AuthorID       string     `gorm:"type:text;not null;index"                                       json:"authorId"`
	Status         PRStatus   `gorm:"type:text;not null;default:'open'"                              json:"status"`
	MergedByID     string     `gorm:"type:text"                                                      json:"mergedById"`
	MergedAt       *time.Time `gorm:"default:null"                                                   json:"mergedAt"`
	CreatedAt      time.Time  `gorm:"autoCreateTime"                                                 json:"createdAt"`
	UpdatedAt      time.Time  `gorm:"autoUpdateTime"                                                 json:"updatedAt"`

	Diagram      *Diagram     `gorm:"foreignKey:DiagramID;constraint:OnDelete:CASCADE" json:"-"`
	SourceBranch *Branch      `gorm:"foreignKey:SourceBranchID;constraint:-"           json:"sourceBranch,omitempty"`
	TargetBranch *Branch      `gorm:"foreignKey:TargetBranchID;constraint:-"           json:"targetBranch,omitempty"`
	Author       *User        `gorm:"foreignKey:AuthorID;constraint:-"                 json:"-"`
	MergedBy     *User        `gorm:"foreignKey:MergedByID;constraint:-"               json:"-"`
	Comments     []PRComment  `gorm:"foreignKey:PullRequestID;constraint:OnDelete:CASCADE" json:"comments,omitempty"`
}

func (PullRequest) TableName() string { return "pull_requests" }

// ─── PRComment ────────────────────────────────────────────────────────────────

type PRComment struct {
	ID            string    `gorm:"type:text;primaryKey"        json:"id"`
	PullRequestID string    `gorm:"type:text;not null;index"    json:"pullRequestId"`
	AuthorID      string    `gorm:"type:text;not null"          json:"authorId"`
	Body          string    `gorm:"type:text;not null"          json:"body"`
	NodeID        string    `gorm:"type:text"                   json:"nodeId,omitempty"`
	CreatedAt     time.Time `gorm:"autoCreateTime"              json:"createdAt"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime"              json:"updatedAt"`

	PullRequest *PullRequest `gorm:"foreignKey:PullRequestID;constraint:OnDelete:CASCADE" json:"-"`
	Author      *User        `gorm:"foreignKey:AuthorID;constraint:-"                      json:"-"`
}

func (PRComment) TableName() string { return "pr_comments" }

// ─── PluginConfig ─────────────────────────────────────────────────────────────

type PluginConfig struct {
	ID         string    `gorm:"type:text;primaryKey"                            json:"id"`
	DiagramID  string    `gorm:"type:text;not null;index:idx_plugin_configs_diagram" json:"diagramId"`
	NodeID     string    `gorm:"type:text;not null"                              json:"nodeId"`
	PluginType string    `gorm:"type:text;not null"                              json:"pluginType"`
	ConfigJSON string    `gorm:"type:text;not null;default:'{}'"                 json:"configJson"`
	Enabled    bool      `gorm:"not null;default:true"                           json:"enabled"`
	CreatedAt  time.Time `gorm:"autoCreateTime"                                  json:"createdAt"`

	Diagram         *Diagram         `gorm:"foreignKey:DiagramID;constraint:OnDelete:CASCADE"      json:"-"`
	MetricSnapshots []MetricSnapshot `gorm:"foreignKey:PluginConfigID;constraint:OnDelete:CASCADE" json:"metricSnapshots,omitempty"`
}

func (PluginConfig) TableName() string { return "plugin_configs" }

// ─── MetricSnapshot ───────────────────────────────────────────────────────────

type MetricSnapshot struct {
	ID             uint      `gorm:"primaryKey;autoIncrement"                          json:"id"`
	PluginConfigID string    `gorm:"type:text;not null;index:idx_snapshots_config_time" json:"pluginConfigId"`
	DataJSON       string    `gorm:"type:text;not null"                                json:"dataJson"`
	CapturedAt     time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"                json:"capturedAt"`

	PluginConfig *PluginConfig `gorm:"foreignKey:PluginConfigID;constraint:OnDelete:CASCADE" json:"-"`
}

func (MetricSnapshot) TableName() string { return "metric_snapshots" }

// ─── DiagramVersion (legacy — superseded by Branch/Commit) ───────────────────

// DiagramVersion is kept in the schema during the migration period.
// After cmd/migrate/main.go has been run and verified, this model and its
// table can be dropped.
type DiagramVersion struct {
	ID        string    `gorm:"type:text;primaryKey"                          json:"id"`
	DiagramID string    `gorm:"type:text;not null;index:idx_versions_diagram" json:"diagramId"`
	Version   int       `gorm:"not null"                                      json:"version"`
	NodesJSON string    `gorm:"type:text;not null"                            json:"nodesJson"`
	EdgesJSON string    `gorm:"type:text;not null"                            json:"edgesJson"`
	Viewport  string    `gorm:"type:text;not null"                            json:"viewport"`
	CreatedAt time.Time `gorm:"autoCreateTime"                                json:"createdAt"`

	Diagram *Diagram `gorm:"foreignKey:DiagramID;constraint:OnDelete:CASCADE" json:"-"`
}

func (DiagramVersion) TableName() string { return "diagram_versions" }

// ─── Read-only projections ────────────────────────────────────────────────────

// DiagramSummary is a read-only projection used for list endpoints.
type DiagramSummary struct {
	ID          string      `json:"id"`
	ProjectID   string      `json:"projectId"`
	Name        string      `json:"name"`
	DiagramType DiagramType `json:"diagramType"`
	CreatedAt   time.Time   `json:"createdAt"`
	UpdatedAt   time.Time   `json:"updatedAt"`
}

// DiagramVersionSummary is a read-only projection for the legacy version list endpoint.
type DiagramVersionSummary struct {
	ID        string    `json:"id"`
	DiagramID string    `json:"diagramId"`
	Version   int       `json:"version"`
	CreatedAt time.Time `json:"createdAt"`
}

// CommitSummary is a read-only projection for the commit list endpoint.
type CommitSummary struct {
	ID          string    `json:"id"`
	DiagramID   string    `json:"diagramId"`
	BranchID    string    `json:"branchId"`
	ParentID    string    `json:"parentId"`
	AuthorID    string    `json:"authorId"`
	Message     string    `json:"message"`
	ContentHash string    `json:"contentHash"`
	CreatedAt   time.Time `json:"createdAt"`
}
