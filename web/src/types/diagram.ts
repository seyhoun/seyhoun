import { Node, Edge } from '@xyflow/react'

// ── Diagram types ─────────────────────────────────────────────────────

export type DiagramType =
  | 'architecture'
  | 'sequence'
  | 'class'
  | 'er'
  | 'flowchart'
  | 'network'
  | 'platform'
  | 'state_machine'
  | 'activity'
  | 'component'
  | 'deployment'
  | 'use_case'

// ── UML element kinds ─────────────────────────────────────────────────

export type ElementKind =
  // Class diagram
  | 'class-box'
  | 'interface-box'
  | 'abstract-class'
  | 'enum-box'
  | 'package'
  // ER diagram
  | 'entity'
  | 'weak-entity'
  | 'relationship'
  // Flowchart
  | 'process'
  | 'decision'
  | 'terminal'
  | 'io-box'
  | 'connector'
  | 'predefined-process'
  | 'document'
  | 'preparation'
  // State machine
  | 'state'
  | 'initial-state'
  | 'final-state'
  | 'composite-state'
  | 'choice'
  | 'history'
  // Activity
  | 'action'
  | 'fork-join'
  | 'decision-merge'
  | 'swim-lane'
  | 'signal-send'
  | 'signal-receive'
  | 'note'
  // Use case
  | 'actor'
  | 'use-case'
  | 'system-boundary'
  // Sequence
  | 'lifeline'
  | 'message'
  | 'fragment'
  | 'boundary-lifeline'
  | 'control-lifeline'
  | 'entity-lifeline'

// ── Node taxonomy ────────────────────────────────────────────────────

export type NodeCategory =
  | 'datastore'
  | 'broker'
  | 'service'
  | 'infrastructure'
  | 'external'
  | 'bigdata'
  | 'analytics'
  | 'storage'
  | 'monitoring'
  | 'cicd'
  | 'ml'

export type NodeTechnology =
  // Datastores
  | 'postgresql' | 'mysql' | 'mongodb' | 'redis'
  | 'elasticsearch' | 'sqlite' | 'cassandra'
  | 'dynamodb' | 'couchdb' | 'neo4j' | 'influxdb'
  | 'memcached' | 'hazelcast' | 'cockroachdb' | 'scylladb'
  // Brokers
  | 'kafka' | 'rabbitmq' | 'nats' | 'pulsar'
  | 'activemq' | 'sqs' | 'pubsub' | 'kinesis'
  // Services
  | 'rest-api' | 'grpc' | 'graphql' | 'worker' | 'microservice'
  // Infrastructure
  | 'api-gateway' | 'load-balancer' | 'nginx' | 'cdn'
  | 'kubernetes' | 'docker' | 'consul' | 'vault' | 'istio' | 'envoy'
  // External
  | 'external' | 'client'
  // Big Data
  | 'hadoop' | 'spark' | 'flink' | 'hive' | 'trino'
  | 'kafka-streams' | 'airflow' | 'dbt' | 'beam' | 'nifi'
  // Analytics / Warehouse
  | 'snowflake' | 'bigquery' | 'redshift' | 'databricks' | 'clickhouse' | 'druid'
  // Object Storage
  | 's3' | 'gcs' | 'minio' | 'azure-blob'
  // Monitoring / Observability
  | 'prometheus' | 'grafana' | 'jaeger' | 'datadog' | 'opentelemetry' | 'elk' | 'loki' | 'zipkin'
  // CI/CD
  | 'github-actions' | 'jenkins' | 'argocd' | 'gitlab-ci' | 'tekton'
  // ML / AI
  | 'mlflow' | 'feature-store' | 'model-serving' | 'ray' | 'kubeflow'
  // Application
  | 'application'

// ── UML structured sub-types ─────────────────────────────────────────

export interface AttributeEntry {
  id: string
  visibility: '+' | '-' | '#' | '~'
  name: string
  type: string
  isStatic?: boolean
}

export interface MethodEntry {
  id: string
  visibility: '+' | '-' | '#' | '~'
  name: string
  params: string
  returnType: string
  isAbstract?: boolean
  isStatic?: boolean
}

export interface EntityAttribute {
  id: string
  name: string
  type: string
  isPK?: boolean
  isFK?: boolean
  isNullable?: boolean
}

// ── UML node data interfaces (discriminated by `kind`) ────────────────

export interface ClassNodeData extends Record<string, unknown> {
  kind: 'class'
  label: string
  stereotype?: string
  description?: string
  attributes: AttributeEntry[]
  methods: MethodEntry[]
}

export interface EntityNodeData extends Record<string, unknown> {
  kind: 'entity'
  label: string
  description?: string
  isWeak?: boolean
  elementKind?: ElementKind
  attributes: EntityAttribute[]
}

export interface FlowchartNodeData extends Record<string, unknown> {
  kind: 'flowchart'
  label: string
  elementKind: ElementKind
  description?: string
}

export interface StateNodeData extends Record<string, unknown> {
  kind: 'state'
  label: string
  elementKind: ElementKind
  entryAction?: string
  doAction?: string
  exitAction?: string
  description?: string
}

export interface ActivityNodeData extends Record<string, unknown> {
  kind: 'activity'
  label: string
  elementKind: ElementKind
  description?: string
  guard?: string
}

export interface UseCaseNodeData extends Record<string, unknown> {
  kind: 'use-case'
  label: string
  elementKind: ElementKind
  description?: string
  preconditions?: string
  postconditions?: string
  actorType?: 'primary' | 'secondary'
}

export interface SequenceNodeData extends Record<string, unknown> {
  kind: 'sequence'
  label: string
  elementKind: ElementKind
  // For lifelines
  participantType?: 'actor' | 'object' | 'boundary' | 'control' | 'entity'
  stereotype?: string
  // For messages
  messageType?: 'sync' | 'async' | 'return' | 'create' | 'destroy'
  sourceLifelineId?: string
  targetLifelineId?: string
  // For fragments
  fragmentType?: 'alt' | 'loop' | 'opt' | 'break' | 'par'
  fragmentCondition?: string
}

// ── Layered data structures ──────────────────────────────────────────

export interface SchemaEntry {
  id: string
  name: string      // e.g. "public"
  tables: string[]  // e.g. ["users", "orders"]
}

export interface DatabaseEntry {
  id: string
  name: string       // e.g. "users_db"
  schemas?: SchemaEntry[]
  tables: string[]   // flat tables (no schema) — kept for simple mode
}

// ── Rich node data ───────────────────────────────────────────────────

// Must extend Record<string, unknown> for @xyflow/react v12
export interface NodeData extends Record<string, unknown> {
  kind?: 'infra'  // optional for backward compat — absent nodes are treated as infra
  label: string
  technology: NodeTechnology
  category: NodeCategory
  description?: string

  // Connection
  host?: string
  port?: string

  // Monitoring
  metricsEndpoint?: string
  health?: 'healthy' | 'warning' | 'error' | null

  // Datastore-specific
  databases?: DatabaseEntry[]

  // Broker-specific
  topics?: string[]
  queues?: string[]   // RabbitMQ / AMQP / ActiveMQ

  // Service-specific
  apiVersion?: string
  apiDocsUrl?: string

  // Application-specific
  language?: string
  healthEndpoint?: string

  // Drill-down: reference to a child diagram (sub-architecture)
  childDiagramId?: string
}

// ── Discriminated union of all node data shapes ───────────────────────

export type DiagramNodeData =
  | NodeData
  | ClassNodeData
  | EntityNodeData
  | FlowchartNodeData
  | StateNodeData
  | ActivityNodeData
  | UseCaseNodeData
  | SequenceNodeData

// ── Type guards ───────────────────────────────────────────────────────

export function isInfraNodeData(d: DiagramNodeData): d is NodeData {
  return !d.kind || d.kind === 'infra'
}
export function isClassNodeData(d: DiagramNodeData): d is ClassNodeData {
  return d.kind === 'class'
}
export function isEntityNodeData(d: DiagramNodeData): d is EntityNodeData {
  return d.kind === 'entity'
}
export function isFlowchartNodeData(d: DiagramNodeData): d is FlowchartNodeData {
  return d.kind === 'flowchart'
}
export function isStateNodeData(d: DiagramNodeData): d is StateNodeData {
  return d.kind === 'state'
}
export function isActivityNodeData(d: DiagramNodeData): d is ActivityNodeData {
  return d.kind === 'activity'
}
export function isUseCaseNodeData(d: DiagramNodeData): d is UseCaseNodeData {
  return d.kind === 'use-case'
}
export function isSequenceNodeData(d: DiagramNodeData): d is SequenceNodeData {
  return d.kind === 'sequence'
}

// ── Edge data ────────────────────────────────────────────────────────

export interface EdgeData extends Record<string, unknown> {
  protocol?: string
  // Sub-resource targeting on the destination node (infra)
  targetTopic?: string
  targetQueue?: string
  targetDatabase?: string
  targetSchema?: string
  targetTable?: string
  // UML edge properties
  edgeKind?: 'association' | 'inheritance' | 'composition' | 'aggregation' | 'dependency' | 'realization' | 'include' | 'extend' | 'transition'
  label?: string
  guard?: string
  action?: string
  cardinality?: { source?: string; target?: string }
  messageType?: 'sync' | 'async' | 'return' | 'create' | 'destroy'
}

export type ArchNode = Node<DiagramNodeData>
export type ArchEdge = Edge<EdgeData>

// ── Auth ─────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  name: string
  isAdmin?: boolean
  createdAt: string
}

// ── Members / Roles ──────────────────────────────────────────────────

export type MemberRole = 'owner' | 'maintainer' | 'developer' | 'commenter' | 'viewer'

export interface WorkspaceMember {
  id: string
  workspaceId: string
  userId: string
  role: MemberRole
  createdAt: string
  user?: User
}

export interface ProjectMember {
  id: string
  projectId: string
  userId: string
  role: MemberRole
  createdAt: string
  user?: User
}

export interface UserSearchResult {
  id: string
  email: string
  name: string
}

export interface AuthResponse {
  token: string
  user: User
}

// ── Workspace ────────────────────────────────────────────────────────

export interface Workspace {
  id: string
  slug: string
  name: string
  ownerId: string
  isPersonal: boolean
  avatarUrl: string
  createdAt: string
  updatedAt: string
}

// ── Project / Diagram models ─────────────────────────────────────────

export interface Project {
  id: string
  workspaceId: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface DiagramSummary {
  id: string
  projectId: string
  name: string
  diagramType: DiagramType
  createdAt: string
  updatedAt: string
}

export interface Diagram extends DiagramSummary {
  defaultBranchId: string
  nodesJson: string
  edgesJson: string
  pumlSource: string
  viewport: string
}

export interface Viewport {
  x: number
  y: number
  zoom: number
}

// ── Diagram Versioning ───────────────────────────────────────────────

export interface DiagramVersionSummary {
  id: string
  diagramId: string
  version: number
  createdAt: string
}

export interface DiagramVersion extends DiagramVersionSummary {
  nodesJson: string
  edgesJson: string
  viewport: string
}

export interface CommitSummary {
  id: string
  diagramId: string
  branchId: string
  parentId: string
  authorId: string
  message: string
  contentHash: string
  createdAt: string
}

export interface Commit extends CommitSummary {
  nodesJson: string
  edgesJson: string
  viewport: string
  pumlSource: string
}

// ── Import / Templates ───────────────────────────────────────────────

export interface ImportResult {
  nodes: ArchNode[]
  edges: ArchEdge[]
}

export interface TemplateInfo {
  id: string
  name: string
  description: string
  category: string
  nodeCount: number
}

// ── Breadcrumb ───────────────────────────────────────────────────────

export interface BreadcrumbItem {
  diagramId: string
  diagramName: string
  /** The node that was double-clicked to drill into this level */
  fromNodeId?: string
}
