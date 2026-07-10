package slug_test

import (
	"strings"
	"testing"

	"seyhoun/internal/slug"
)

func TestFromEmail_BasicConversion(t *testing.T) {
	cases := []struct {
		email string
		want  string
	}{
		{"alice@example.com", "alice"},
		{"bob.smith@example.com", "bob-smith"},
		{"UPPER@example.com", "upper"},
		{"user+tag@example.com", "user-tag"},
		{"user.name+tag+sorting@example.com", "user-name-tag-sorting"},
	}
	for _, tc := range cases {
		got := slug.FromEmail(tc.email)
		if got != tc.want {
			t.Errorf("FromEmail(%q) = %q, want %q", tc.email, got, tc.want)
		}
	}
}

func TestFromEmail_NoLeadingOrTrailingHyphens(t *testing.T) {
	// Special characters at the edges of the local part should be stripped
	s := slug.FromEmail(".dotstart@example.com")
	if strings.HasPrefix(s, "-") || strings.HasSuffix(s, "-") {
		t.Errorf("slug %q has leading or trailing hyphen", s)
	}
}

func TestFromEmail_EmptyLocalPart_ReturnsFallback(t *testing.T) {
	// An email whose local part is all special chars produces an empty base,
	// so FromEmail should return a non-empty fallback.
	s := slug.FromEmail("...@example.com")
	if s == "" {
		t.Fatal("expected non-empty fallback for all-special local part")
	}
}

func TestFromEmail_OnlyLowercaseAlphanumericAndHyphens(t *testing.T) {
	emails := []string{
		"Alice.Wonder@example.com",
		"user+tag@example.com",
		"123numbers@example.com",
		"mixed.CASE+extra@sub.example.com",
	}
	for _, e := range emails {
		s := slug.FromEmail(e)
		for _, c := range s {
			ok := (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-'
			if !ok {
				t.Errorf("FromEmail(%q) = %q contains illegal char %q", e, s, c)
			}
		}
	}
}
