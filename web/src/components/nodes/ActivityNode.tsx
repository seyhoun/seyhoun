import { type NodeProps } from '@xyflow/react'
import type { ArchNode, ActivityNodeData } from '../../types/diagram'
import { useUIStore } from '../../stores/ui'
import { NodeHandles } from './shared/NodeHandles'
import { NodeDeleteButton } from './shared/NodeDeleteButton'

export function ActivityNode({ data, selected, id }: NodeProps<ArchNode>) {
  const d = data as unknown as ActivityNodeData
  const { mode } = useUIStore()
  const isDesign = mode === 'design'

  const selectedRing = selected ? 'ring-1 ring-cyan-500/50 shadow-lg shadow-black/40' : ''

  // ── Initial node (filled circle) ──────────────────────────────────────
  if (d.elementKind === 'initial-state') {
    return (
      <div className="relative">
        <NodeHandles />
        {isDesign && selected && <NodeDeleteButton nodeId={id} />}
        <div className={`w-8 h-8 rounded-full bg-cyan-400 select-none transition-all ${selected ? selectedRing : ''}`} />
      </div>
    )
  }

  // ── Final node (bullseye) ─────────────────────────────────────────────
  if (d.elementKind === 'final-state') {
    return (
      <div className="relative">
        <NodeHandles />
        {isDesign && selected && <NodeDeleteButton nodeId={id} />}
        <div className={`w-10 h-10 rounded-full border-2 border-cyan-400 bg-elevated flex items-center justify-center select-none transition-all ${selected ? selectedRing : ''}`}>
          <div className="w-5 h-5 rounded-full bg-cyan-400" />
        </div>
      </div>
    )
  }

  // ── Decision / Merge diamond ──────────────────────────────────────────
  if (d.elementKind === 'decision-merge') {
    const size = 80
    const half = size / 2
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <NodeHandles />
        {isDesign && selected && <NodeDeleteButton nodeId={id} />}
        <svg width={size} height={size} className="overflow-visible">
          <polygon
            points={`${half},2 ${size - 2},${half} ${half},${size - 2} 2,${half}`}
            fill="#1a1c2e"
            stroke={selected ? '#22d3ee' : '#06b6d488'}
            strokeWidth="1.5"
          />
        </svg>
        {selected && (
          <svg width={size} height={size} className="absolute inset-0 overflow-visible pointer-events-none">
            <polygon
              points={`${half},2 ${size - 2},${half} ${half},${size - 2} 2,${half}`}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2"
              opacity="0.4"
            />
          </svg>
        )}
      </div>
    )
  }

  // ── Fork / Join bar ───────────────────────────────────────────────────
  if (d.elementKind === 'fork-join') {
    return (
      <div className="relative">
        <NodeHandles />
        {isDesign && selected && <NodeDeleteButton nodeId={id} />}
        <div
          className={`
            h-3 rounded bg-cyan-400 select-none transition-all
            ${selected ? selectedRing : ''}
          `}
          style={{ width: 120 }}
        />
      </div>
    )
  }

  // ── Action (default — rounded rectangle) ──────────────────────────────
  return (
    <div className="relative">
      <NodeHandles />
      {isDesign && selected && <NodeDeleteButton nodeId={id} />}
      <div
        className={`
          px-4 py-2.5 rounded-2xl border border-cyan-500/40 bg-elevated
          select-none transition-all duration-150
          min-w-[120px] max-w-[220px]
          ${selectedRing}
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
