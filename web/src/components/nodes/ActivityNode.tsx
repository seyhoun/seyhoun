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

  // ── Swim lane (dashed container) ─────────────────────────────────────
  if (d.elementKind === 'swim-lane') {
    return (
      <div className="relative">
        <NodeHandles />
        {isDesign && selected && <NodeDeleteButton nodeId={id} />}
        <div
          className={`
            rounded-lg border-2 border-dashed border-cyan-500/40 bg-elevated/30
            select-none transition-all duration-150 min-w-[240px] min-h-[160px]
            ${selectedRing}
          `}
        >
          <div className="px-3 py-1.5 border-b border-dashed border-cyan-500/30">
            <p className="text-[10px] font-semibold text-cyan-400 uppercase tracking-widest">
              {d.label || 'Lane'}
            </p>
          </div>
          <div className="p-3 min-h-[112px] flex items-center justify-center">
            <p className="text-[10px] text-[#4a4f6a] italic">drop activities here</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Send signal (pentagon pointing right) ────────────────────────────
  if (d.elementKind === 'signal-send') {
    const w = 140, h = 44, tip = 20
    return (
      <div className="relative" style={{ width: w, height: h }}>
        <NodeHandles />
        {isDesign && selected && <NodeDeleteButton nodeId={id} />}
        <svg width={w} height={h} className="overflow-visible">
          <polygon
            points={`0,0 ${w - tip},0 ${w},${h / 2} ${w - tip},${h} 0,${h}`}
            fill="#1a1c2e"
            stroke={selected ? '#22d3ee' : '#06b6d488'}
            strokeWidth="1.5"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center pr-4">
          <p className="text-[10px] font-semibold text-text-primary text-center leading-tight">
            {d.label}
          </p>
        </div>
      </div>
    )
  }

  // ── Receive signal (concave left edge) ───────────────────────────────
  if (d.elementKind === 'signal-receive') {
    const w = 140, h = 44, notch = 14
    return (
      <div className="relative" style={{ width: w, height: h }}>
        <NodeHandles />
        {isDesign && selected && <NodeDeleteButton nodeId={id} />}
        <svg width={w} height={h} className="overflow-visible">
          <polygon
            points={`0,0 ${w},0 ${w},${h} 0,${h} ${notch},${h / 2}`}
            fill="#1a1c2e"
            stroke={selected ? '#22d3ee' : '#06b6d488'}
            strokeWidth="1.5"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center pl-4">
          <p className="text-[10px] font-semibold text-text-primary text-center leading-tight">
            {d.label}
          </p>
        </div>
      </div>
    )
  }

  // ── Note (folded corner rectangle) ───────────────────────────────────
  if (d.elementKind === 'note') {
    const fold = 14
    return (
      <div className="relative" style={{ minWidth: 120, maxWidth: 220 }}>
        <NodeHandles />
        {isDesign && selected && <NodeDeleteButton nodeId={id} />}
        <div
          className={`
            bg-elevated border border-cyan-500/30 select-none transition-all duration-150
            ${selectedRing}
          `}
          style={{
            clipPath: `polygon(0 0, calc(100% - ${fold}px) 0, 100% ${fold}px, 100% 100%, 0 100%)`,
          }}
        >
          {/* Fold indicator */}
          <div
            className="absolute top-0 right-0 w-3.5 h-3.5 border-l border-b border-cyan-500/40 bg-elevated/80"
            style={{ clipPath: `polygon(0 0, 100% 100%, 0 100%)` }}
          />
          <div className="px-3 py-2.5 pr-5">
            <p className="text-[10px] text-text-secondary leading-snug whitespace-pre-wrap">
              {d.label}
            </p>
            {d.description && (
              <p className="text-[10px] text-text-muted mt-0.5 line-clamp-3">{d.description}</p>
            )}
          </div>
        </div>
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
