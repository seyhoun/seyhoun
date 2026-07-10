package importer

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFromJSON_valid(t *testing.T) {
	export := map[string]interface{}{
		"format":    "seyhoun-v1",
		"exportedAt": "2024-01-01T00:00:00Z",
		"diagram": map[string]interface{}{
			"nodesJson": `[{"id":"1","type":"arch","position":{"x":0,"y":0},"data":{"label":"DB","technology":"postgresql","category":"datastore"}}]`,
			"edgesJson": `[{"id":"e1","source":"1","target":"2","data":{}}]`,
		},
	}
	data, _ := json.Marshal(export)

	result, err := FromJSON(data)
	require.NoError(t, err)
	assert.Len(t, result.Nodes, 1)
	assert.Len(t, result.Edges, 1)
}

func TestFromJSON_wrongFormat(t *testing.T) {
	export := map[string]interface{}{
		"format":  "other-format",
		"diagram": map[string]interface{}{"nodesJson": "[]", "edgesJson": "[]"},
	}
	data, _ := json.Marshal(export)
	_, err := FromJSON(data)
	assert.ErrorContains(t, err, "unsupported format")
}

func TestFromJSON_invalidJSON(t *testing.T) {
	_, err := FromJSON([]byte("not json"))
	assert.Error(t, err)
}

func TestFromJSON_emptyDiagram(t *testing.T) {
	export := map[string]interface{}{
		"format":  "seyhoun-v1",
		"diagram": map[string]interface{}{"nodesJson": "", "edgesJson": ""},
	}
	data, _ := json.Marshal(export)
	result, err := FromJSON(data)
	require.NoError(t, err)
	assert.Empty(t, result.Nodes)
	assert.Empty(t, result.Edges)
}
