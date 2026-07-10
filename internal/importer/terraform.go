package importer

import (
	"bufio"
	"bytes"
	"fmt"
	"regexp"
	"strings"
)

// resourcePattern matches HCL resource block headers: resource "type" "name" {
var resourcePattern = regexp.MustCompile(`^\s*resource\s+"([^"]+)"\s+"([^"]+)"`)

// awsResourceMap maps Terraform resource types to Seyhoun technology + category.
var awsResourceMap = map[string]struct{ tech, cat string }{
	"aws_db_instance":              {"postgresql", "datastore"},
	"aws_rds_cluster":              {"postgresql", "datastore"},
	"aws_dynamodb_table":           {"dynamodb", "datastore"},
	"aws_elasticache_cluster":      {"redis", "datastore"},
	"aws_elasticsearch_domain":     {"elasticsearch", "datastore"},
	"aws_opensearch_domain":        {"elasticsearch", "datastore"},
	"aws_s3_bucket":                {"s3", "storage"},
	"aws_lambda_function":          {"microservice", "service"},
	"aws_api_gateway_rest_api":     {"api-gateway", "infrastructure"},
	"aws_api_gateway_v2_api":       {"api-gateway", "infrastructure"},
	"aws_alb":                      {"load-balancer", "infrastructure"},
	"aws_lb":                       {"load-balancer", "infrastructure"},
	"aws_cloudfront_distribution":  {"cdn", "infrastructure"},
	"aws_kinesis_stream":           {"kinesis", "broker"},
	"aws_kinesis_firehose_delivery_stream": {"kinesis", "broker"},
	"aws_sqs_queue":                {"sqs", "broker"},
	"aws_sns_topic":                {"pubsub", "broker"},
	"aws_msk_cluster":              {"kafka", "broker"},
	"aws_eks_cluster":              {"kubernetes", "infrastructure"},
	"aws_ecs_service":              {"docker", "infrastructure"},
	"aws_ecs_cluster":              {"docker", "infrastructure"},
	"aws_ecr_repository":           {"docker", "infrastructure"},
	"aws_cloudwatch_dashboard":     {"grafana", "monitoring"},
	"aws_secretsmanager_secret":    {"vault", "infrastructure"},
	"aws_kms_key":                  {"vault", "infrastructure"},
	"aws_vpc":                      {"load-balancer", "infrastructure"},
	"aws_instance":                 {"microservice", "service"},

	// GCP
	"google_sql_database_instance": {"postgresql", "datastore"},
	"google_bigtable_instance":     {"cassandra", "datastore"},
	"google_storage_bucket":        {"gcs", "storage"},
	"google_pubsub_topic":          {"pubsub", "broker"},
	"google_container_cluster":     {"kubernetes", "infrastructure"},
	"google_cloudfunctions_function": {"microservice", "service"},
	"google_bigquery_dataset":      {"bigquery", "analytics"},

	// Azure
	"azurerm_sql_server":           {"mysql", "datastore"},
	"azurerm_cosmosdb_account":     {"mongodb", "datastore"},
	"azurerm_storage_account":      {"azure-blob", "storage"},
	"azurerm_servicebus_namespace": {"rabbitmq", "broker"},
	"azurerm_kubernetes_cluster":   {"kubernetes", "infrastructure"},
	"azurerm_function_app":         {"microservice", "service"},
	"azurerm_app_service":          {"application", "service"},
}

// FromTerraform parses a .tf file using basic text scanning and returns an ImportResult.
// It does not require the HCL library — it only looks for resource block headers.
func FromTerraform(data []byte) (*ImportResult, error) {
	var nodes []rfNode
	var edges []rfEdge

	const (
		colW = 220.0
		rowH = 140.0
		cols = 4
	)

	scanner := bufio.NewScanner(bytes.NewReader(data))
	i := 0
	seen := make(map[string]bool)

	for scanner.Scan() {
		line := scanner.Text()
		m := resourcePattern.FindStringSubmatch(line)
		if m == nil {
			continue
		}
		resType := m[1]
		resName := m[2]

		nodeKey := resType + "/" + resName
		if seen[nodeKey] {
			continue
		}
		seen[nodeKey] = true

		tech, cat := inferTerraformTech(resType)
		label := humanName(resName)

		nodes = append(nodes, rfNode{
			ID:   fmt.Sprintf("tf-%d", i),
			Type: "arch",
			Position: rfPos{
				X: float64(i%cols) * colW,
				Y: float64(i/cols) * rowH,
			},
			Data: rfData{
				Label:       label,
				Technology:  tech,
				Category:    cat,
				Description: resType,
			},
		})
		i++
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("reading terraform file: %w", err)
	}

	return marshalResult(nodes, edges)
}

func inferTerraformTech(resType string) (string, string) {
	if m, ok := awsResourceMap[resType]; ok {
		return m.tech, m.cat
	}
	// Generic fallback based on type prefix
	switch {
	case strings.Contains(resType, "database") || strings.Contains(resType, "db") ||
		strings.Contains(resType, "sql") || strings.Contains(resType, "redis") ||
		strings.Contains(resType, "dynamo") || strings.Contains(resType, "mongo"):
		return "postgresql", "datastore"
	case strings.Contains(resType, "storage") || strings.Contains(resType, "bucket") ||
		strings.Contains(resType, "blob"):
		return "s3", "storage"
	case strings.Contains(resType, "queue") || strings.Contains(resType, "topic") ||
		strings.Contains(resType, "stream") || strings.Contains(resType, "kafka"):
		return "sqs", "broker"
	case strings.Contains(resType, "lambda") || strings.Contains(resType, "function") ||
		strings.Contains(resType, "service"):
		return "microservice", "service"
	case strings.Contains(resType, "gateway") || strings.Contains(resType, "alb") ||
		strings.Contains(resType, "lb"):
		return "load-balancer", "infrastructure"
	case strings.Contains(resType, "cluster") || strings.Contains(resType, "kubernetes"):
		return "kubernetes", "infrastructure"
	}
	return "external", "external"
}

// humanName converts snake_case names to Title Case labels.
func humanName(s string) string {
	parts := strings.Split(s, "_")
	for i, p := range parts {
		if len(p) > 0 {
			parts[i] = strings.ToUpper(p[:1]) + p[1:]
		}
	}
	return strings.Join(parts, " ")
}
