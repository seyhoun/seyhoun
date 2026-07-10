package importer

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const sampleCompose = `
version: "3.8"
services:
  api:
    image: myapp:latest
    depends_on:
      - postgres
      - redis
  postgres:
    image: postgres:15
  redis:
    image: redis:7
volumes:
  pgdata:
`

func TestFromCompose_services(t *testing.T) {
	result, err := FromCompose([]byte(sampleCompose))
	require.NoError(t, err)

	// 3 services + 1 volume node
	assert.Len(t, result.Nodes, 4)
}

func TestFromCompose_edges(t *testing.T) {
	result, err := FromCompose([]byte(sampleCompose))
	require.NoError(t, err)
	// api depends_on postgres and redis → 2 edges
	assert.Len(t, result.Edges, 2)
}

func TestFromCompose_techInference(t *testing.T) {
	result, err := FromCompose([]byte(sampleCompose))
	require.NoError(t, err)

	// Find the postgres node and verify technology
	for _, raw := range result.Nodes {
		var n rfNode
		require.NoError(t, json.Unmarshal(raw, &n))
		if n.Data.Label == "postgres" {
			assert.Equal(t, "postgresql", n.Data.Technology)
			assert.Equal(t, "datastore", n.Data.Category)
		}
		if n.Data.Label == "redis" {
			assert.Equal(t, "redis", n.Data.Technology)
		}
	}
}

func TestFromCompose_invalidYAML(t *testing.T) {
	// Tabs in YAML indentation cause a parse error in strict mode
	_, err := FromCompose([]byte("services:\n\t  bad_indent: true"))
	assert.Error(t, err)
}

func TestFromCompose_emptyCompose(t *testing.T) {
	result, err := FromCompose([]byte("services: {}"))
	require.NoError(t, err)
	assert.Empty(t, result.Nodes)
	assert.Empty(t, result.Edges)
}
