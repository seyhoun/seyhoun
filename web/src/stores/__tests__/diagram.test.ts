import { describe, it, expect, beforeEach } from 'vitest'
import { useDiagramStore } from '../diagram'
import type { ArchNode, ArchEdge } from '../../types/diagram'

function makeNode(id: string, label = 'Node'): ArchNode {
  return {
    id,
    type: 'postgresql',
    position: { x: 0, y: 0 },
    data: { label, technology: 'postgresql', category: 'datastore' },
  } as unknown as ArchNode
}

function makeEdge(id: string, source: string, target: string): ArchEdge {
  return {
    id,
    source,
    target,
    type: 'smoothstep',
    data: { protocol: '' },
  } as ArchEdge
}

beforeEach(() => {
  useDiagramStore.getState().reset()
})

describe('loadDiagram', () => {
  it('sets nodes, edges, id, name and clears isDirty', () => {
    const nodes = [makeNode('n1')]
    const edges = [makeEdge('e1', 'n1', 'n2')]

    useDiagramStore.getState().loadDiagram({
      id: 'diag-1',
      projectId: 'proj-1',
      name: 'My Diagram',
      nodes,
      edges,
    })

    const s = useDiagramStore.getState()
    expect(s.diagramId).toBe('diag-1')
    expect(s.projectId).toBe('proj-1')
    expect(s.diagramName).toBe('My Diagram')
    expect(s.nodes).toHaveLength(1)
    expect(s.edges).toHaveLength(1)
    expect(s.isDirty).toBe(false)
  })
})

describe('addNode', () => {
  it('appends a node and sets isDirty', () => {
    useDiagramStore.getState().addNode(makeNode('n1'))
    const s = useDiagramStore.getState()
    expect(s.nodes).toHaveLength(1)
    expect(s.nodes[0].id).toBe('n1')
    expect(s.isDirty).toBe(true)
  })
})

describe('deleteNode', () => {
  it('removes the node and all connected edges', () => {
    const store = useDiagramStore.getState()
    store.addNode(makeNode('n1'))
    store.addNode(makeNode('n2'))

    // Add an edge via setEdges to bypass the connect flow
    useDiagramStore.setState({
      edges: [makeEdge('e1', 'n1', 'n2'), makeEdge('e2', 'n2', 'n1')],
    })

    useDiagramStore.getState().deleteNode('n1')

    const s = useDiagramStore.getState()
    expect(s.nodes.map((n) => n.id)).toEqual(['n2'])
    expect(s.edges).toHaveLength(0) // both edges connected to n1 are removed
  })
})

describe('updateNodeData', () => {
  it('shallow-merges data into the target node', () => {
    useDiagramStore.getState().addNode(makeNode('n1', 'Original'))
    useDiagramStore.getState().updateNodeData('n1', { label: 'Updated', host: 'localhost' })

    const node = useDiagramStore.getState().nodes.find((n) => n.id === 'n1')!
    expect(node.data.label).toBe('Updated')
    expect(node.data.host).toBe('localhost')
    expect(node.data.technology).toBe('postgresql') // unchanged field preserved
  })
})

describe('deleteEdge', () => {
  it('removes only the target edge', () => {
    useDiagramStore.setState({
      edges: [makeEdge('e1', 'a', 'b'), makeEdge('e2', 'b', 'c')],
    })

    useDiagramStore.getState().deleteEdge('e1')

    const s = useDiagramStore.getState()
    expect(s.edges).toHaveLength(1)
    expect(s.edges[0].id).toBe('e2')
    expect(s.isDirty).toBe(true)
  })
})

describe('markSaved', () => {
  it('clears isDirty without changing nodes or edges', () => {
    useDiagramStore.getState().addNode(makeNode('n1'))
    expect(useDiagramStore.getState().isDirty).toBe(true)

    useDiagramStore.getState().markSaved()
    expect(useDiagramStore.getState().isDirty).toBe(false)
    expect(useDiagramStore.getState().nodes).toHaveLength(1) // data intact
  })
})

describe('breadcrumb', () => {
  it('pushes items and pops back to an index', () => {
    const store = useDiagramStore.getState()
    store.pushBreadcrumb({ diagramId: 'root', diagramName: 'Root' })
    store.pushBreadcrumb({ diagramId: 'child', diagramName: 'Child' })

    expect(useDiagramStore.getState().breadcrumb).toHaveLength(2)

    useDiagramStore.getState().popToIndex(1) // keep only first item
    expect(useDiagramStore.getState().breadcrumb).toHaveLength(1)
    expect(useDiagramStore.getState().breadcrumb[0].diagramId).toBe('root')
  })

  it('clearBreadcrumb empties the stack', () => {
    useDiagramStore.getState().pushBreadcrumb({ diagramId: 'a', diagramName: 'A' })
    useDiagramStore.getState().clearBreadcrumb()
    expect(useDiagramStore.getState().breadcrumb).toHaveLength(0)
  })
})

describe('reset', () => {
  it('restores all state to defaults', () => {
    const store = useDiagramStore.getState()
    store.loadDiagram({ id: 'x', projectId: 'y', name: 'Z', nodes: [makeNode('n1')], edges: [] })
    store.pushBreadcrumb({ diagramId: 'a', diagramName: 'A' })

    store.reset()

    const s = useDiagramStore.getState()
    expect(s.nodes).toHaveLength(0)
    expect(s.edges).toHaveLength(0)
    expect(s.diagramId).toBeNull()
    expect(s.projectId).toBeNull()
    expect(s.diagramName).toBe('Untitled Diagram')
    expect(s.isDirty).toBe(false)
    expect(s.breadcrumb).toHaveLength(0)
  })
})
