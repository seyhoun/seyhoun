import {
  Database, Zap, Search, GitBranch, MessageSquare, Radio,
  Globe, Cpu, Share2, Timer, Package,
  Shield, SlidersHorizontal, Server, Network,
  ExternalLink, Monitor,
  BarChart3, HardDrive, Eye, GitMerge, Brain,
  Cloud, Boxes, Lock, Layers, Activity, Play,
  FlaskConical, Container, Workflow, Sigma, AppWindow,
  type LucideIcon,
} from 'lucide-react'
import type { DiagramType, NodeCategory, NodeTechnology } from '../types/diagram'

export interface TechColors {
  border: string
  ring:   string
  icon:   string
  tag:    string
  dot:    string
}

export interface TechDef {
  technology:   NodeTechnology
  category:     NodeCategory
  subcategory?: string
  label:        string
  Icon:         LucideIcon
  colors:       TechColors
  defaultPort?: string
}

export interface SubcategoryDef {
  id:    string
  label: string
}

export interface CategoryDef {
  id:             NodeCategory
  label:          string
  subcategories?: SubcategoryDef[]
}

const mk = (
  border: string, ring: string, icon: string, tag: string, dot: string
): TechColors => ({ border, ring, icon, tag, dot })

export const TECH_REGISTRY: TechDef[] = [
  // ── Data Stores ───────────────────────────────────────────────────
  {
    technology: 'postgresql', category: 'datastore', subcategory: 'relational',
    label: 'PostgreSQL', Icon: Database, defaultPort: '5432',
    colors: mk('border-sky-500/40', 'ring-sky-500/30', 'text-sky-400', 'bg-sky-500/15 text-sky-300', 'bg-sky-500'),
  },
  {
    technology: 'mysql', category: 'datastore', subcategory: 'relational',
    label: 'MySQL', Icon: Database, defaultPort: '3306',
    colors: mk('border-orange-500/40', 'ring-orange-500/30', 'text-orange-400', 'bg-orange-500/15 text-orange-300', 'bg-orange-500'),
  },
  {
    technology: 'sqlite', category: 'datastore', subcategory: 'relational',
    label: 'SQLite', Icon: Database,
    colors: mk('border-slate-500/40', 'ring-slate-500/30', 'text-slate-400', 'bg-slate-500/15 text-slate-300', 'bg-slate-500'),
  },
  {
    technology: 'cockroachdb', category: 'datastore', subcategory: 'relational',
    label: 'CockroachDB', Icon: Database, defaultPort: '26257',
    colors: mk('border-teal-400/40', 'ring-teal-400/30', 'text-teal-300', 'bg-teal-400/15 text-teal-200', 'bg-teal-400'),
  },
  {
    technology: 'mongodb', category: 'datastore', subcategory: 'document',
    label: 'MongoDB', Icon: Database, defaultPort: '27017',
    colors: mk('border-green-500/40', 'ring-green-500/30', 'text-green-400', 'bg-green-500/15 text-green-300', 'bg-green-500'),
  },
  {
    technology: 'couchdb', category: 'datastore', subcategory: 'document',
    label: 'CouchDB', Icon: Database, defaultPort: '5984',
    colors: mk('border-red-400/40', 'ring-red-400/30', 'text-red-300', 'bg-red-400/15 text-red-200', 'bg-red-400'),
  },
  {
    technology: 'redis', category: 'datastore', subcategory: 'key-value',
    label: 'Redis', Icon: Zap, defaultPort: '6379',
    colors: mk('border-red-500/40', 'ring-red-500/30', 'text-red-400', 'bg-red-500/15 text-red-300', 'bg-red-500'),
  },
  {
    technology: 'memcached', category: 'datastore', subcategory: 'key-value',
    label: 'Memcached', Icon: Zap, defaultPort: '11211',
    colors: mk('border-lime-500/40', 'ring-lime-500/30', 'text-lime-400', 'bg-lime-500/15 text-lime-300', 'bg-lime-500'),
  },
  {
    technology: 'hazelcast', category: 'datastore', subcategory: 'key-value',
    label: 'Hazelcast', Icon: Zap, defaultPort: '5701',
    colors: mk('border-emerald-400/40', 'ring-emerald-400/30', 'text-emerald-300', 'bg-emerald-400/15 text-emerald-200', 'bg-emerald-400'),
  },
  {
    technology: 'dynamodb', category: 'datastore', subcategory: 'key-value',
    label: 'DynamoDB', Icon: Database,
    colors: mk('border-amber-600/40', 'ring-amber-600/30', 'text-amber-500', 'bg-amber-600/15 text-amber-400', 'bg-amber-600'),
  },
  {
    technology: 'cassandra', category: 'datastore', subcategory: 'wide-column',
    label: 'Cassandra', Icon: Database, defaultPort: '9042',
    colors: mk('border-purple-500/40', 'ring-purple-500/30', 'text-purple-400', 'bg-purple-500/15 text-purple-300', 'bg-purple-500'),
  },
  {
    technology: 'scylladb', category: 'datastore', subcategory: 'wide-column',
    label: 'ScyllaDB', Icon: Database, defaultPort: '9042',
    colors: mk('border-fuchsia-500/40', 'ring-fuchsia-500/30', 'text-fuchsia-400', 'bg-fuchsia-500/15 text-fuchsia-300', 'bg-fuchsia-500'),
  },
  {
    technology: 'elasticsearch', category: 'datastore', subcategory: 'search',
    label: 'Elasticsearch', Icon: Search, defaultPort: '9200',
    colors: mk('border-yellow-500/40', 'ring-yellow-500/30', 'text-yellow-400', 'bg-yellow-500/15 text-yellow-300', 'bg-yellow-500'),
  },
  {
    technology: 'influxdb', category: 'datastore', subcategory: 'time-series',
    label: 'InfluxDB', Icon: Activity, defaultPort: '8086',
    colors: mk('border-violet-400/40', 'ring-violet-400/30', 'text-violet-300', 'bg-violet-400/15 text-violet-200', 'bg-violet-400'),
  },
  {
    technology: 'neo4j', category: 'datastore', subcategory: 'graph',
    label: 'Neo4j', Icon: Share2, defaultPort: '7687',
    colors: mk('border-cyan-500/40', 'ring-cyan-500/30', 'text-cyan-400', 'bg-cyan-500/15 text-cyan-300', 'bg-cyan-500'),
  },

  // ── Message Brokers ───────────────────────────────────────────────
  {
    technology: 'kafka', category: 'broker', subcategory: 'streaming',
    label: 'Kafka', Icon: GitBranch, defaultPort: '9092',
    colors: mk('border-amber-500/40', 'ring-amber-500/30', 'text-amber-400', 'bg-amber-500/15 text-amber-300', 'bg-amber-500'),
  },
  {
    technology: 'pulsar', category: 'broker', subcategory: 'streaming',
    label: 'Pulsar', Icon: Radio, defaultPort: '6650',
    colors: mk('border-sky-400/40', 'ring-sky-400/30', 'text-sky-300', 'bg-sky-400/15 text-sky-200', 'bg-sky-400'),
  },
  {
    technology: 'kinesis', category: 'broker', subcategory: 'streaming',
    label: 'Kinesis', Icon: GitBranch,
    colors: mk('border-violet-500/40', 'ring-violet-500/30', 'text-violet-400', 'bg-violet-500/15 text-violet-300', 'bg-violet-500'),
  },
  {
    technology: 'rabbitmq', category: 'broker', subcategory: 'queue',
    label: 'RabbitMQ', Icon: MessageSquare, defaultPort: '5672',
    colors: mk('border-orange-400/40', 'ring-orange-400/30', 'text-orange-300', 'bg-orange-400/15 text-orange-200', 'bg-orange-400'),
  },
  {
    technology: 'activemq', category: 'broker', subcategory: 'queue',
    label: 'ActiveMQ', Icon: MessageSquare, defaultPort: '61616',
    colors: mk('border-red-600/40', 'ring-red-600/30', 'text-red-500', 'bg-red-600/15 text-red-400', 'bg-red-600'),
  },
  {
    technology: 'sqs', category: 'broker', subcategory: 'queue',
    label: 'SQS', Icon: MessageSquare,
    colors: mk('border-yellow-600/40', 'ring-yellow-600/30', 'text-yellow-500', 'bg-yellow-600/15 text-yellow-400', 'bg-yellow-600'),
  },
  {
    technology: 'nats', category: 'broker', subcategory: 'pubsub',
    label: 'NATS', Icon: Radio, defaultPort: '4222',
    colors: mk('border-blue-500/40', 'ring-blue-500/30', 'text-blue-400', 'bg-blue-500/15 text-blue-300', 'bg-blue-500'),
  },
  {
    technology: 'pubsub', category: 'broker', subcategory: 'pubsub',
    label: 'Pub/Sub', Icon: Radio,
    colors: mk('border-blue-400/40', 'ring-blue-400/30', 'text-blue-300', 'bg-blue-400/15 text-blue-200', 'bg-blue-400'),
  },

  // ── Services ──────────────────────────────────────────────────────
  {
    technology: 'rest-api', category: 'service', subcategory: 'api',
    label: 'REST API', Icon: Globe,
    colors: mk('border-indigo-500/40', 'ring-indigo-500/30', 'text-indigo-400', 'bg-indigo-500/15 text-indigo-300', 'bg-indigo-500'),
  },
  {
    technology: 'grpc', category: 'service', subcategory: 'api',
    label: 'gRPC', Icon: Cpu,
    colors: mk('border-violet-500/40', 'ring-violet-500/30', 'text-violet-400', 'bg-violet-500/15 text-violet-300', 'bg-violet-500'),
  },
  {
    technology: 'graphql', category: 'service', subcategory: 'api',
    label: 'GraphQL', Icon: Share2,
    colors: mk('border-pink-500/40', 'ring-pink-500/30', 'text-pink-400', 'bg-pink-500/15 text-pink-300', 'bg-pink-500'),
  },
  {
    technology: 'microservice', category: 'service', subcategory: 'generic',
    label: 'Service', Icon: Package,
    colors: mk('border-blue-500/40', 'ring-blue-500/30', 'text-blue-400', 'bg-blue-500/15 text-blue-300', 'bg-blue-500'),
  },
  {
    technology: 'worker', category: 'service', subcategory: 'background',
    label: 'Worker', Icon: Timer,
    colors: mk('border-slate-400/40', 'ring-slate-400/30', 'text-slate-400', 'bg-slate-400/15 text-slate-300', 'bg-slate-400'),
  },

  // ── Application ───────────────────────────────────────────────────
  {
    technology: 'application', category: 'service', subcategory: 'app',
    label: 'Application', Icon: AppWindow,
    colors: mk('border-violet-500/40', 'ring-violet-500/30', 'text-violet-400', 'bg-violet-500/15 text-violet-300', 'bg-violet-500'),
  },

  // ── Infrastructure ────────────────────────────────────────────────
  {
    technology: 'api-gateway', category: 'infrastructure', subcategory: 'security',
    label: 'API Gateway', Icon: Shield,
    colors: mk('border-violet-600/40', 'ring-violet-600/30', 'text-violet-400', 'bg-violet-600/15 text-violet-300', 'bg-violet-600'),
  },
  {
    technology: 'vault', category: 'infrastructure', subcategory: 'security',
    label: 'Vault', Icon: Lock,
    colors: mk('border-yellow-700/40', 'ring-yellow-700/30', 'text-yellow-600', 'bg-yellow-700/15 text-yellow-500', 'bg-yellow-700'),
  },
  {
    technology: 'load-balancer', category: 'infrastructure', subcategory: 'networking',
    label: 'Load Balancer', Icon: SlidersHorizontal,
    colors: mk('border-sky-600/40', 'ring-sky-600/30', 'text-sky-400', 'bg-sky-600/15 text-sky-300', 'bg-sky-500'),
  },
  {
    technology: 'nginx', category: 'infrastructure', subcategory: 'networking',
    label: 'Nginx', Icon: Server,
    colors: mk('border-emerald-500/40', 'ring-emerald-500/30', 'text-emerald-400', 'bg-emerald-500/15 text-emerald-300', 'bg-emerald-500'),
  },
  {
    technology: 'cdn', category: 'infrastructure', subcategory: 'networking',
    label: 'CDN', Icon: Network,
    colors: mk('border-teal-500/40', 'ring-teal-500/30', 'text-teal-400', 'bg-teal-500/15 text-teal-300', 'bg-teal-500'),
  },
  {
    technology: 'istio', category: 'infrastructure', subcategory: 'networking',
    label: 'Istio', Icon: Network,
    colors: mk('border-indigo-400/40', 'ring-indigo-400/30', 'text-indigo-300', 'bg-indigo-400/15 text-indigo-200', 'bg-indigo-400'),
  },
  {
    technology: 'envoy', category: 'infrastructure', subcategory: 'networking',
    label: 'Envoy', Icon: Shield,
    colors: mk('border-purple-400/40', 'ring-purple-400/30', 'text-purple-300', 'bg-purple-400/15 text-purple-200', 'bg-purple-400'),
  },
  {
    technology: 'kubernetes', category: 'infrastructure', subcategory: 'orchestration',
    label: 'Kubernetes', Icon: Boxes,
    colors: mk('border-blue-600/40', 'ring-blue-600/30', 'text-blue-500', 'bg-blue-600/15 text-blue-400', 'bg-blue-600'),
  },
  {
    technology: 'docker', category: 'infrastructure', subcategory: 'orchestration',
    label: 'Docker', Icon: Container,
    colors: mk('border-cyan-600/40', 'ring-cyan-600/30', 'text-cyan-500', 'bg-cyan-600/15 text-cyan-400', 'bg-cyan-600'),
  },
  {
    technology: 'consul', category: 'infrastructure', subcategory: 'discovery',
    label: 'Consul', Icon: Network,
    colors: mk('border-rose-500/40', 'ring-rose-500/30', 'text-rose-400', 'bg-rose-500/15 text-rose-300', 'bg-rose-500'),
  },

  // ── External ──────────────────────────────────────────────────────
  {
    technology: 'external', category: 'external',
    label: 'External', Icon: ExternalLink,
    colors: mk('border-slate-500/40', 'ring-slate-500/30', 'text-slate-400', 'bg-slate-500/15 text-slate-300', 'bg-slate-500'),
  },
  {
    technology: 'client', category: 'external',
    label: 'Client', Icon: Monitor,
    colors: mk('border-gray-500/40', 'ring-gray-500/30', 'text-gray-400', 'bg-gray-500/15 text-gray-300', 'bg-gray-500'),
  },

  // ── Big Data ──────────────────────────────────────────────────────
  {
    technology: 'spark', category: 'bigdata', subcategory: 'processing',
    label: 'Spark', Icon: Zap,
    colors: mk('border-orange-500/40', 'ring-orange-500/30', 'text-orange-400', 'bg-orange-500/15 text-orange-300', 'bg-orange-500'),
  },
  {
    technology: 'flink', category: 'bigdata', subcategory: 'processing',
    label: 'Flink', Icon: Cpu,
    colors: mk('border-red-500/40', 'ring-red-500/30', 'text-red-400', 'bg-red-500/15 text-red-300', 'bg-red-500'),
  },
  {
    technology: 'beam', category: 'bigdata', subcategory: 'processing',
    label: 'Apache Beam', Icon: Cpu,
    colors: mk('border-blue-600/40', 'ring-blue-600/30', 'text-blue-500', 'bg-blue-600/15 text-blue-400', 'bg-blue-600'),
  },
  {
    technology: 'kafka-streams', category: 'bigdata', subcategory: 'processing',
    label: 'Kafka Streams', Icon: Layers,
    colors: mk('border-amber-500/40', 'ring-amber-500/30', 'text-amber-400', 'bg-amber-500/15 text-amber-300', 'bg-amber-500'),
  },
  {
    technology: 'hadoop', category: 'bigdata', subcategory: 'storage-compute',
    label: 'Hadoop', Icon: HardDrive,
    colors: mk('border-yellow-600/40', 'ring-yellow-600/30', 'text-yellow-500', 'bg-yellow-600/15 text-yellow-400', 'bg-yellow-600'),
  },
  {
    technology: 'hive', category: 'bigdata', subcategory: 'query',
    label: 'Hive', Icon: Database,
    colors: mk('border-amber-600/40', 'ring-amber-600/30', 'text-amber-500', 'bg-amber-600/15 text-amber-400', 'bg-amber-600'),
  },
  {
    technology: 'trino', category: 'bigdata', subcategory: 'query',
    label: 'Trino', Icon: Search,
    colors: mk('border-indigo-600/40', 'ring-indigo-600/30', 'text-indigo-500', 'bg-indigo-600/15 text-indigo-400', 'bg-indigo-600'),
  },
  {
    technology: 'airflow', category: 'bigdata', subcategory: 'orchestration',
    label: 'Airflow', Icon: Workflow,
    colors: mk('border-teal-600/40', 'ring-teal-600/30', 'text-teal-500', 'bg-teal-600/15 text-teal-400', 'bg-teal-600'),
  },
  {
    technology: 'nifi', category: 'bigdata', subcategory: 'ingestion',
    label: 'Apache NiFi', Icon: Network,
    colors: mk('border-purple-600/40', 'ring-purple-600/30', 'text-purple-500', 'bg-purple-600/15 text-purple-400', 'bg-purple-600'),
  },
  {
    technology: 'dbt', category: 'bigdata', subcategory: 'transform',
    label: 'dbt', Icon: GitBranch,
    colors: mk('border-orange-600/40', 'ring-orange-600/30', 'text-orange-500', 'bg-orange-600/15 text-orange-400', 'bg-orange-600'),
  },

  // ── Analytics / Data Warehouse ────────────────────────────────────
  {
    technology: 'snowflake', category: 'analytics', subcategory: 'warehouse',
    label: 'Snowflake', Icon: Sigma,
    colors: mk('border-sky-500/40', 'ring-sky-500/30', 'text-sky-400', 'bg-sky-500/15 text-sky-300', 'bg-sky-500'),
  },
  {
    technology: 'bigquery', category: 'analytics', subcategory: 'warehouse',
    label: 'BigQuery', Icon: BarChart3,
    colors: mk('border-blue-600/40', 'ring-blue-600/30', 'text-blue-500', 'bg-blue-600/15 text-blue-400', 'bg-blue-600'),
  },
  {
    technology: 'redshift', category: 'analytics', subcategory: 'warehouse',
    label: 'Redshift', Icon: Database,
    colors: mk('border-red-700/40', 'ring-red-700/30', 'text-red-600', 'bg-red-700/15 text-red-500', 'bg-red-700'),
  },
  {
    technology: 'databricks', category: 'analytics', subcategory: 'platform',
    label: 'Databricks', Icon: Zap,
    colors: mk('border-red-500/40', 'ring-red-500/30', 'text-red-400', 'bg-red-500/15 text-red-300', 'bg-red-500'),
  },
  {
    technology: 'clickhouse', category: 'analytics', subcategory: 'platform',
    label: 'ClickHouse', Icon: Database,
    colors: mk('border-yellow-500/40', 'ring-yellow-500/30', 'text-yellow-400', 'bg-yellow-500/15 text-yellow-300', 'bg-yellow-500'),
  },
  {
    technology: 'druid', category: 'analytics', subcategory: 'olap',
    label: 'Druid', Icon: BarChart3,
    colors: mk('border-purple-500/40', 'ring-purple-500/30', 'text-purple-400', 'bg-purple-500/15 text-purple-300', 'bg-purple-500'),
  },

  // ── Object Storage ────────────────────────────────────────────────
  {
    technology: 's3', category: 'storage', subcategory: 'cloud',
    label: 'S3', Icon: HardDrive,
    colors: mk('border-green-600/40', 'ring-green-600/30', 'text-green-500', 'bg-green-600/15 text-green-400', 'bg-green-600'),
  },
  {
    technology: 'gcs', category: 'storage', subcategory: 'cloud',
    label: 'GCS', Icon: Cloud,
    colors: mk('border-blue-500/40', 'ring-blue-500/30', 'text-blue-400', 'bg-blue-500/15 text-blue-300', 'bg-blue-500'),
  },
  {
    technology: 'azure-blob', category: 'storage', subcategory: 'cloud',
    label: 'Azure Blob', Icon: Cloud,
    colors: mk('border-sky-600/40', 'ring-sky-600/30', 'text-sky-500', 'bg-sky-600/15 text-sky-400', 'bg-sky-600'),
  },
  {
    technology: 'minio', category: 'storage', subcategory: 'self-hosted',
    label: 'MinIO', Icon: HardDrive,
    colors: mk('border-pink-500/40', 'ring-pink-500/30', 'text-pink-400', 'bg-pink-500/15 text-pink-300', 'bg-pink-500'),
  },

  // ── Monitoring / Observability ────────────────────────────────────
  {
    technology: 'prometheus', category: 'monitoring', subcategory: 'metrics',
    label: 'Prometheus', Icon: Activity, defaultPort: '9090',
    colors: mk('border-orange-500/40', 'ring-orange-500/30', 'text-orange-400', 'bg-orange-500/15 text-orange-300', 'bg-orange-500'),
  },
  {
    technology: 'grafana', category: 'monitoring', subcategory: 'metrics',
    label: 'Grafana', Icon: BarChart3, defaultPort: '3000',
    colors: mk('border-orange-400/40', 'ring-orange-400/30', 'text-orange-300', 'bg-orange-400/15 text-orange-200', 'bg-orange-400'),
  },
  {
    technology: 'datadog', category: 'monitoring', subcategory: 'metrics',
    label: 'Datadog', Icon: Eye,
    colors: mk('border-purple-500/40', 'ring-purple-500/30', 'text-purple-400', 'bg-purple-500/15 text-purple-300', 'bg-purple-500'),
  },
  {
    technology: 'jaeger', category: 'monitoring', subcategory: 'tracing',
    label: 'Jaeger', Icon: Eye, defaultPort: '16686',
    colors: mk('border-sky-500/40', 'ring-sky-500/30', 'text-sky-400', 'bg-sky-500/15 text-sky-300', 'bg-sky-500'),
  },
  {
    technology: 'zipkin', category: 'monitoring', subcategory: 'tracing',
    label: 'Zipkin', Icon: Eye, defaultPort: '9411',
    colors: mk('border-rose-500/40', 'ring-rose-500/30', 'text-rose-400', 'bg-rose-500/15 text-rose-300', 'bg-rose-500'),
  },
  {
    technology: 'opentelemetry', category: 'monitoring', subcategory: 'tracing',
    label: 'OpenTelemetry', Icon: Activity,
    colors: mk('border-blue-400/40', 'ring-blue-400/30', 'text-blue-300', 'bg-blue-400/15 text-blue-200', 'bg-blue-400'),
  },
  {
    technology: 'elk', category: 'monitoring', subcategory: 'logging',
    label: 'ELK Stack', Icon: Search, defaultPort: '5601',
    colors: mk('border-yellow-500/40', 'ring-yellow-500/30', 'text-yellow-400', 'bg-yellow-500/15 text-yellow-300', 'bg-yellow-500'),
  },
  {
    technology: 'loki', category: 'monitoring', subcategory: 'logging',
    label: 'Loki', Icon: Eye, defaultPort: '3100',
    colors: mk('border-emerald-500/40', 'ring-emerald-500/30', 'text-emerald-400', 'bg-emerald-500/15 text-emerald-300', 'bg-emerald-500'),
  },

  // ── CI/CD ──────────────────────────────────────────────────────────
  {
    technology: 'github-actions', category: 'cicd', subcategory: 'build',
    label: 'GitHub Actions', Icon: GitMerge,
    colors: mk('border-slate-400/40', 'ring-slate-400/30', 'text-slate-300', 'bg-slate-400/15 text-slate-200', 'bg-slate-400'),
  },
  {
    technology: 'jenkins', category: 'cicd', subcategory: 'build',
    label: 'Jenkins', Icon: Play, defaultPort: '8080',
    colors: mk('border-red-400/40', 'ring-red-400/30', 'text-red-300', 'bg-red-400/15 text-red-200', 'bg-red-400'),
  },
  {
    technology: 'gitlab-ci', category: 'cicd', subcategory: 'build',
    label: 'GitLab CI', Icon: GitMerge,
    colors: mk('border-orange-600/40', 'ring-orange-600/30', 'text-orange-500', 'bg-orange-600/15 text-orange-400', 'bg-orange-600'),
  },
  {
    technology: 'argocd', category: 'cicd', subcategory: 'gitops',
    label: 'ArgoCD', Icon: GitMerge, defaultPort: '8080',
    colors: mk('border-orange-500/40', 'ring-orange-500/30', 'text-orange-400', 'bg-orange-500/15 text-orange-300', 'bg-orange-500'),
  },
  {
    technology: 'tekton', category: 'cicd', subcategory: 'pipeline',
    label: 'Tekton', Icon: GitBranch,
    colors: mk('border-blue-500/40', 'ring-blue-500/30', 'text-blue-400', 'bg-blue-500/15 text-blue-300', 'bg-blue-500'),
  },

  // ── ML / AI ───────────────────────────────────────────────────────
  {
    technology: 'mlflow', category: 'ml', subcategory: 'experiment',
    label: 'MLflow', Icon: FlaskConical, defaultPort: '5000',
    colors: mk('border-sky-500/40', 'ring-sky-500/30', 'text-sky-400', 'bg-sky-500/15 text-sky-300', 'bg-sky-500'),
  },
  {
    technology: 'feature-store', category: 'ml', subcategory: 'data',
    label: 'Feature Store', Icon: Database,
    colors: mk('border-teal-500/40', 'ring-teal-500/30', 'text-teal-400', 'bg-teal-500/15 text-teal-300', 'bg-teal-500'),
  },
  {
    technology: 'model-serving', category: 'ml', subcategory: 'serving',
    label: 'Model Serving', Icon: Brain,
    colors: mk('border-purple-600/40', 'ring-purple-600/30', 'text-purple-500', 'bg-purple-600/15 text-purple-400', 'bg-purple-600'),
  },
  {
    technology: 'ray', category: 'ml', subcategory: 'compute',
    label: 'Ray', Icon: Cpu,
    colors: mk('border-blue-500/40', 'ring-blue-500/30', 'text-blue-400', 'bg-blue-500/15 text-blue-300', 'bg-blue-500'),
  },
  {
    technology: 'kubeflow', category: 'ml', subcategory: 'orchestration',
    label: 'Kubeflow', Icon: Brain,
    colors: mk('border-indigo-500/40', 'ring-indigo-500/30', 'text-indigo-400', 'bg-indigo-500/15 text-indigo-300', 'bg-indigo-500'),
  },
]

export const TECH_MAP = new Map<NodeTechnology, TechDef>(
  TECH_REGISTRY.map((t) => [t.technology, t])
)

export function getTech(tech: NodeTechnology): TechDef {
  return TECH_MAP.get(tech) ?? TECH_REGISTRY[0]
}

// ── Diagram type definitions ──────────────────────────────────────────

export interface DiagramTypeDef {
  id: DiagramType
  label: string
  description: string
  Icon: LucideIcon
  categories: NodeCategory[]
  ready: boolean
}

export const DIAGRAM_TYPES: DiagramTypeDef[] = [
  {
    id: 'architecture',
    label: 'Architecture',
    description: 'Full system and service architecture',
    Icon: Boxes,
    categories: ['datastore', 'broker', 'service', 'infrastructure', 'external', 'bigdata', 'analytics', 'storage', 'monitoring', 'cicd', 'ml'],
    ready: true,
  },
  {
    id: 'network',
    label: 'Network',
    description: 'Network topology and connectivity',
    Icon: Network,
    categories: ['infrastructure', 'external', 'monitoring'],
    ready: true,
  },
  {
    id: 'platform',
    label: 'Platform',
    description: 'Cloud platform and infrastructure layout',
    Icon: Cloud,
    categories: ['infrastructure', 'storage', 'monitoring', 'cicd', 'external'],
    ready: true,
  },
  {
    id: 'deployment',
    label: 'Deployment',
    description: 'Deployment pipelines and environments',
    Icon: Container,
    categories: ['infrastructure', 'cicd', 'storage', 'external'],
    ready: true,
  },
  {
    id: 'component',
    label: 'Component',
    description: 'Software component relationships',
    Icon: Package,
    categories: ['service', 'datastore', 'broker', 'external'],
    ready: true,
  },
  {
    id: 'sequence',
    label: 'Sequence',
    description: 'Interaction sequence between actors',
    Icon: Layers,
    categories: [],
    ready: true,
  },
  {
    id: 'class',
    label: 'Class',
    description: 'Object-oriented class relationships',
    Icon: Share2,
    categories: [],
    ready: true,
  },
  {
    id: 'er',
    label: 'ER Diagram',
    description: 'Entity-relationship data model',
    Icon: Database,
    categories: [],
    ready: true,
  },
  {
    id: 'flowchart',
    label: 'Flowchart',
    description: 'Process flow and decision logic',
    Icon: GitMerge,
    categories: [],
    ready: true,
  },
  {
    id: 'state_machine',
    label: 'State Machine',
    description: 'States and transitions',
    Icon: Activity,
    categories: [],
    ready: true,
  },
  {
    id: 'activity',
    label: 'Activity',
    description: 'Activity and workflow diagrams',
    Icon: Workflow,
    categories: [],
    ready: true,
  },
  {
    id: 'use_case',
    label: 'Use Case',
    description: 'Actor and use-case relationships',
    Icon: AppWindow,
    categories: [],
    ready: true,
  },
]

export const DIAGRAM_TYPE_MAP = new Map<DiagramType, DiagramTypeDef>(
  DIAGRAM_TYPES.map((dt) => [dt.id, dt])
)

export function getCategoriesForType(type: DiagramType): CategoryDef[] {
  const def = DIAGRAM_TYPE_MAP.get(type)
  if (!def || def.categories.length === 0) return CATEGORIES
  return CATEGORIES.filter((c) => (def.categories as string[]).includes(c.id))
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'datastore',
    label: 'Data Stores',
    subcategories: [
      { id: 'relational',  label: 'Relational' },
      { id: 'document',    label: 'Document' },
      { id: 'key-value',   label: 'Key-Value / Cache' },
      { id: 'wide-column', label: 'Wide-Column' },
      { id: 'search',      label: 'Search' },
      { id: 'time-series', label: 'Time-Series' },
      { id: 'graph',       label: 'Graph' },
    ],
  },
  {
    id: 'broker',
    label: 'Message Brokers',
    subcategories: [
      { id: 'streaming', label: 'Streaming' },
      { id: 'queue',     label: 'Message Queue' },
      { id: 'pubsub',    label: 'Pub / Sub' },
    ],
  },
  {
    id: 'service',
    label: 'Services',
    subcategories: [
      { id: 'app',        label: 'Application' },
      { id: 'api',        label: 'API' },
      { id: 'generic',    label: 'Generic' },
      { id: 'background', label: 'Background' },
    ],
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    subcategories: [
      { id: 'security',      label: 'Security' },
      { id: 'networking',    label: 'Networking' },
      { id: 'orchestration', label: 'Containers' },
      { id: 'discovery',     label: 'Discovery' },
    ],
  },
  {
    id: 'bigdata',
    label: 'Big Data',
    subcategories: [
      { id: 'processing',      label: 'Processing' },
      { id: 'storage-compute', label: 'Storage & Compute' },
      { id: 'query',           label: 'Query Engine' },
      { id: 'orchestration',   label: 'Orchestration' },
      { id: 'ingestion',       label: 'Ingestion' },
      { id: 'transform',       label: 'Transformation' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics & Warehouse',
    subcategories: [
      { id: 'warehouse', label: 'Data Warehouse' },
      { id: 'platform',  label: 'Platform' },
      { id: 'olap',      label: 'OLAP' },
    ],
  },
  {
    id: 'storage',
    label: 'Object Storage',
    subcategories: [
      { id: 'cloud',       label: 'Cloud' },
      { id: 'self-hosted', label: 'Self-Hosted' },
    ],
  },
  {
    id: 'monitoring',
    label: 'Monitoring & Observability',
    subcategories: [
      { id: 'metrics', label: 'Metrics' },
      { id: 'tracing', label: 'Tracing' },
      { id: 'logging', label: 'Logging' },
    ],
  },
  {
    id: 'cicd',
    label: 'CI / CD',
    subcategories: [
      { id: 'build',    label: 'Build & Test' },
      { id: 'gitops',   label: 'GitOps' },
      { id: 'pipeline', label: 'Pipeline' },
    ],
  },
  {
    id: 'ml',
    label: 'ML / AI',
    subcategories: [
      { id: 'experiment',    label: 'Experiment Tracking' },
      { id: 'data',          label: 'Data' },
      { id: 'serving',       label: 'Serving' },
      { id: 'compute',       label: 'Compute' },
      { id: 'orchestration', label: 'Orchestration' },
    ],
  },
  {
    id: 'external',
    label: 'External',
  },
]
