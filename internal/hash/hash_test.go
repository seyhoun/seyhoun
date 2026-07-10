package hash_test

import (
	"testing"

	"seyhoun/internal/hash"
)

func TestContent_Deterministic(t *testing.T) {
	h1 := hash.Content(`[{"id":"1"}]`, `[{"id":"e1"}]`)
	h2 := hash.Content(`[{"id":"1"}]`, `[{"id":"e1"}]`)
	if h1 != h2 {
		t.Fatalf("same input produced different hashes: %q vs %q", h1, h2)
	}
}

func TestContent_DifferentInputs(t *testing.T) {
	a := hash.Content(`[{"id":"1"}]`, `[]`)
	b := hash.Content(`[{"id":"2"}]`, `[]`)
	if a == b {
		t.Fatal("different inputs produced the same hash")
	}
}

func TestContent_OrderMatters(t *testing.T) {
	// nodes and edges are not interchangeable
	h1 := hash.Content("nodes", "edges")
	h2 := hash.Content("edges", "nodes")
	if h1 == h2 {
		t.Fatal("swapping nodes and edges should produce a different hash")
	}
}

func TestContent_EmptyInputs(t *testing.T) {
	h := hash.Content("", "")
	if h == "" {
		t.Fatal("empty inputs should still produce a non-empty hash")
	}
	// SHA-256 hex is always 64 characters
	if len(h) != 64 {
		t.Fatalf("expected 64-char hex digest, got %d chars", len(h))
	}
}

func TestContent_HexFormat(t *testing.T) {
	h := hash.Content("nodes", "edges")
	for _, c := range h {
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f')) {
			t.Fatalf("hash contains non-hex character %q in %q", c, h)
		}
	}
}
