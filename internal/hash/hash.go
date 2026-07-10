// Package hash provides content-addressing helpers for diagram snapshots.
package hash

import (
	"crypto/sha256"
	"fmt"
)

// Content computes a deterministic SHA-256 hex digest from the combined
// nodes and edges JSON strings. Used to detect unchanged commits and as
// the content_hash column value in the commits table.
func Content(nodesJSON, edgesJSON string) string {
	h := sha256.New()
	h.Write([]byte(nodesJSON))
	h.Write([]byte(edgesJSON))
	return fmt.Sprintf("%x", h.Sum(nil))
}
