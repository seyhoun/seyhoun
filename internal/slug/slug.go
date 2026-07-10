// Package slug generates URL-safe slugs from email addresses or arbitrary strings
// and handles uniqueness across a GORM database table.
package slug

import (
	"regexp"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var nonAlphanumRe = regexp.MustCompile(`[^a-z0-9-]+`)

// FromEmail derives a slug from the local part of an email address.
// The result is lowercase, alphanumeric-and-hyphen only, with leading/trailing
// hyphens stripped. Falls back to a random 8-character UUID segment when the
// local part produces an empty slug.
func FromEmail(email string) string {
	local := strings.SplitN(email, "@", 2)[0]
	s := strings.ToLower(local)
	s = nonAlphanumRe.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		s = uuid.New().String()[:8]
	}
	return s
}

// Unique returns a slug derived from email that does not already exist in the
// given table column. It appends a short random suffix until a free value is found.
// The model parameter is any GORM model struct that maps to the target table.
func Unique(db *gorm.DB, model any, column, email string) (string, error) {
	base := FromEmail(email)
	candidate := base
	for {
		var count int64
		if err := db.Model(model).Where(column+" = ?", candidate).Count(&count).Error; err != nil {
			return "", err
		}
		if count == 0 {
			return candidate, nil
		}
		candidate = base + "-" + uuid.New().String()[:4]
	}
}
