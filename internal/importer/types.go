package importer

import "encoding/json"

// ImportResult is the stateless output of any importer — a list of nodes and edges
// ready to be loaded into the React Flow canvas.
type ImportResult struct {
	Nodes []json.RawMessage `json:"nodes"`
	Edges []json.RawMessage `json:"edges"`
}

// TemplateInfo describes a built-in template available for selection.
type TemplateInfo struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Category    string `json:"category"`
	NodeCount   int    `json:"nodeCount"`
}
