# ── Stage 1: Build frontend ───────────────────────────────────────────
FROM node:20-alpine AS frontend
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci --prefer-offline
COPY web/ ./
RUN npm run build

# ── Stage 2: Build Go binary ──────────────────────────────────────────
FROM golang:1.25-alpine AS backend
WORKDIR /app
# Fetch dependencies first (cached layer)
COPY go.mod go.sum ./
RUN go mod download
# Copy source + compiled frontend
COPY . .
COPY --from=frontend /app/web/dist ./web/dist
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /seyhoun ./cmd
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /seyhoun-migrate ./cmd/migrate

# ── Stage 3: Minimal runtime image ───────────────────────────────────
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=backend /seyhoun /usr/local/bin/seyhoun
COPY --from=backend /seyhoun-migrate /usr/local/bin/seyhoun-migrate
COPY --from=backend /app/migrations ./migrations
COPY --from=backend /app/config.example.yml ./config.example.yml
COPY --from=backend /app/web/dist ./web/dist
EXPOSE 1374
ENTRYPOINT ["seyhoun"]
