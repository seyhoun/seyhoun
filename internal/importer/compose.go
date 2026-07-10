package importer

import (
	"encoding/json"
	"fmt"
	"strings"

	"gopkg.in/yaml.v3"
)

// composeFile is a minimal representation of a docker-compose.yml file.
type composeFile struct {
	Services map[string]composeService `yaml:"services"`
	Volumes  map[string]interface{}    `yaml:"volumes"`
	Networks map[string]interface{}    `yaml:"networks"`
}

type composeService struct {
	Image      string            `yaml:"image"`
	DependsOn  interface{}       `yaml:"depends_on"` // can be []string or map[string]...
	Ports      []string          `yaml:"ports"`
	Volumes    []string          `yaml:"volumes"`
	Networks   []string          `yaml:"networks"`
	Labels     map[string]string `yaml:"labels"`
}

// node represents a React Flow node in its serialisable form.
type rfNode struct {
	ID       string  `json:"id"`
	Type     string  `json:"type"`
	Position rfPos   `json:"position"`
	Data     rfData  `json:"data"`
}

type rfPos struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type rfData struct {
	Label       string `json:"label"`
	Technology  string `json:"technology"`
	Category    string `json:"category"`
	Description string `json:"description,omitempty"`
}

// rfEdge represents a React Flow edge.
type rfEdge struct {
	ID     string      `json:"id"`
	Source string      `json:"source"`
	Target string      `json:"target"`
	Data   interface{} `json:"data"`
}

// FromCompose parses a docker-compose YAML file into an ImportResult.
// Services become service nodes, depends_on relationships become edges.
// Named volumes and networks become infrastructure nodes.
func FromCompose(data []byte) (*ImportResult, error) {
	var cf composeFile
	if err := yaml.Unmarshal(data, &cf); err != nil {
		return nil, fmt.Errorf("invalid docker-compose YAML: %w", err)
	}

	var nodes []rfNode
	var edges []rfEdge
	serviceIDs := make(map[string]string) // service name → node id

	// Grid layout constants
	const (
		colW  = 220.0
		rowH  = 140.0
		cols  = 4
	)

	// ── Services ──────────────────────────────────────────────────────────
	i := 0
	for name, svc := range cf.Services {
		id := fmt.Sprintf("svc-%s", slug(name))
		serviceIDs[name] = id
		tech, cat := inferComposeTech(name, svc.Image)
		nodes = append(nodes, rfNode{
			ID:   id,
			Type: "arch",
			Position: rfPos{
				X: float64(i%cols) * colW,
				Y: float64(i/cols) * rowH,
			},
			Data: rfData{
				Label:      name,
				Technology: tech,
				Category:   cat,
			},
		})
		i++
	}

	// ── Named volumes as datastore nodes ─────────────────────────────────
	volRow := (i/cols + 1)
	j := 0
	for name := range cf.Volumes {
		id := fmt.Sprintf("vol-%s", slug(name))
		nodes = append(nodes, rfNode{
			ID:   id,
			Type: "arch",
			Position: rfPos{
				X: float64(j%cols) * colW,
				Y: float64(volRow) * rowH,
			},
			Data: rfData{
				Label:       name,
				Technology:  "minio",
				Category:    "storage",
				Description: "Named volume",
			},
		})
		j++
	}

	// ── Edges from depends_on ─────────────────────────────────────────────
	edgeIdx := 0
	for name, svc := range cf.Services {
		srcID, ok := serviceIDs[name]
		if !ok {
			continue
		}
		deps := parseDependsOn(svc.DependsOn)
		for _, dep := range deps {
			tgtID, ok := serviceIDs[dep]
			if !ok {
				continue
			}
			edges = append(edges, rfEdge{
				ID:     fmt.Sprintf("e%d", edgeIdx),
				Source: srcID,
				Target: tgtID,
				Data:   map[string]interface{}{},
			})
			edgeIdx++
		}
	}

	return marshalResult(nodes, edges)
}

// inferComposeTech maps an image name or service name to a Seyhoun technology key.
func inferComposeTech(name, image string) (string, string) {
	combined := strings.ToLower(name + " " + image)

	checks := []struct {
		keywords []string
		tech     string
		cat      string
	}{
		{[]string{"postgres", "postgresql"}, "postgresql", "datastore"},
		{[]string{"mysql", "mariadb"}, "mysql", "datastore"},
		{[]string{"mongo"}, "mongodb", "datastore"},
		{[]string{"redis"}, "redis", "datastore"},
		{[]string{"elasticsearch"}, "elasticsearch", "datastore"},
		{[]string{"kafka"}, "kafka", "broker"},
		{[]string{"rabbitmq"}, "rabbitmq", "broker"},
		{[]string{"nats"}, "nats", "broker"},
		{[]string{"nginx", "traefik", "caddy"}, "nginx", "infrastructure"},
		{[]string{"prometheus"}, "prometheus", "monitoring"},
		{[]string{"grafana"}, "grafana", "monitoring"},
		{[]string{"jaeger"}, "jaeger", "monitoring"},
		{[]string{"minio"}, "minio", "storage"},
		{[]string{"zookeeper"}, "consul", "infrastructure"},
	}

	for _, c := range checks {
		for _, kw := range c.keywords {
			if strings.Contains(combined, kw) {
				return c.tech, c.cat
			}
		}
	}
	return "microservice", "service"
}

// parseDependsOn handles depends_on as either []string or map[string]condition.
func parseDependsOn(raw interface{}) []string {
	if raw == nil {
		return nil
	}
	switch v := raw.(type) {
	case []interface{}:
		var deps []string
		for _, item := range v {
			if s, ok := item.(string); ok {
				deps = append(deps, s)
			}
		}
		return deps
	case map[string]interface{}:
		var deps []string
		for k := range v {
			deps = append(deps, k)
		}
		return deps
	}
	return nil
}

func slug(s string) string {
	return strings.NewReplacer(" ", "-", "_", "-", ".", "-").Replace(strings.ToLower(s))
}

func marshalResult(nodes []rfNode, edges []rfEdge) (*ImportResult, error) {
	result := &ImportResult{
		Nodes: make([]json.RawMessage, 0, len(nodes)),
		Edges: make([]json.RawMessage, 0, len(edges)),
	}
	for _, n := range nodes {
		b, err := json.Marshal(n)
		if err != nil {
			return nil, err
		}
		result.Nodes = append(result.Nodes, b)
	}
	for _, e := range edges {
		b, err := json.Marshal(e)
		if err != nil {
			return nil, err
		}
		result.Edges = append(result.Edges, b)
	}
	return result, nil
}
