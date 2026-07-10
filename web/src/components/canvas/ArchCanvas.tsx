import { useCallback, useMemo, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useDiagramStore } from '../../stores/diagram'
import { useUIStore } from '../../stores/ui'
import { getTech } from '../../lib/techRegistry'
import { isInfraDiagramType, getElementForDiagram } from '../../lib/elementRegistry'
import type { ArchNode, ArchEdge, NodeTechnology, ElementKind } from '../../types/diagram'
import { UmlMarkerDefs } from '../edges/UmlEdge'
import {
  INFRA_NODE_TYPES,
  UML_NODE_TYPES,
  UML_EDGE_TYPES,
  INFRA_EDGE_DEFAULTS,
  UML_EDGE_DEFAULTS,
} from './shared/nodeTypes'

export function ArchCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, diagramType } = useDiagramStore()
  const { inspector, selectNode, selectEdge, clearSelection } = useUIStore()
  const { screenToFlowPosition } = useReactFlow()
  const wrapper = useRef<HTMLDivElement>(null)

  const isInfra = isInfraDiagramType(diagramType)

  const nodeTypes = useMemo<NodeTypes>(() => {
    return isInfra ? INFRA_NODE_TYPES : UML_NODE_TYPES
  }, [isInfra])

  const edgeTypes = useMemo<EdgeTypes>(() => {
    return isInfra ? {} : UML_EDGE_TYPES
  }, [isInfra])

  const edgeDefaults = isInfra ? INFRA_EDGE_DEFAULTS : UML_EDGE_DEFAULTS

  // When nodes/edges are removed (e.g. via Delete key), clear the inspector
  // if the selected item is among those being deleted.
  const handleNodesChange = useCallback(
    (changes: NodeChange<ArchNode>[]) => {
      onNodesChange(changes)
      const removedIds = changes.filter((c) => c.type === 'remove').map((c) => c.id)
      if (inspector?.kind === 'node' && removedIds.includes(inspector.id)) {
        clearSelection()
      }
    },
    [onNodesChange, inspector, clearSelection]
  )

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<ArchEdge>[]) => {
      onEdgesChange(changes)
      const removedIds = changes.filter((c) => c.type === 'remove').map((c) => c.id)
      if (inspector?.kind === 'edge' && removedIds.includes(inspector.id)) {
        clearSelection()
      }
    },
    [onEdgesChange, inspector, clearSelection]
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })

      if (isInfra) {
        // Infrastructure drag-drop
        const tech = e.dataTransfer.getData('application/reactflow/tech') as NodeTechnology
        if (!tech) return
        const def = getTech(tech)
        const node: ArchNode = {
          id: crypto.randomUUID(),
          type: tech,
          position,
          data: {
            label:      def.label,
            technology: tech,
            category:   def.category,
            port:       def.defaultPort ?? '',
          },
        }
        addNode(node)
        selectNode(node.id)
      } else {
        // UML drag-drop
        const elementKind = e.dataTransfer.getData('application/reactflow/element') as ElementKind
        if (!elementKind) return
        const def = getElementForDiagram(elementKind, diagramType)
        const node: ArchNode = {
          id:       crypto.randomUUID(),
          type:     elementKind,
          position,
          data:     { ...def.defaultData } as ArchNode['data'],
        }
        addNode(node)
        selectNode(node.id)
      }
    },
    [screenToFlowPosition, addNode, selectNode, isInfra, diagramType]
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id)
    },
    [selectNode]
  )

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      selectEdge(edge.id)
    },
    [selectEdge]
  )

  const onPaneClick = useCallback(() => clearSelection(), [clearSelection])

  return (
    <div ref={wrapper} className="flex-1 h-full">
      {!isInfra && <UmlMarkerDefs />}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        defaultEdgeOptions={edgeDefaults}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.15}
        maxZoom={2.5}
        className="bg-base"
        deleteKeyCode={['Backspace', 'Delete']}
        edgesReconnectable
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.2}
          color="#2d3150"
        />
        <Controls position="bottom-right" />
        <MiniMap
          position="bottom-left"
          nodeColor="#2d3150"
          maskColor="rgba(13,15,26,0.75)"
          style={{ width: 140, height: 90 }}
        />
      </ReactFlow>
    </div>
  )
}
