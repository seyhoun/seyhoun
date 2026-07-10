package diff_test

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"seyhoun/internal/diff"
)

// ── helpers ────────────────────────────────────────────────────────────────────

func nodes(ids ...string) string {
	items := make([]map[string]string, len(ids))
	for i, id := range ids {
		items[i] = map[string]string{"id": id, "type": "default"}
	}
	b, _ := json.Marshal(items)
	return string(b)
}

func nodesWithLabel(pairs ...string) string {
	var items []map[string]string
	for i := 0; i < len(pairs); i += 2 {
		items = append(items, map[string]string{"id": pairs[i], "label": pairs[i+1]})
	}
	b, _ := json.Marshal(items)
	return string(b)
}

func edges(ids ...string) string {
	items := make([]map[string]string, len(ids))
	for i, id := range ids {
		items[i] = map[string]string{"id": id, "source": "a", "target": "b"}
	}
	b, _ := json.Marshal(items)
	return string(b)
}

const emptyArr = "[]"

// ── Diff tests ─────────────────────────────────────────────────────────────────

func TestDiff_Identical(t *testing.T) {
	n := nodes("n1", "n2")
	e := edges("e1")
	r, err := diff.Diff(n, e, n, e)
	require.NoError(t, err)
	assert.True(t, r.IsEmpty())
}

func TestDiff_NodeAdded(t *testing.T) {
	r, err := diff.Diff(nodes("n1"), emptyArr, nodes("n1", "n2"), emptyArr)
	require.NoError(t, err)
	require.Len(t, r.AddedNodes, 1)
	assert.Equal(t, "n2", r.AddedNodes[0].ID)
	assert.True(t, len(r.RemovedNodes) == 0 && len(r.ModifiedNodes) == 0)
}

func TestDiff_NodeRemoved(t *testing.T) {
	r, err := diff.Diff(nodes("n1", "n2"), emptyArr, nodes("n1"), emptyArr)
	require.NoError(t, err)
	require.Len(t, r.RemovedNodes, 1)
	assert.Equal(t, "n2", r.RemovedNodes[0].ID)
	assert.Nil(t, r.RemovedNodes[0].After)
}

func TestDiff_NodeModified(t *testing.T) {
	before := nodesWithLabel("n1", "old")
	after := nodesWithLabel("n1", "new")
	r, err := diff.Diff(before, emptyArr, after, emptyArr)
	require.NoError(t, err)
	require.Len(t, r.ModifiedNodes, 1)
	assert.Equal(t, "n1", r.ModifiedNodes[0].ID)
	assert.NotNil(t, r.ModifiedNodes[0].Before)
	assert.NotNil(t, r.ModifiedNodes[0].After)
}

func TestDiff_EdgeAdded(t *testing.T) {
	r, err := diff.Diff(emptyArr, edges("e1"), emptyArr, edges("e1", "e2"))
	require.NoError(t, err)
	require.Len(t, r.AddedEdges, 1)
	assert.Equal(t, "e2", r.AddedEdges[0].ID)
}

func TestDiff_EdgeRemoved(t *testing.T) {
	r, err := diff.Diff(emptyArr, edges("e1", "e2"), emptyArr, edges("e1"))
	require.NoError(t, err)
	require.Len(t, r.RemovedEdges, 1)
	assert.Equal(t, "e2", r.RemovedEdges[0].ID)
}

func TestDiff_EmptyToEmpty(t *testing.T) {
	r, err := diff.Diff(emptyArr, emptyArr, emptyArr, emptyArr)
	require.NoError(t, err)
	assert.True(t, r.IsEmpty())
}

func TestDiff_InvalidJSON(t *testing.T) {
	_, err := diff.Diff("not-json", emptyArr, emptyArr, emptyArr)
	assert.Error(t, err)
}

// ── ThreeWayMerge tests ────────────────────────────────────────────────────────

func TestThreeWayMerge_NoChanges(t *testing.T) {
	n := nodes("n1")
	e := edges("e1")
	mn, me, conflicts, err := diff.ThreeWayMerge(n, e, n, e, n, e)
	require.NoError(t, err)
	assert.Empty(t, conflicts)
	assert.Len(t, mn, 1)
	assert.Len(t, me, 1)
}

func TestThreeWayMerge_OnlySourceAddsNode(t *testing.T) {
	base := nodes("n1")
	src := nodes("n1", "n2") // source adds n2
	tgt := nodes("n1")       // target unchanged

	mn, _, conflicts, err := diff.ThreeWayMerge(base, emptyArr, src, emptyArr, tgt, emptyArr)
	require.NoError(t, err)
	assert.Empty(t, conflicts)

	ids := nodeIDs(mn)
	assert.Contains(t, ids, "n1")
	assert.Contains(t, ids, "n2")
}

func TestThreeWayMerge_OnlyTargetAddsNode(t *testing.T) {
	base := nodes("n1")
	src := nodes("n1")       // source unchanged
	tgt := nodes("n1", "n2") // target adds n2

	mn, _, conflicts, err := diff.ThreeWayMerge(base, emptyArr, src, emptyArr, tgt, emptyArr)
	require.NoError(t, err)
	assert.Empty(t, conflicts)
	assert.Contains(t, nodeIDs(mn), "n2")
}

func TestThreeWayMerge_BothAddDifferentNodes(t *testing.T) {
	base := nodes("n1")
	src := nodes("n1", "n2") // source adds n2
	tgt := nodes("n1", "n3") // target adds n3

	mn, _, conflicts, err := diff.ThreeWayMerge(base, emptyArr, src, emptyArr, tgt, emptyArr)
	require.NoError(t, err)
	assert.Empty(t, conflicts)
	ids := nodeIDs(mn)
	assert.Contains(t, ids, "n1")
	assert.Contains(t, ids, "n2")
	assert.Contains(t, ids, "n3")
}

func TestThreeWayMerge_ConflictBothModified(t *testing.T) {
	base := nodesWithLabel("n1", "base")
	src := nodesWithLabel("n1", "src-version")
	tgt := nodesWithLabel("n1", "tgt-version")

	_, _, conflicts, err := diff.ThreeWayMerge(base, emptyArr, src, emptyArr, tgt, emptyArr)
	require.NoError(t, err)
	require.Len(t, conflicts, 1)
	assert.Equal(t, diff.ConflictBothModified, conflicts[0].Kind)
	assert.Equal(t, "node", conflicts[0].EntityType)
	assert.Equal(t, "n1", conflicts[0].ID)
}

func TestThreeWayMerge_ConflictDeleteModify(t *testing.T) {
	base := nodes("n1")
	src := emptyArr              // source deletes n1
	tgt := nodesWithLabel("n1", "modified") // target modifies n1

	_, _, conflicts, err := diff.ThreeWayMerge(base, emptyArr, src, emptyArr, tgt, emptyArr)
	require.NoError(t, err)
	require.Len(t, conflicts, 1)
	assert.Equal(t, diff.ConflictDeleteModify, conflicts[0].Kind)
}

func TestThreeWayMerge_BothDeleteSameNode_NoConflict(t *testing.T) {
	base := nodes("n1", "n2")
	src := nodes("n1")  // both delete n2
	tgt := nodes("n1")

	mn, _, conflicts, err := diff.ThreeWayMerge(base, emptyArr, src, emptyArr, tgt, emptyArr)
	require.NoError(t, err)
	assert.Empty(t, conflicts)
	assert.NotContains(t, nodeIDs(mn), "n2")
}

func TestThreeWayMerge_BothModifyToSameValue_NoConflict(t *testing.T) {
	base := nodesWithLabel("n1", "old")
	same := nodesWithLabel("n1", "new")

	_, _, conflicts, err := diff.ThreeWayMerge(base, emptyArr, same, emptyArr, same, emptyArr)
	require.NoError(t, err)
	assert.Empty(t, conflicts)
}

func TestThreeWayMerge_EdgeConflict(t *testing.T) {
	baseE := `[{"id":"e1","label":"base"}]`
	srcE := `[{"id":"e1","label":"src"}]`
	tgtE := `[{"id":"e1","label":"tgt"}]`

	_, _, conflicts, err := diff.ThreeWayMerge(emptyArr, baseE, emptyArr, srcE, emptyArr, tgtE)
	require.NoError(t, err)
	require.Len(t, conflicts, 1)
	assert.Equal(t, "edge", conflicts[0].EntityType)
	assert.Equal(t, diff.ConflictBothModified, conflicts[0].Kind)
}

// ── IsEmpty ───────────────────────────────────────────────────────────────────

func TestIsEmpty_True(t *testing.T) {
	r := &diff.Result{}
	assert.True(t, r.IsEmpty())
}

func TestIsEmpty_False(t *testing.T) {
	r := &diff.Result{AddedNodes: []diff.NodeChange{{ID: "x"}}}
	assert.False(t, r.IsEmpty())
}

// ── helpers ───────────────────────────────────────────────────────────────────

func nodeIDs(raws []json.RawMessage) []string {
	var ids []string
	for _, raw := range raws {
		var n struct{ ID string `json:"id"` }
		if err := json.Unmarshal(raw, &n); err == nil {
			ids = append(ids, n.ID)
		}
	}
	return ids
}
