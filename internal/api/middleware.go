package api

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
	"seyhoun/internal/models"
)

type contextKey string

const userIDKey contextKey = "userID"

// RequireAuth returns a middleware that validates the Bearer JWT in the
// Authorization header and injects the user ID into the request context.
func RequireAuth(jwtSecret string) func(http.Handler) http.Handler {
	secret := []byte(jwtSecret)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if !strings.HasPrefix(authHeader, "Bearer ") {
				writeError(w, 401, "missing or invalid authorization header")
				return
			}
			tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

			token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return secret, nil
			})
			if err != nil || !token.Valid {
				writeError(w, 401, "invalid or expired token")
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				writeError(w, 401, "malformed token claims")
				return
			}
			userID, _ := claims["sub"].(string)
			if userID == "" {
				writeError(w, 401, "token missing subject")
				return
			}

			ctx := context.WithValue(r.Context(), userIDKey, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// UserIDFromContext returns the authenticated user's ID from the context.
// Returns empty string if not set (unauthenticated request).
func UserIDFromContext(ctx context.Context) string {
	v, _ := ctx.Value(userIDKey).(string)
	return v
}

// ContextWithUserID returns a new context with the given user ID set.
// Used in tests to simulate an authenticated request without a real JWT.
func ContextWithUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, userIDKey, userID)
}

// RequireAdmin returns a middleware that ensures the authenticated user has
// IsAdmin = true in the database. Must be used after RequireAuth.
func RequireAdmin(db *gorm.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID := UserIDFromContext(r.Context())
			if userID == "" {
				writeError(w, 401, "authentication required")
				return
			}
			var user models.User
			if err := db.Select("is_admin").First(&user, "id = ?", userID).Error; err != nil {
				writeError(w, 401, "user not found")
				return
			}
			if !user.IsAdmin {
				writeError(w, 403, "admin access required")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
