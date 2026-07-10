import { type NodeProps } from '@xyflow/react'
import type { ArchNode, StateNodeData } from '../../types/diagram'
import { useUIStore } from '../../stores/ui'
import { NodeHandles } from './shared/NodeHandles'
import { NodeDeleteButton } from './shared/NodeDeleteButton'

const RING = 'ring-1 ring-violet-500/50 shadow-lg shadow-black/40'

export function StateNode({ data, selected, id }: NodeProps<ArchNode>) {
  const d = data as unknown as StateNodeData
  const { mode } = useUIStore()
  const isDesign = mode === 'design'

  // ── Initial pseudo-state (filled circle) ─────────────────────────────
  if (d.elementKind === 'initial-state') {
    return (
      <div className="relative">
        <NodeHandles />
        {isDesign && selected && <NodeDeleteButton nodeId={id} />}
        <div
          className={`
            w-8 h-8 rounded-full bg-violet-400 select-none
            transition-all duration-150
            ${selected ? RING : ''}
          `}
        />
      </div>
    )
  }

  // ── Final pseudo-state (bullseye) ─────────────────────────────────────
  if (d.elementKind === 'final-state') {
    return (
      <div className="relative">
        <NodeHandles />
        {isDesign && selected && <NodeDeleteButton nodeId={id} />}
        <div
          className={`
            w-10 h-10 rounded-full border-2 border-violet-400 bg-elevated
            flex items-center justify-center select-none transition-all duration-150
            ${selected ? RING : ''}
          `}
        >
          <div className="w-5 h-5 rounded-full bg-violet-400" />
        </div>
      </div>
    )
  }

  // ── Choice pseudo-state (diamond) ────────────────────────────────────
  if (d.elementKind === 'choice') {
    const size = 56
    const half = size / 2
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <NodeHandles />
        {isDesign && selected && <NodeDeleteButton nodeId={id} />}
        <svg width={size} height={size} className="overflow-visible">
          <polygon
            points={`${half},2 ${size - 2},${half} ${half},${size - 2} 2,${half}`}
            fill="#1a1c2e"
            stroke={selected ? '#c084fc' : '#a855f788'}
            strokeWidth="1.5"
          />
        </svg>
      </div>
    )
  }

  // ── History pseudo-state (circle with H) ─────────────────────────────
  if (d.elementKind === 'history') {
    return (
      <div className="relative">
        <NodeHandles />
        {isDesign && selected && <NodeDeleteButton nodeId={id} />}
        <div
          className={`
            w-10 h-10 rounded-full border-2 border-violet-500/50 bg-elevated
            flex items-center justify-center select-none transition-all
            ${selected ? RING : ''}
          `}
        >
          <span className="text-xs font-bold text-violet-400">{d.label || 'H'}</span>
        </div>
      </div>
    )
  }

  // ── Composite state ────────────────────────────────────────────────────
  if (d.elementKind === 'composite-state') {
    return (
      <div className="relative">
        <NodeHandles />
        {isDesign && selected && <NodeDeleteButton nodeId={id} />}
        <div
          className={`
            rounded-xl border-2 border-violet-500/50 bg-elevated select-none
            transition-all duration-150 min-w-[200px] min-h-[120px]
            ${selected ? RING : ''}
          `}
        >
          {/* State name */}
          <div className="px-3 py-2 border-b border-violet-500/30 text-center">
            <p className="text-xs font-semibold text-text-primary">{d.label}</p>
          </div>
          {/* Sub-states region */}
          <div className="px-3 py-3 min-h-[72px] flex items-center justify-center">
            <p className="text-[10px] text-[#4a4f6a] italic">sub-states</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Regular state ──────────────────────────────────────────────────────
  const hasActions = d.entryAction || d.doAction || d.exitAction

  return (
    <div className="relative">
      <NodeHandles />
      {isDesign && selected && <NodeDeleteButton nodeId={id} />}
      <div
        className={`
          rounded-xl border border-violet-500/40 bg-elevated select-none
          transition-all duration-150 min-w-[140px] max-w-[240px]
          ${selected ? RING : ''}
        `}
      >
        {/* State name */}
        <div className="px-3 py-2 text-center">
          <p className="text-xs font-semibold text-text-primary">{d.label}</p>
        </div>

        {/* Action compartments */}
        {hasActions && (
          <div className="border-t border-violet-500/20 px-3 py-1.5 space-y-0.5">
            {d.entryAction && (
              <p className="text-[10px] text-text-secondary font-mono">
                <span className="text-violet-400">entry</span> / {d.entryAction}
              </p>
            )}
            {d.doAction && (
              <p className="text-[10px] text-text-secondary font-mono">
                <span className="text-violet-400">do</span> / {d.doAction}
              </p>
            )}
            {d.exitAction && (
              <p className="text-[10px] text-text-secondary font-mono">
                <span className="text-violet-400">exit</span> / {d.exitAction}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
