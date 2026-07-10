/**
 * Shared React Flow node type and edge type registries.
 * Imported by both ArchCanvas (editable) and ViewCanvas (read-only).
 */
import { MarkerType, type NodeTypes, type EdgeTypes } from '@xyflow/react'
import { TECH_MAP } from '../../../lib/techRegistry'
import { UML_EDGE_TYPE } from '../../../lib/elementRegistry'
import { BaseNode } from '../../nodes/BaseNode'
import { FlowchartNode } from '../../nodes/FlowchartNode'
import { StateNode } from '../../nodes/StateNode'
import { ClassNode } from '../../nodes/ClassNode'
import { EntityNode } from '../../nodes/EntityNode'
import { ActivityNode } from '../../nodes/ActivityNode'
import { ActorNode } from '../../nodes/ActorNode'
import { UseCaseNode } from '../../nodes/UseCaseNode'
import { SystemBoundaryNode } from '../../nodes/SystemBoundaryNode'
import { LifelineNode, MessageNode } from '../../nodes/LifelineNode'
import { FragmentNode } from '../../nodes/FragmentNode'
import { UmlEdge } from '../../edges/UmlEdge'

/** Every infrastructure technology key maps to the generic BaseNode renderer. */
export const INFRA_NODE_TYPES: NodeTypes = Object.fromEntries(
  Array.from(TECH_MAP.keys()).map((tech) => [tech, BaseNode])
)

/** UML element kinds mapped to their specialised node renderers. */
export const UML_NODE_TYPES: NodeTypes = {
  // Flowchart
  'process':           FlowchartNode,
  'decision':          FlowchartNode,
  'terminal':          FlowchartNode,
  'io-box':            FlowchartNode,
  'predefined-process':FlowchartNode,
  'document':          FlowchartNode,
  'preparation':       FlowchartNode,
  'connector':         FlowchartNode,
  // State machine
  'state':             StateNode,
  'initial-state':     StateNode,
  'final-state':       StateNode,
  'composite-state':   StateNode,
  'choice':            StateNode,
  'history':           StateNode,
  // Class
  'class-box':         ClassNode,
  'interface-box':     ClassNode,
  'abstract-class':    ClassNode,
  'enum-box':          ClassNode,
  'package':           ClassNode,
  // ER
  'entity':            EntityNode,
  'weak-entity':       EntityNode,
  'relationship':      EntityNode,
  // Activity
  'action':            ActivityNode,
  'decision-merge':    ActivityNode,
  'fork-join':         ActivityNode,
  'swim-lane':         ActivityNode,
  'signal-send':       ActivityNode,
  'signal-receive':    ActivityNode,
  'note':              ActivityNode,
  // Use case
  'actor':             ActorNode,
  'use-case':          UseCaseNode,
  'system-boundary':   SystemBoundaryNode,
  // Sequence
  'lifeline':          LifelineNode,
  'boundary-lifeline': LifelineNode,
  'control-lifeline':  LifelineNode,
  'entity-lifeline':   LifelineNode,
  'message':           MessageNode,
  'fragment':          FragmentNode,
}

/** Custom edge types for UML diagrams. */
export const UML_EDGE_TYPES: EdgeTypes = {
  [UML_EDGE_TYPE]: UmlEdge,
}

/** Default edge style for infrastructure diagrams. */
export const INFRA_EDGE_DEFAULTS = {
  type: 'smoothstep',
  markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#4a4f6a' },
  style: { stroke: '#4a4f6a', strokeWidth: 1.5 },
}

/** Default edge style for UML diagrams (data is set per-diagram in onConnect). */
export const UML_EDGE_DEFAULTS = {
  type: UML_EDGE_TYPE,
  style: { stroke: '#4a4f6a', strokeWidth: 1.5 },
}
