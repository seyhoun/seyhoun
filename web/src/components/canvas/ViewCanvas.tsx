import { useMemo } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useDiagramStore } from '../../stores/diagram'
import { isInfraDiagramType } from '../../lib/elementRegistry'
import { UmlMarkerDefs } from '../edges/UmlEdge'
import {
  INFRA_NODE_TYPES,
  UML_NODE_TYPES,
  UML_EDGE_TYPES,
  INFRA_EDGE_DEFAULTS,
  UML_EDGE_DEFAULTS,
} from './shared/nodeTypes'

interface ViewCanvasProps {
  /** Animate all edges — used by monitor mode to show data flow */
  animateEdges?: boolean
  onNodeClick?: (nodeId: string) => void
}

export function ViewCanvas({ animateEdges = false, onNodeClick }: ViewCanvasProps) {
  const { nodes, edges, diagramType } = useDiagramStore()

  const isInfra = isInfraDiagramType(diagramType)

  const nodeTypes = useMemo<NodeTypes>(() => isInfra ? INFRA_NODE_TYPES : UML_NODE_TYPES, [isInfra])
  const edgeTypes = useMemo<EdgeTypes>(() => isInfra ? {} : UML_EDGE_TYPES, [isInfra])
  const edgeDefaults = isInfra ? INFRA_EDGE_DEFAULTS : UML_EDGE_DEFAULTS

  const viewEdges = useMemo(
    () => edges.map((e) => ({ ...e, animated: animateEdges })),
    [edges, animateEdges]
  )

  return (
    // arch-readonly disables handle visibility via CSS
    <div className="flex-1 h-full arch-readonly">
      {!isInfra && <UmlMarkerDefs />}
      <ReactFlow
        nodes={nodes}
        edges={viewEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.15}
        maxZoom={2.5}
        defaultEdgeOptions={edgeDefaults}
        onNodeClick={onNodeClick ? (_, n) => onNodeClick(n.id) : undefined}
        className="bg-base"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="#2d3150" />
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
