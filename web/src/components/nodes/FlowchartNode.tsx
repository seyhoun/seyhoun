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

  // ── Predefined process (double-bordered rectangle — subprocess) ─────
  if (d.elementKind === 'predefined-process') {
    return (
      <div className="relative">
        <NodeHandles />
        {isDesign && selected && <NodeDeleteButton nodeId={id} />}
        <div
          className={`
            px-4 py-2.5 rounded-lg border-2 bg-elevated select-none
            transition-all duration-150 min-w-[120px] max-w-[220px]
            ${colors.border} ${selectedRing}
          `}
        >
          <div className={`absolute inset-y-2 left-2 w-px ${colors.border} border-l`} />
          <div className={`absolute inset-y-2 right-2 w-px ${colors.border} border-r`} />
          <p className="text-xs font-semibold text-text-primary text-center leading-tight px-2">
            {d.label}
          </p>
        </div>
      </div>
    )
  }

  // ── Document (wavy-bottom rectangle) ────────────────────────────────
  if (d.elementKind === 'document') {
    const w = 140, h = 50
    return (
      <div className="relative" style={{ width: w, height: h + 10 }}>
        <NodeHandles />
        {isDesign && selected && <NodeDeleteButton nodeId={id} />}
        <svg width={w} height={h + 10} className="overflow-visible absolute inset-0">
          <path
            d={`M0,0 L${w},0 L${w},${h} Q${w * 0.75},${h + 14} ${w / 2},${h} Q${w * 0.25},${h - 14} 0,${h} Z`}
            fill="#1a1c2e"
            stroke={selected ? '#38bdf8' : '#0ea5e988'}
            strokeWidth="1.5"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center pb-2">
          <span className="text-[11px] font-semibold text-text-primary text-center px-2 leading-tight">
            {d.label}
          </span>
        </div>
      </div>
    )
  }

  // ── Preparation (hexagon) ────────────────────────────────────────────
  if (d.elementKind === 'preparation') {
    const w = 140, h = 48, notch = 20
    return (
      <div className="relative" style={{ width: w, height: h }}>
        <NodeHandles />
        {isDesign && selected && <NodeDeleteButton nodeId={id} />}
        <svg width={w} height={h} className="overflow-visible">
          <polygon
            points={`${notch},0 ${w - notch},0 ${w},${h / 2} ${w - notch},${h} ${notch},${h} 0,${h / 2}`}
            fill="#1a1c2e"
            stroke={selected ? '#fbbf24' : '#d97706aa'}
            strokeWidth="1.5"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-semibold text-text-primary text-center px-6 leading-tight">
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
