package importer

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAllTemplates(t *testing.T) {
	templates := AllTemplates()
	assert.Len(t, templates, 4)
	for _, tpl := range templates {
		assert.NotEmpty(t, tpl.ID)
		assert.NotEmpty(t, tpl.Name)
		assert.Greater(t, tpl.NodeCount, 0)
	}
}

func TestGetTemplate_microservices(t *testing.T) {
	result, err := GetTemplate("microservices")
	require.NoError(t, err)
	assert.Len(t, result.Nodes, 7)
}

func TestGetTemplate_dataPipeline(t *testing.T) {
	result, err := GetTemplate("data-pipeline")
	require.NoError(t, err)
	assert.Len(t, result.Nodes, 7)
}

func TestGetTemplate_eventDriven(t *testing.T) {
	result, err := GetTemplate("event-driven")
	require.NoError(t, err)
	assert.Len(t, result.Nodes, 8)
}

func TestGetTemplate_webApp(t *testing.T) {
	result, err := GetTemplate("web-app")
	require.NoError(t, err)
	assert.Len(t, result.Nodes, 7)
}

func TestGetTemplate_unknown(t *testing.T) {
	_, err := GetTemplate("does-not-exist")
	assert.Error(t, err)
}

func TestGetTemplate_nodeCountMatchesInfo(t *testing.T) {
	for _, info := range AllTemplates() {
		result, err := GetTemplate(info.ID)
		require.NoError(t, err, "template %s", info.ID)
		assert.Len(t, result.Nodes, info.NodeCount, "template %s node count mismatch", info.ID)
	}
}
