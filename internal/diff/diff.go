// Package diff computes structural diffs between two diagram snapshots.
// Unlike line-based text diffs, diagram diffs operate at the node and edge level,
// making them meaningful and conflict-detectable during merges.
package diff

import (
	"encoding/json"
	"fmt"
)

// ─── Output types ─────────────────────────────────────────────────────────────

// NodeChange represents a change to a single node.
type NodeChange struct {
	ID     string          `json:"id"`
	Before json.RawMessage `json:"before,omitempty"` // nil for additions
	After  json.RawMessage `json:"after,omitempty"`  // nil for removals
}

// EdgeChange represents a change to a single edge.
type EdgeChange struct {
	ID     string          `json:"id"`
	Before json.RawMessage `json:"before,omitempty"`
	After  json.RawMessage `json:"after,omitempty"`
}

// Result is the complete diff between two commit snapshots.
type Result struct {
	AddedNodes    []NodeChange `json:"addedNodes"`
	RemovedNodes  []NodeChange `json:"removedNodes"`
	ModifiedNodes []NodeChange `json:"modifiedNodes"`
	AddedEdges    []EdgeChange `json:"addedEdges"`
	RemovedEdges  []EdgeChange `json:"removedEdges"`
	ModifiedEdges []EdgeChange `json:"modifiedEdges"`
}

// IsEmpty returns true when there are no changes.
func (r *Result) IsEmpty() bool {
	return len(r.AddedNodes) == 0 && len(r.RemovedNodes) == 0 && len(r.ModifiedNodes) == 0 &&
		len(r.AddedEdges) == 0 && len(r.RemovedEdges) == 0 && len(r.ModifiedEdges) == 0
}

// ─── Conflict types ───────────────────────────────────────────────────────────

// ConflictKind describes what kind of merge conflict occurred.
type ConflictKind string

const (
	// ConflictBothModified: same node/edge modified differently in both branches.
	ConflictBothModified ConflictKind = "both_modified"
	// ConflictDeleteModify: one branch deleted a node/edge that the other modified.
	ConflictDeleteModify ConflictKind = "delete_modify"
)

// Conflict represents a single merge conflict.
type Conflict struct {
	Kind       ConflictKind    `json:"kind"`
	EntityType string          `json:"entityType"` // "node" or "edge"
	ID         string          `json:"id"`
	Base       json.RawMessage `json:"base"`   // common ancestor version
	Ours       json.RawMessage `json:"ours"`   // source branch version
	Theirs     json.RawMessage `json:"theirs"` // target branch version
}

// ─── Core functions ───────────────────────────────────────────────────────────

// parseNodes decodes a NodesJSON string into a map keyed by node ID.
// The raw full-node JSON is stored for comparison.
func parseNodes(nodesJSON string) (map[string]json.RawMessage, error) {
	var raw []json.RawMessage
	if err := json.Unmarshal([]byte(nodesJSON), &raw); err != nil {
		return nil, fmt.Errorf("parse nodes: %w", err)
	}
	m := make(map[string]json.RawMessage, len(raw))
	for _, item := range raw {
		var n struct {
			ID string `json:"id"`
		}
		if err := json.Unmarshal(item, &n); err != nil || n.ID == "" {
			continue
		}
		m[n.ID] = item
	}
	return m, nil
}

// parseEdges decodes an EdgesJSON string into a map keyed by edge ID.
func parseEdges(edgesJSON string) (map[string]json.RawMessage, error) {
	var raw []json.RawMessage
	if err := json.Unmarshal([]byte(edgesJSON), &raw); err != nil {
		return nil, fmt.Errorf("parse edges: %w", err)
	}
	m := make(map[string]json.RawMessage, len(raw))
	for _, item := range raw {
		var e struct {
			ID string `json:"id"`
		}
		if err := json.Unmarshal(item, &e); err != nil || e.ID == "" {
			continue
		}
		m[e.ID] = item
	}
	return m, nil
}

// Diff computes the structural diff between two diagram snapshots.
// fromNodesJSON/fromEdgesJSON are the "before" state; toNodesJSON/toEdgesJSON are "after".
func Diff(fromNodesJSON, fromEdgesJSON, toNodesJSON, toEdgesJSON string) (*Result, error) {
	fromNodes, err := parseNodes(fromNodesJSON)
	if err != nil {
		return nil, err
	}
	toNodes, err := parseNodes(toNodesJSON)
	if err != nil {
		return nil, err
	}
	fromEdges, err := parseEdges(fromEdgesJSON)
	if err != nil {
		return nil, err
	}
	toEdges, err := parseEdges(toEdgesJSON)
	if err != nil {
		return nil, err
	}

	result := &Result{}

	// Node diff
	for id, after := range toNodes {
		if before, exists := fromNodes[id]; exists {
			if string(before) != string(after) {
				result.ModifiedNodes = append(result.ModifiedNodes, NodeChange{ID: id, Before: before, After: after})
			}
		} else {
			result.AddedNodes = append(result.AddedNodes, NodeChange{ID: id, After: after})
		}
	}
	for id, before := range fromNodes {
		if _, exists := toNodes[id]; !exists {
			result.RemovedNodes = append(result.RemovedNodes, NodeChange{ID: id, Before: before})
		}
	}

	// Edge diff
	for id, after := range toEdges {
		if before, exists := fromEdges[id]; exists {
			if string(before) != string(after) {
				result.ModifiedEdges = append(result.ModifiedEdges, EdgeChange{ID: id, Before: before, After: after})
			}
		} else {
			result.AddedEdges = append(result.AddedEdges, EdgeChange{ID: id, After: after})
		}
	}
	for id, before := range fromEdges {
		if _, exists := toEdges[id]; !exists {
			result.RemovedEdges = append(result.RemovedEdges, EdgeChange{ID: id, Before: before})
		}
	}

	return result, nil
}

// ThreeWayMerge applies changes from source into target, relative to base.
// Returns the merged node/edge maps and any conflicts detected.
// If conflicts is non-empty, the merge should be rejected.
func ThreeWayMerge(
	baseNodesJSON, baseEdgesJSON string,
	srcNodesJSON, srcEdgesJSON string,
	tgtNodesJSON, tgtEdgesJSON string,
) (mergedNodes []json.RawMessage, mergedEdges []json.RawMessage, conflicts []Conflict, err error) {

	baseNodes, err := parseNodes(baseNodesJSON)
	if err != nil {
		return nil, nil, nil, err
	}
	srcNodes, err := parseNodes(srcNodesJSON)
	if err != nil {
		return nil, nil, nil, err
	}
	tgtNodes, err := parseNodes(tgtNodesJSON)
	if err != nil {
		return nil, nil, nil, err
	}
	baseEdges, err := parseEdges(baseEdgesJSON)
	if err != nil {
		return nil, nil, nil, err
	}
	srcEdges, err := parseEdges(srcEdgesJSON)
	if err != nil {
		return nil, nil, nil, err
	}
	tgtEdges, err := parseEdges(tgtEdgesJSON)
	if err != nil {
		return nil, nil, nil, err
	}

	// Collect all node IDs across all three snapshots.
	allNodeIDs := make(map[string]struct{})
	for id := range baseNodes {
		allNodeIDs[id] = struct{}{}
	}
	for id := range srcNodes {
		allNodeIDs[id] = struct{}{}
	}
	for id := range tgtNodes {
		allNodeIDs[id] = struct{}{}
	}

	resultNodes := make(map[string]json.RawMessage)

	for id := range allNodeIDs {
		base, inBase := baseNodes[id]
		src, inSrc := srcNodes[id]
		tgt, inTgt := tgtNodes[id]

		srcChanged := inBase != inSrc || (inBase && inSrc && string(base) != string(src))
		tgtChanged := inBase != inTgt || (inBase && inTgt && string(base) != string(tgt))
		srcDeleted := inBase && !inSrc
		tgtDeleted := inBase && !inTgt

		switch {
		case !srcChanged && !tgtChanged:
			// No change in either branch — keep target version (identical to base).
			if inTgt {
				resultNodes[id] = tgt
			}

		case srcChanged && !tgtChanged:
			// Only source changed — take source version.
			if !srcDeleted {
				resultNodes[id] = src
			}

		case !srcChanged && tgtChanged:
			// Only target changed — keep target version (already in result map).
			if inTgt {
				resultNodes[id] = tgt
			}

		default:
			// Both changed — check for conflict.
			if srcDeleted && tgtDeleted {
				// Both deleted — no conflict, node is gone.
			} else if srcDeleted {
				// Source deleted, target modified.
				conflicts = append(conflicts, Conflict{
					Kind:       ConflictDeleteModify,
					EntityType: "node",
					ID:         id,
					Base:       base,
					Ours:       nil,
					Theirs:     tgt,
				})
			} else if tgtDeleted {
				// Target deleted, source modified.
				conflicts = append(conflicts, Conflict{
					Kind:       ConflictDeleteModify,
					EntityType: "node",
					ID:         id,
					Base:       base,
					Ours:       src,
					Theirs:     nil,
				})
			} else if string(src) == string(tgt) {
				// Both modified to identical state — no conflict, keep either.
				resultNodes[id] = src
			} else {
				// Genuine conflict.
				conflicts = append(conflicts, Conflict{
					Kind:       ConflictBothModified,
					EntityType: "node",
					ID:         id,
					Base:       base,
					Ours:       src,
					Theirs:     tgt,
				})
				// Still insert target version as placeholder (not used if conflicts > 0).
				resultNodes[id] = tgt
			}
		}
	}

	// Edge merge (same logic)
	allEdgeIDs := make(map[string]struct{})
	for id := range baseEdges {
		allEdgeIDs[id] = struct{}{}
	}
	for id := range srcEdges {
		allEdgeIDs[id] = struct{}{}
	}
	for id := range tgtEdges {
		allEdgeIDs[id] = struct{}{}
	}

	resultEdges := make(map[string]json.RawMessage)

	for id := range allEdgeIDs {
		base, inBase := baseEdges[id]
		src, inSrc := srcEdges[id]
		tgt, inTgt := tgtEdges[id]

		srcChanged := inBase != inSrc || (inBase && inSrc && string(base) != string(src))
		tgtChanged := inBase != inTgt || (inBase && inTgt && string(base) != string(tgt))
		srcDeleted := inBase && !inSrc
		tgtDeleted := inBase && !inTgt

		switch {
		case !srcChanged && !tgtChanged:
			if inTgt {
				resultEdges[id] = tgt
			}
		case srcChanged && !tgtChanged:
			if !srcDeleted {
				resultEdges[id] = src
			}
		case !srcChanged && tgtChanged:
			if inTgt {
				resultEdges[id] = tgt
			}
		default:
			if srcDeleted && tgtDeleted {
				// Both deleted.
			} else if srcDeleted {
				conflicts = append(conflicts, Conflict{
					Kind:       ConflictDeleteModify,
					EntityType: "edge",
					ID:         id,
					Base:       base,
					Ours:       nil,
					Theirs:     tgt,
				})
			} else if tgtDeleted {
				conflicts = append(conflicts, Conflict{
					Kind:       ConflictDeleteModify,
					EntityType: "edge",
					ID:         id,
					Base:       base,
					Ours:       src,
					Theirs:     nil,
				})
			} else if string(src) == string(tgt) {
				resultEdges[id] = src
			} else {
				conflicts = append(conflicts, Conflict{
					Kind:       ConflictBothModified,
					EntityType: "edge",
					ID:         id,
					Base:       base,
					Ours:       src,
					Theirs:     tgt,
				})
				resultEdges[id] = tgt
			}
		}
	}

	// Convert result maps back to slices.
	for _, n := range resultNodes {
		mergedNodes = append(mergedNodes, n)
	}
	for _, e := range resultEdges {
		mergedEdges = append(mergedEdges, e)
	}

	return mergedNodes, mergedEdges, conflicts, nil
}
