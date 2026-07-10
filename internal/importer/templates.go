package importer

import "fmt"

// AllTemplates returns the list of all built-in template descriptors.
func AllTemplates() []TemplateInfo {
	return []TemplateInfo{
		{
			ID:          "microservices",
			Name:        "Microservice Architecture",
			Description: "API gateway routing to three backend services with a shared Kafka broker, PostgreSQL, and Redis cache.",
			Category:    "Architecture Patterns",
			NodeCount:   7,
		},
		{
			ID:          "data-pipeline",
			Name:        "Data Pipeline",
			Description: "Source database ingested through Kafka into a Spark processing layer, landing in a Snowflake warehouse with Grafana dashboards.",
			Category:    "Data Engineering",
			NodeCount:   7,
		},
		{
			ID:          "event-driven",
			Name:        "Event-Driven Architecture",
			Description: "Multiple producers emit events to a central Kafka broker consumed by downstream services, with a dead-letter queue for failures.",
			Category:    "Architecture Patterns",
			NodeCount:   8,
		},
		{
			ID:          "web-app",
			Name:        "Web Application",
			Description: "Classic three-tier web application with a CDN, load balancer, application servers, PostgreSQL database, and Redis cache.",
			Category:    "Web",
			NodeCount:   7,
		},
	}
}

// GetTemplate returns the full ImportResult for a given template ID.
func GetTemplate(id string) (*ImportResult, error) {
	switch id {
	case "microservices":
		return microservicesTemplate()
	case "data-pipeline":
		return dataPipelineTemplate()
	case "event-driven":
		return eventDrivenTemplate()
	case "web-app":
		return webAppTemplate()
	default:
		return nil, fmt.Errorf("unknown template %q", id)
	}
}

// ── Microservice Architecture ─────────────────────────────────────────────

func microservicesTemplate() (*ImportResult, error) {
	nodes := []rfNode{
		node("gw",      "API Gateway",    "api-gateway",  "infrastructure", 300, 0),
		node("svc-a",   "User Service",   "microservice", "service",        0,   180),
		node("svc-b",   "Order Service",  "microservice", "service",        300, 180),
		node("svc-c",   "Notify Service", "worker",       "service",        600, 180),
		node("kafka",   "Kafka",          "kafka",        "broker",         300, 360),
		node("pg",      "PostgreSQL",     "postgresql",   "datastore",      0,   540),
		node("redis",   "Redis Cache",    "redis",        "datastore",      600, 540),
	}
	edges := []rfEdge{
		edge("e0", "gw",    "svc-a"),
		edge("e1", "gw",    "svc-b"),
		edge("e2", "gw",    "svc-c"),
		edge("e3", "svc-b", "kafka"),
		edge("e4", "svc-c", "kafka"),
		edge("e5", "svc-a", "pg"),
		edge("e6", "svc-b", "pg"),
		edge("e7", "svc-a", "redis"),
	}
	return marshalResult(nodes, edges)
}

// ── Data Pipeline ─────────────────────────────────────────────────────────

func dataPipelineTemplate() (*ImportResult, error) {
	nodes := []rfNode{
		node("src",       "Source DB",      "postgresql", "datastore", 0,   180),
		node("kafka",     "Kafka",          "kafka",      "broker",    300, 180),
		node("spark",     "Spark",          "spark",      "bigdata",   600, 180),
		node("dbt",       "dbt Transform",  "dbt",        "bigdata",   600, 360),
		node("warehouse", "Snowflake",      "snowflake",  "analytics", 300, 360),
		node("s3",        "S3 Lake",        "s3",         "storage",   0,   360),
		node("grafana",   "Grafana",        "grafana",    "monitoring",300, 540),
	}
	edges := []rfEdge{
		edge("e0", "src",       "kafka"),
		edge("e1", "kafka",     "spark"),
		edge("e2", "spark",     "s3"),
		edge("e3", "spark",     "dbt"),
		edge("e4", "dbt",       "warehouse"),
		edge("e5", "warehouse", "grafana"),
	}
	return marshalResult(nodes, edges)
}

// ── Event-Driven Architecture ─────────────────────────────────────────────

func eventDrivenTemplate() (*ImportResult, error) {
	nodes := []rfNode{
		node("p1",    "Producer A",    "microservice", "service",   0,   0),
		node("p2",    "Producer B",    "microservice", "service",   300, 0),
		node("p3",    "Producer C",    "microservice", "service",   600, 0),
		node("kafka", "Kafka Broker",  "kafka",        "broker",    300, 200),
		node("c1",    "Consumer A",    "microservice", "service",   0,   400),
		node("c2",    "Consumer B",    "worker",       "service",   300, 400),
		node("c3",    "Consumer C",    "worker",       "service",   600, 400),
		node("dlq",   "Dead Letter Q", "sqs",          "broker",    900, 400),
	}
	edges := []rfEdge{
		edge("e0", "p1",    "kafka"),
		edge("e1", "p2",    "kafka"),
		edge("e2", "p3",    "kafka"),
		edge("e3", "kafka", "c1"),
		edge("e4", "kafka", "c2"),
		edge("e5", "kafka", "c3"),
		edge("e6", "kafka", "dlq"),
	}
	return marshalResult(nodes, edges)
}

// ── Web Application ───────────────────────────────────────────────────────

func webAppTemplate() (*ImportResult, error) {
	nodes := []rfNode{
		node("client",  "Browser",       "client",        "external",        300, 0),
		node("cdn",     "CDN",           "cdn",           "infrastructure",  300, 160),
		node("lb",      "Load Balancer", "load-balancer", "infrastructure",  300, 320),
		node("web1",    "App Server 1",  "application",   "service",         100, 480),
		node("web2",    "App Server 2",  "application",   "service",         500, 480),
		node("pg",      "PostgreSQL",    "postgresql",    "datastore",       100, 640),
		node("redis",   "Redis Cache",   "redis",         "datastore",       500, 640),
	}
	edges := []rfEdge{
		edge("e0", "client", "cdn"),
		edge("e1", "cdn",    "lb"),
		edge("e2", "lb",     "web1"),
		edge("e3", "lb",     "web2"),
		edge("e4", "web1",   "pg"),
		edge("e5", "web2",   "pg"),
		edge("e6", "web1",   "redis"),
		edge("e7", "web2",   "redis"),
	}
	return marshalResult(nodes, edges)
}

// ── helpers ───────────────────────────────────────────────────────────────

func node(id, label, tech, cat string, x, y float64) rfNode {
	return rfNode{
		ID:   id,
		Type: "arch",
		Position: rfPos{X: x, Y: y},
		Data: rfData{
			Label:      label,
			Technology: tech,
			Category:   cat,
		},
	}
}

func edge(id, src, tgt string) rfEdge {
	return rfEdge{
		ID:     id,
		Source: src,
		Target: tgt,
		Data:   map[string]interface{}{},
	}
}
