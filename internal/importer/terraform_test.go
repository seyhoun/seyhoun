package importer

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const sampleTerraform = `
resource "aws_db_instance" "main_db" {
  engine = "postgres"
}

resource "aws_lambda_function" "api_handler" {
  function_name = "my-api"
}

resource "aws_s3_bucket" "assets" {
  bucket = "my-assets"
}

resource "aws_sqs_queue" "jobs" {
  name = "job-queue"
}

resource "aws_api_gateway_rest_api" "gateway" {
  name = "my-gateway"
}
`

func TestFromTerraform_resourceCount(t *testing.T) {
	result, err := FromTerraform([]byte(sampleTerraform))
	require.NoError(t, err)
	assert.Len(t, result.Nodes, 5)
	assert.Empty(t, result.Edges) // no edges inferred from .tf
}

func TestFromTerraform_techMapping(t *testing.T) {
	result, err := FromTerraform([]byte(sampleTerraform))
	require.NoError(t, err)

	techMap := make(map[string]string)
	for _, raw := range result.Nodes {
		var n rfNode
		require.NoError(t, json.Unmarshal(raw, &n))
		techMap[n.Data.Description] = n.Data.Technology
	}

	assert.Equal(t, "postgresql", techMap["aws_db_instance"])
	assert.Equal(t, "microservice", techMap["aws_lambda_function"])
	assert.Equal(t, "s3", techMap["aws_s3_bucket"])
	assert.Equal(t, "sqs", techMap["aws_sqs_queue"])
	assert.Equal(t, "api-gateway", techMap["aws_api_gateway_rest_api"])
}

func TestFromTerraform_humanName(t *testing.T) {
	assert.Equal(t, "Main Db", humanName("main_db"))
	assert.Equal(t, "Api Handler", humanName("api_handler"))
}

func TestFromTerraform_emptyFile(t *testing.T) {
	result, err := FromTerraform([]byte(""))
	require.NoError(t, err)
	assert.Empty(t, result.Nodes)
}

func TestFromTerraform_noDuplicates(t *testing.T) {
	tf := `
resource "aws_s3_bucket" "assets" {}
resource "aws_s3_bucket" "assets" {}
`
	result, err := FromTerraform([]byte(tf))
	require.NoError(t, err)
	assert.Len(t, result.Nodes, 1)
}
