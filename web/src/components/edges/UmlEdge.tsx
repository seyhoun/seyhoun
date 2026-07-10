import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react'
import type { ArchEdge, EdgeData } from '../../types/diagram'

// SVG marker IDs — injected into the React Flow SVG via <defs>
export const UML_MARKER_IDS = {
  hollowTriangle:  'uml-hollow-triangle',
  filledDiamond:   'uml-filled-diamond',
  hollowDiamond:   'uml-hollow-diamond',
  openArrow:       'uml-open-arrow',
}

/** Inject SVG marker defs once into the page. Call this in ArchCanvas. */
export function UmlMarkerDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <defs>
        {/* Inheritance / Realization — hollow triangle */}
        <marker
          id={UML_MARKER_IDS.hollowTriangle}
          markerWidth="12" markerHeight="10"
          refX="10" refY="5"
          orient="auto"
        >
          <polygon points="0,0 10,5 0,10" fill="#1a1c2e" stroke="#6b7280" strokeWidth="1" />
        </marker>

        {/* Composition — filled diamond */}
        <marker
          id={UML_MARKER_IDS.filledDiamond}
          markerWidth="14" markerHeight="10"
          refX="0" refY="5"
          orient="auto"
        >
          <polygon points="0,5 5,0 10,5 5,10" fill="#6366f1" stroke="#6366f1" strokeWidth="0.5" />
        </marker>

        {/* Aggregation — hollow diamond */}
        <marker
          id={UML_MARKER_IDS.hollowDiamond}
          markerWidth="14" markerHeight="10"
          refX="0" refY="5"
          orient="auto"
        >
          <polygon points="0,5 5,0 10,5 5,10" fill="#1a1c2e" stroke="#6b7280" strokeWidth="1" />
        </marker>

        {/* Dependency — open arrowhead */}
        <marker
          id={UML_MARKER_IDS.openArrow}
          markerWidth="10" markerHeight="10"
          refX="9" refY="5"
          orient="auto"
        >
          <polyline points="1,1 9,5 1,9" fill="none" stroke="#6b7280" strokeWidth="1.5" />
        </marker>
      </defs>
    </svg>
  )
}

export function UmlEdge({
  id,
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition, targetPosition,
  data,
  label,
  selected,
}: EdgeProps<ArchEdge>) {
  const d = (data ?? {}) as EdgeData
  const edgeKind = d.edgeKind ?? 'association'

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  // Stroke style
  const isDashed    = edgeKind === 'dependency' || edgeKind === 'realization' || edgeKind === 'include' || edgeKind === 'extend'
  const strokeColor = selected ? '#a5b4fc' : '#4a4f6a'
  const strokeWidth = selected ? 2 : 1.5

  // Marker at end (target side)
  let markerEnd: string | undefined
  // Marker at start (source side) — for composition/aggregation diamonds
  let markerStart: string | undefined

  switch (edgeKind) {
    case 'inheritance':
    case 'realization':
      markerEnd = `url(#${UML_MARKER_IDS.hollowTriangle})`
      break
    case 'composition':
      markerStart = `url(#${UML_MARKER_IDS.filledDiamond})`
      markerEnd   = undefined
      break
    case 'aggregation':
      markerStart = `url(#${UML_MARKER_IDS.hollowDiamond})`
      markerEnd   = undefined
      break
    case 'dependency':
    case 'include':
    case 'extend':
      markerEnd = `url(#${UML_MARKER_IDS.openArrow})`
      break
    default:
      // association, transition — use default closed arrowhead
      markerEnd = undefined
      break
  }

  // Effective label: prefer data.label, then the edge label prop, then stereotype for include/extend
  let displayLabel = (d.label as string | undefined) ?? (label as string | undefined) ?? ''
  if (!displayLabel && edgeKind === 'include')  displayLabel = '«include»'
  if (!displayLabel && edgeKind === 'extend')   displayLabel = '«extend»'

  // Guard + action for transitions
  const transitionLabel = d.guard || d.action
    ? [d.guard ? `[${d.guard as string}]` : '', d.action ? `/ ${d.action as string}` : ''].filter(Boolean).join(' ')
    : ''

  const fullLabel = displayLabel || transitionLabel

  // Cardinality
  const cardSource = (d.cardinality as { source?: string; target?: string } | undefined)?.source
  const cardTarget = (d.cardinality as { source?: string; target?: string } | undefined)?.target

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray: isDashed ? '6 3' : undefined,
          markerEnd,
          markerStart,
        }}
      />

      <EdgeLabelRenderer>
        {/* Main label */}
        {fullLabel && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="bg-elevated/80 text-[10px] text-[#c4c7e0] px-1.5 py-0.5 rounded border border-border font-mono select-none"
          >
            {fullLabel}
          </div>
        )}

        {/* Cardinality labels */}
        {cardSource && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${sourceX}px,${sourceY - 14}px)`,
              pointerEvents: 'none',
            }}
            className="text-[10px] text-text-secondary select-none font-mono"
          >
            {cardSource}
          </div>
        )}
        {cardTarget && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${targetX}px,${targetY - 14}px)`,
              pointerEvents: 'none',
            }}
            className="text-[10px] text-text-secondary select-none font-mono"
          >
            {cardTarget}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  )
}
