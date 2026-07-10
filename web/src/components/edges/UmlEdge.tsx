import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react'
import type { ArchEdge, EdgeData } from '../../types/diagram'

// SVG marker IDs — injected into the React Flow SVG via <defs>
export const UML_MARKER_IDS = {
  hollowTriangle:   'uml-hollow-triangle',
  filledDiamond:    'uml-filled-diamond',
  hollowDiamond:    'uml-hollow-diamond',
  openArrow:        'uml-open-arrow',
  filledArrow:      'uml-filled-arrow',
  halfOpenArrow:    'uml-half-open-arrow',
  destroyX:         'uml-destroy-x',
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

        {/* Dependency / include / extend — open arrowhead */}
        <marker
          id={UML_MARKER_IDS.openArrow}
          markerWidth="10" markerHeight="10"
          refX="9" refY="5"
          orient="auto"
        >
          <polyline points="1,1 9,5 1,9" fill="none" stroke="#6b7280" strokeWidth="1.5" />
        </marker>

        {/* Sequence sync call — filled arrowhead */}
        <marker
          id={UML_MARKER_IDS.filledArrow}
          markerWidth="10" markerHeight="10"
          refX="9" refY="5"
          orient="auto"
        >
          <polygon points="0,0 10,5 0,10" fill="#fb7185" stroke="none" />
        </marker>

        {/* Sequence async / return — half-open arrowhead */}
        <marker
          id={UML_MARKER_IDS.halfOpenArrow}
          markerWidth="10" markerHeight="10"
          refX="9" refY="5"
          orient="auto"
        >
          <polyline points="0,0 10,5 0,10" fill="none" stroke="#fb7185" strokeWidth="1.5" />
        </marker>

        {/* Sequence destroy — X marker */}
        <marker
          id={UML_MARKER_IDS.destroyX}
          markerWidth="12" markerHeight="12"
          refX="6" refY="6"
          orient="auto"
        >
          <line x1="1" y1="1" x2="11" y2="11" stroke="#fb7185" strokeWidth="2" />
          <line x1="11" y1="1" x2="1" y2="11" stroke="#fb7185" strokeWidth="2" />
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
  const edgeKind   = d.edgeKind ?? 'association'
  const messageType = d.messageType

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  const selectedColor = selected ? '#a5b4fc' : '#4a4f6a'
  const strokeWidth   = selected ? 2 : 1.5

  // ── Sequence diagram: messageType-based rendering ─────────────────
  if (messageType) {
    const isReturn  = messageType === 'return'
    const isAsync   = messageType === 'async'
    const isCreate  = messageType === 'create'
    const isDestroy = messageType === 'destroy'

    const seqColor  = selected ? '#fda4af' : '#fb7185'
    const isDashed  = isReturn || isCreate
    let markerEnd: string | undefined

    if (isDestroy) {
      markerEnd = `url(#${UML_MARKER_IDS.destroyX})`
    } else if (isAsync || isReturn) {
      markerEnd = `url(#${UML_MARKER_IDS.halfOpenArrow})`
    } else {
      // sync, create
      markerEnd = `url(#${UML_MARKER_IDS.filledArrow})`
    }

    const autoLabel = isCreate ? '«create»' : isDestroy ? '«destroy»' : ''
    const displayLabel = (d.label as string | undefined) ?? autoLabel

    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          style={{
            stroke: seqColor,
            strokeWidth,
            strokeDasharray: isDashed ? '6 3' : undefined,
            markerEnd,
          }}
        />
        <EdgeLabelRenderer>
          {displayLabel && (
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                pointerEvents: 'all',
              }}
              className="bg-elevated/80 text-[10px] text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/30 font-mono select-none"
            >
              {displayLabel}
            </div>
          )}
        </EdgeLabelRenderer>
      </>
    )
  }

  // ── Standard UML edge rendering ────────────────────────────────────
  const isDashed = edgeKind === 'dependency' || edgeKind === 'realization'
    || edgeKind === 'include' || edgeKind === 'extend'

  let markerEnd: string | undefined
  let markerStart: string | undefined

  switch (edgeKind) {
    case 'inheritance':
    case 'realization':
      markerEnd = `url(#${UML_MARKER_IDS.hollowTriangle})`
      break
    case 'composition':
      markerStart = `url(#${UML_MARKER_IDS.filledDiamond})`
      break
    case 'aggregation':
      markerStart = `url(#${UML_MARKER_IDS.hollowDiamond})`
      break
    case 'dependency':
    case 'include':
    case 'extend':
      markerEnd = `url(#${UML_MARKER_IDS.openArrow})`
      break
    default:
      // association, transition — plain line, no marker (or small closed arrow added below)
      break
  }

  // Association and transition get a simple open arrow
  if (!markerEnd && !markerStart) {
    markerEnd = `url(#${UML_MARKER_IDS.openArrow})`
  }

  // Effective label
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
          stroke: selectedColor,
          strokeWidth,
          strokeDasharray: isDashed ? '6 3' : undefined,
          markerEnd,
          markerStart,
        }}
      />

      <EdgeLabelRenderer>
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
