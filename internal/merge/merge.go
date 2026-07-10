// Package merge implements the three-way merge strategy for diagram branches.
//
// Merge strategies:
//  1. Fast-forward: if the target branch's HEAD is an ancestor of the source
//     branch's HEAD (target has no new commits since the fork), simply advance
//     the target's HeadCommitID to the source's HeadCommitID.
//  2. Three-way merge: find the common ancestor commit, apply non-conflicting
//     changes from both branches, and detect conflicts at the node/edge level.
package merge

import (
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"seyhoun/internal/diff"
	"seyhoun/internal/hash"
	"seyhoun/internal/models"
)

// Result is returned by Merge and describes the outcome.
type Result struct {
	Strategy    string          `json:"strategy"`             // "fast_forward" or "three_way"
	MergeCommit *models.Commit  `json:"mergeCommit,omitempty"` // set when strategy == "three_way"
	Conflicts   []diff.Conflict `json:"conflicts,omitempty"`
}

// IsFastForward reports whether targetCommitID is a direct ancestor of
// sourceCommitID by walking the ParentID chain.
func IsFastForward(db *gorm.DB, sourceCommitID, targetCommitID string) (bool, error) {
	if sourceCommitID == targetCommitID {
		return true, nil
	}
	if targetCommitID == "" {
		// Target has no commits — trivially fast-forwardable.
		return true, nil
	}

	// Walk the source branch's parent chain looking for targetCommitID.
	current := sourceCommitID
	for current != "" {
		if current == targetCommitID {
			return true, nil
		}
		var c models.Commit
		if err := db.Select("parent_id").First(&c, "id = ?", current).Error; err != nil {
			return false, err
		}
		current = c.ParentID
	}
	return false, nil
}

// Merge performs either a fast-forward or three-way merge of sourceBranch into
// targetBranch. If there are conflicts, the merge is aborted and Result.Conflicts
// is non-empty. Must be called inside an existing transaction.
func Merge(tx *gorm.DB, sourceBranch, targetBranch *models.Branch, authorID, message string) (*Result, error) {
	// ── Fast-forward check ───────────────────────────────────────────────────
	ff, err := IsFastForward(tx, sourceBranch.HeadCommitID, targetBranch.HeadCommitID)
	if err != nil {
		return nil, fmt.Errorf("fast-forward check: %w", err)
	}

	if ff {
		// Just advance the target branch HEAD with optimistic locking.
		result := tx.Model(&models.Branch{}).
			Where("id = ? AND head_commit_id = ?", targetBranch.ID, targetBranch.HeadCommitID).
			Update("head_commit_id", sourceBranch.HeadCommitID)
		if result.Error != nil {
			return nil, result.Error
		}
		if result.RowsAffected == 0 {
			return nil, fmt.Errorf("concurrent modification: target branch HEAD changed during merge")
		}
		return &Result{Strategy: "fast_forward"}, nil
	}

	// ── Three-way merge ──────────────────────────────────────────────────────
	// The common ancestor is stored as BaseCommitID on the source branch (the
	// commit it was forked at). If BaseCommitID is empty, use an empty snapshot.
	var baseCommit models.Commit
	if sourceBranch.BaseCommitID != "" {
		if err := tx.First(&baseCommit, "id = ?", sourceBranch.BaseCommitID).Error; err != nil {
			return nil, fmt.Errorf("load base commit: %w", err)
		}
	} else {
		baseCommit = models.Commit{NodesJSON: "[]", EdgesJSON: "[]"}
	}

	var srcCommit models.Commit
	if err := tx.First(&srcCommit, "id = ?", sourceBranch.HeadCommitID).Error; err != nil {
		return nil, fmt.Errorf("load source commit: %w", err)
	}

	var tgtCommit models.Commit
	if err := tx.First(&tgtCommit, "id = ?", targetBranch.HeadCommitID).Error; err != nil {
		return nil, fmt.Errorf("load target commit: %w", err)
	}

	mergedNodes, mergedEdges, conflicts, err := diff.ThreeWayMerge(
		baseCommit.NodesJSON, baseCommit.EdgesJSON,
		srcCommit.NodesJSON, srcCommit.EdgesJSON,
		tgtCommit.NodesJSON, tgtCommit.EdgesJSON,
	)
	if err != nil {
		return nil, fmt.Errorf("three-way merge: %w", err)
	}

	if len(conflicts) > 0 {
		return &Result{Strategy: "three_way", Conflicts: conflicts}, nil
	}

	// Serialize merged content back to JSON strings.
	nodesJSON, err := marshalArray(mergedNodes)
	if err != nil {
		return nil, fmt.Errorf("marshal merged nodes: %w", err)
	}
	edgesJSON, err := marshalArray(mergedEdges)
	if err != nil {
		return nil, fmt.Errorf("marshal merged edges: %w", err)
	}

	if message == "" {
		message = fmt.Sprintf("Merge branch '%s' into '%s'", sourceBranch.Name, targetBranch.Name)
	}

	mergeCommit := &models.Commit{
		ID:          uuid.New().String(),
		DiagramID:   targetBranch.DiagramID,
		BranchID:    targetBranch.ID,
		ParentID:    targetBranch.HeadCommitID,
		AuthorID:    authorID,
		Message:     message,
		NodesJSON:   nodesJSON,
		EdgesJSON:   edgesJSON,
		Viewport:    tgtCommit.Viewport,
		PumlSource:  tgtCommit.PumlSource,
		ContentHash: hash.Content(nodesJSON, edgesJSON),
	}
	if err := tx.Create(mergeCommit).Error; err != nil {
		return nil, fmt.Errorf("create merge commit: %w", err)
	}

	// Advance the target branch HEAD with optimistic locking.
	result := tx.Model(&models.Branch{}).
		Where("id = ? AND head_commit_id = ?", targetBranch.ID, targetBranch.HeadCommitID).
		Update("head_commit_id", mergeCommit.ID)
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, fmt.Errorf("concurrent modification: target branch HEAD changed during merge")
	}

	return &Result{Strategy: "three_way", MergeCommit: mergeCommit}, nil
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func marshalArray(items []json.RawMessage) (string, error) {
	if len(items) == 0 {
		return "[]", nil
	}
	b, err := json.Marshal(items)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

