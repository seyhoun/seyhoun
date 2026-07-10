package importer

import (
	"encoding/json"
	"fmt"
)

// seyhounExport mirrors the JSON structure produced by DiagramHandler.Export.
type seyhounExport struct {
	Format string `json:"format"`
	Diagram struct {
		NodesJSON string `json:"nodesJson"`
		EdgesJSON string `json:"edgesJson"`
	} `json:"diagram"`
}

// FromJSON parses a Seyhoun-native export file and returns an ImportResult.
func FromJSON(data []byte) (*ImportResult, error) {
	var export seyhounExport
	if err := json.Unmarshal(data, &export); err != nil {
		return nil, fmt.Errorf("invalid JSON: %w", err)
	}
	if export.Format != "seyhoun-v1" && export.Format != "seyhoun-v2" {
		return nil, fmt.Errorf("unsupported format %q (expected seyhoun-v1 or seyhoun-v2)", export.Format)
	}

	nodes, err := parseRawArray(export.Diagram.NodesJSON)
	if err != nil {
		return nil, fmt.Errorf("parsing nodes: %w", err)
	}
	edges, err := parseRawArray(export.Diagram.EdgesJSON)
	if err != nil {
		return nil, fmt.Errorf("parsing edges: %w", err)
	}

	return &ImportResult{Nodes: nodes, Edges: edges}, nil
}

// parseRawArray deserialises a JSON array string into individual raw messages.
func parseRawArray(s string) ([]json.RawMessage, error) {
	if s == "" {
		return []json.RawMessage{}, nil
	}
	var items []json.RawMessage
	if err := json.Unmarshal([]byte(s), &items); err != nil {
		return nil, err
	}
	return items, nil
}
