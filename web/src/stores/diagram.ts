import { create } from 'zustand'
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  MarkerType,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react'
import type { ArchNode, ArchEdge, DiagramNodeData, EdgeData, BreadcrumbItem, DiagramType } from '../types/diagram'
import { isInfraDiagramType, UML_EDGE_TYPE } from '../lib/elementRegistry'

// ── Sub-handle parsing ────────────────────────────────────────────────

type ParsedSubHandle =
  | { type: 'topic'; name: string }
  | { type: 'queue'; name: string }
  | { type: 'db'; name: string }
  | { type: 'table'; dbName: string; schemaAndTable: string }

/** Extract sub-resource info from a handle ID like `sub-topic-orders-t` */
function parseSubHandle(handleId: string | null | undefined): ParsedSubHandle | null {
  if (!handleId?.startsWith('sub-')) return null
  // strip trailing -t or -s
  const body = handleId.replace(/-(t|s)$/, '').slice('sub-'.length)
  if (body.startsWith('topic-')) return { type: 'topic', name: body.slice('topic-'.length) }
  if (body.startsWith('queue-')) return { type: 'queue', name: body.slice('queue-'.length) }
  if (body.startsWith('db-'))    return { type: 'db',    name: body.slice('db-'.length) }
  if (body.startsWith('table-')) {
    // format: table-{dbSlug}.{rest}
    const rest = body.slice('table-'.length)
    const dot = rest.indexOf('.')
    if (dot === -1) return null
    return { type: 'table', dbName: rest.slice(0, dot), schemaAndTable: rest.slice(dot + 1) }
  }
  return null
}

interface DiagramStore {
  nodes: ArchNode[]
  edges: ArchEdge[]
  diagramId: string | null
  projectId: string | null
  defaultBranchId: string | null
  diagramName: string
  diagramType: DiagramType
  isDirty: boolean

  // Breadcrumb for drill-down sub-diagrams
  breadcrumb: BreadcrumbItem[]

  setNodes: (nodes: ArchNode[]) => void
  setEdges: (edges: ArchEdge[]) => void
  onNodesChange: (changes: NodeChange<ArchNode>[]) => void
  onEdgesChange: (changes: EdgeChange<ArchEdge>[]) => void
  onConnect: (connection: Connection) => void
  addNode: (node: ArchNode) => void
  updateNodeData: (id: string, data: Partial<DiagramNodeData>) => void
  deleteNode: (id: string) => void
  updateEdge: (id: string, patch: { label?: string; data?: Partial<EdgeData>; targetHandle?: string }) => void
  deleteEdge: (id: string) => void
  loadDiagram: (opts: {
    id: string
    projectId: string
    defaultBranchId?: string
    name: string
    diagramType?: DiagramType
    nodes: ArchNode[]
    edges: ArchEdge[]
  }) => void
  markSaved: () => void
  reset: () => void

  // Breadcrumb navigation
  pushBreadcrumb: (item: BreadcrumbItem) => void
  popToIndex: (index: number) => void
  clearBreadcrumb: () => void
}

const INFRA_EDGE_DEFAULTS = {
  type: 'smoothstep',
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 14,
    height: 14,
    color: '#4a4f6a',
  },
  style: { stroke: '#4a4f6a', strokeWidth: 1.5 },
  data: { protocol: '' } as EdgeData,
}

const UML_EDGE_DEFAULTS = {
  type: UML_EDGE_TYPE,
  style: { stroke: '#4a4f6a', strokeWidth: 1.5 },
  data: { edgeKind: 'association' } as EdgeData,
}

export const useDiagramStore = create<DiagramStore>((set) => ({
  nodes: [],
  edges: [],
  diagramId: null,
  projectId: null,
  defaultBranchId: null,
  diagramName: 'Untitled Diagram',
  diagramType: 'architecture',
  isDirty: false,
  breadcrumb: [],

  setNodes: (nodes) => set({ nodes, isDirty: true }),
  setEdges: (edges) => set({ edges, isDirty: true }),

  onNodesChange: (changes) =>
    set((s) => ({ nodes: applyNodeChanges(changes, s.nodes), isDirty: true })),

  onEdgesChange: (changes) =>
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges), isDirty: true })),

  onConnect: (connection) =>
    set((s) => {
      if (!isInfraDiagramType(s.diagramType)) {
        // UML diagrams: simple edge with association default
        return {
          edges: addEdge({ ...UML_EDGE_DEFAULTS, ...connection }, s.edges),
          isDirty: true,
        }
      }
      // Infra diagrams: parse sub-handles for topic/queue/db targeting
      const sub = parseSubHandle(connection.targetHandle)
      const edgeData: EdgeData = { protocol: '' }
      if (sub) {
        if (sub.type === 'topic') edgeData.targetTopic = sub.name
        if (sub.type === 'queue') edgeData.targetQueue = sub.name
        if (sub.type === 'db')    edgeData.targetDatabase = sub.name
        if (sub.type === 'table') {
          edgeData.targetDatabase = sub.dbName
          const dot = sub.schemaAndTable.indexOf('.')
          if (dot === -1) {
            edgeData.targetTable = sub.schemaAndTable
          } else {
            edgeData.targetSchema = sub.schemaAndTable.slice(0, dot)
            edgeData.targetTable  = sub.schemaAndTable.slice(dot + 1)
          }
        }
      }
      return {
        edges: addEdge({ ...INFRA_EDGE_DEFAULTS, ...connection, data: edgeData }, s.edges),
        isDirty: true,
      }
    }),

  addNode: (node) =>
    set((s) => ({ nodes: [...s.nodes, node], isDirty: true })),

  updateNodeData: (id, data) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } as DiagramNodeData } : n
      ),
      isDirty: true,
    })),

  deleteNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      isDirty: true,
    })),

  updateEdge: (id, patch) =>
    set((s) => ({
      edges: s.edges.map((e) =>
        e.id === id
          ? {
              ...e,
              label: patch.label ?? e.label,
              data: { ...e.data, ...patch.data },
              ...(patch.targetHandle !== undefined ? { targetHandle: patch.targetHandle } : {}),
            }
          : e
      ),
      isDirty: true,
    })),

  deleteEdge: (id) =>
    set((s) => ({
      edges: s.edges.filter((e) => e.id !== id),
      isDirty: true,
    })),

  loadDiagram: ({ id, projectId, defaultBranchId, name, diagramType, nodes, edges }) =>
    set({
      diagramId: id,
      projectId,
      defaultBranchId: defaultBranchId ?? null,
      diagramName: name,
      diagramType: diagramType ?? 'architecture',
      nodes,
      edges,
      isDirty: false,
    }),

  markSaved: () => set({ isDirty: false }),

  reset: () =>
    set({
      nodes: [], edges: [], diagramId: null, projectId: null, defaultBranchId: null,
      diagramName: 'Untitled Diagram', diagramType: 'architecture', isDirty: false, breadcrumb: [],
    }),

  // Push current diagram onto breadcrumb, caller then loads child diagram
  pushBreadcrumb: (item) =>
    set((s) => ({ breadcrumb: [...s.breadcrumb, item] })),

  // Pop back to a specific ancestor (index = position in breadcrumb to restore)
  popToIndex: (index) =>
    set((s) => ({ breadcrumb: s.breadcrumb.slice(0, index) })),

  clearBreadcrumb: () => set({ breadcrumb: [] }),
}))
