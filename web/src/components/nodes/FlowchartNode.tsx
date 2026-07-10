import { type NodeProps } from '@xyflow/react'
import type { ArchNode, FlowchartNodeData } from '../../types/diagram'
import { getElement } from '../../lib/elementRegistry'
import { useUIStore } from '../../stores/ui'
import { NodeHandles } from './shared/NodeHandles'
import { NodeDeleteButton } from './shared/NodeDeleteButton'

export function FlowchartNode({ data, selected, id }: NodeProps<ArchNode>) {
  const d = data as unknown as FlowchartNodeData
  const { mode } = useUIStore()
  const isDesign = mode === 'design'

  const element = getElement(d.elementKind ?? 'process')
  const { colors } = element

  const selectedRing = selected ? `ring-1 ${colors.ring} shadow-lg shadow-black/40` : ''

  // ── Decision diamond ────────────────────────────────────────────────
  if (d.elementKind === 'decision') {
    const size = 96
    const half = size / 2
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <NodeHandles />
        {isDesign && selected && <NodeDeleteButton nodeId={id} />}
        <svg width={size} height={size} className="overflow-visible">
          <polygon
            points={`${half},2 ${size - 2},${half} ${half},${size - 2} 2,${half}`}
            className={`fill-elevated transition-all duration-150 ${selected ? 'opacity-100' : ''}`}
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ color: selected ? '#f59e0b' : '#d97706aa' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[11px] font-semibold text-text-primary text-center px-2 leading-tight">
            {d.label}
          </span>
        </div>
        {selected && (
          <div className="absolute inset-0 pointer-events-none">
            <svg width={size} height={size} className="overflow-visible">
              <polygon
                points={`${half},2 ${size - 2},${half} ${half},${size - 2} 2,${half}`}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                opacity="0.5"
              />
            </svg>
          </div>
        )}
      </div>
    )
  }

  // ── Terminal (stadium/oval) ──────────────────────────────────────────
  if (d.elementKind === 'terminal') {
    return (
      <div className="relative">
        <NodeHandles />
        {isDesign && selected && <NodeDeleteButton nodeId={id} />}
        <div
          className={`
            px-5 py-2 rounded-full border bg-elevated select-none
            transition-all duration-150 min-w-[80px] text-center
            ${colors.border} ${selectedRing}
          `}
        >
          <span className="text-xs font-semibold text-text-primary">{d.label}</span>
        </div>
      </div>
    )
  }

  // ── Connector (small circle with letter) ─────────────────────────────
  if (d.elementKind === 'connector') {
    return (
      <div className="relative">
        <NodeHandles />
        {isDesign && selected && <NodeDeleteButton nodeId={id} />}
        <div
          className={`
            w-10 h-10 rounded-full border bg-elevated select-none
            flex items-center justify-center
            transition-all duration-150
            ${colors.border} ${selectedRing}
          `}
        >
          <span className="text-xs font-bold text-text-primary">{d.label?.charAt(0) ?? 'A'}</span>
        </div>
      </div>
    )
  }

  // ── IO box (parallelogram via CSS skew) ──────────────────────────────
  if (d.elementKind === 'io-box') {
    return (
      <div className="relative" style={{ transform: 'skewX(-15deg)' }}>
        <NodeHandles />
        {isDesign && selected && <NodeDeleteButton nodeId={id} style={{ transform: 'skewX(15deg)' }} />}
        <div
          className={`
            px-4 py-2 rounded border bg-elevated select-none min-w-[120px]
            transition-all duration-150
            ${colors.border} ${selectedRing}
          `}
        >
          <span
            className="text-xs font-semibold text-text-primary block text-center"
            style={{ transform: 'skewX(15deg)', display: 'inline-block', width: '100%' }}
          >
            {d.label}
          </span>
        </div>
      </div>
    )
  }

  // ── Process (default — rounded rectangle) ──────────────────────────
  return (
    <div className="relative">
      <NodeHandles />
      {isDesign && selected && <NodeDeleteButton nodeId={id} />}
      <div
        className={`
          px-4 py-2.5 rounded-lg border bg-elevated select-none
          transition-all duration-150 min-w-[120px] max-w-[220px]
          ${colors.border} ${selectedRing}
        `}
      >
        <p className="text-xs font-semibold text-text-primary text-center leading-tight">
          {d.label}
        </p>
        {d.description && (
          <p className="mt-1 text-[10px] text-text-secondary text-center line-clamp-2">
            {d.description}
          </p>
        )}
      </div>
    </div>
  )
}
