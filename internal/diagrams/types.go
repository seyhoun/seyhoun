// Package diagrams provides static metadata about supported diagram types.
package diagrams

import "seyhoun/internal/models"

// TypeInfo describes a diagram type available in Seyhoun.
type TypeInfo struct {
	Type        models.DiagramType `json:"type"`
	Name        string             `json:"name"`
	Description string             `json:"description"`
	Category    string             `json:"category"` // "Architecture", "UML", "Data", "Infrastructure", "General"
}

// Registry is the static list of all supported diagram types.
var Registry = []TypeInfo{
	{
		Type:        models.DiagramTypeArchitecture,
		Name:        "Architecture Diagram",
		Description: "System architecture with services, datastores, brokers, and infrastructure components.",
		Category:    "Architecture",
	},
	{
		Type:        models.DiagramTypeSequence,
		Name:        "Sequence Diagram",
		Description: "Interaction between actors and systems over time using lifelines and messages.",
		Category:    "UML",
	},
	{
		Type:        models.DiagramTypeClass,
		Name:        "Class Diagram",
		Description: "Object-oriented class structure with attributes, methods, and relationships.",
		Category:    "UML",
	},
	{
		Type:        models.DiagramTypeER,
		Name:        "Entity-Relationship Diagram",
		Description: "Database schema with entities, attributes, and relationships (1:1, 1:N, M:N).",
		Category:    "Data",
	},
	{
		Type:        models.DiagramTypeFlowchart,
		Name:        "Flowchart",
		Description: "Process flow with decisions, actions, terminals, and connectors.",
		Category:    "General",
	},
	{
		Type:        models.DiagramTypeNetwork,
		Name:        "Network Diagram",
		Description: "Network topology with routers, switches, firewalls, servers, and subnets.",
		Category:    "Infrastructure",
	},
	{
		Type:        models.DiagramTypePlatform,
		Name:        "Platform Diagram",
		Description: "Cloud platform layout with regions, VPCs, availability zones, and managed services.",
		Category:    "Infrastructure",
	},
	{
		Type:        models.DiagramTypeStateMachine,
		Name:        "State Machine Diagram",
		Description: "State transitions with initial/final states, fork/join, and guard conditions.",
		Category:    "UML",
	},
	{
		Type:        models.DiagramTypeActivity,
		Name:        "Activity Diagram",
		Description: "Business process or workflow with actions, decisions, forks, and swim lanes.",
		Category:    "UML",
	},
	{
		Type:        models.DiagramTypeComponent,
		Name:        "Component Diagram",
		Description: "Software components with interfaces, ports, and dependency relationships.",
		Category:    "UML",
	},
	{
		Type:        models.DiagramTypeDeployment,
		Name:        "Deployment Diagram",
		Description: "Physical deployment of software artifacts onto nodes and execution environments.",
		Category:    "UML",
	},
	{
		Type:        models.DiagramTypeUseCase,
		Name:        "Use Case Diagram",
		Description: "System functionality from user perspective with actors, use cases, and a system boundary.",
		Category:    "UML",
	},
}
