package migrations

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"fmt"
	"regexp"
	"strings"

	"github.com/google/uuid"
)

var nonAlphanumRe = regexp.MustCompile(`[^a-z0-9-]+`)

func makeSlug(email string) string {
	local := strings.SplitN(email, "@", 2)[0]
	slug := strings.ToLower(local)
	slug = nonAlphanumRe.ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")
	if slug == "" {
		slug = uuid.New().String()[:8]
	}
	return slug
}

func uniqueSlug(ctx context.Context, db *sql.DB, base string) (string, error) {
	slug := base
	for i := 2; ; i++ {
		var count int
		if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM workspaces WHERE slug = $1`, slug).Scan(&count); err != nil {
			return "", err
		}
		if count == 0 {
			return slug, nil
		}
		slug = fmt.Sprintf("%s-%d", base, i)
	}
}

func hashContent(nodesJSON, edgesJSON string) string {
	h := sha256.New()
	h.Write([]byte(nodesJSON))
	h.Write([]byte(edgesJSON))
	return fmt.Sprintf("%x", h.Sum(nil))
}
