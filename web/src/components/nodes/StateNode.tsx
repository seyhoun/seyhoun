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
