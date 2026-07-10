import { type NodeProps } from '@xyflow/react'
import type { ArchNode, EntityNodeData } from '../../types/diagram'
import { useUIStore } from '../../stores/ui'
import { NodeHandles } from './shared/NodeHandles'
import { NodeDeleteButton } from './shared/NodeDeleteButton'

export function EntityNode({ data, selected, id }: NodeProps<ArchNode>) {
  const d = data as unknown as EntityNodeData
  const { mode } = useUIStore()
  const isDesign = mode === 'design'

  const attrs = d.attributes ?? []

  return (
    <div className="relative">
      <NodeHandles />
      {isDesign && selected && <NodeDeleteButton nodeId={id} />}

      <div
        className={`
          bg-elevated select-none transition-all duration-150
          min-w-[160px] max-w-[280px]
          ${d.isWeak
            ? 'border-2 border-teal-500/40 rounded-lg shadow-[inset_0_0_0_3px_#0d0f1a,inset_0_0_0_4.5px_rgba(20,184,166,0.4)]'
            : 'border border-teal-500/40 rounded-lg'
          }
          ${selected ? 'ring-1 ring-teal-500/50 shadow-lg shadow-black/40' : ''}
        `}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-teal-500/20 text-center">
          <p className="text-xs font-bold text-text-primary">{d.label}</p>
          {d.isWeak && (
            <p className="text-[9px] text-teal-400 mt-0.5">weak entity</p>
          )}
        </div>

        {/* Attributes */}
        <div className="px-3 py-1.5 min-h-[28px]">
          {attrs.length === 0 ? (
            <p className="text-[10px] text-[#4a4f6a] italic text-center">attributes</p>
          ) : (
            <div className="space-y-0.5">
              {attrs.map((a) => (
                <p key={a.id} className="text-[10px] text-[#c4c7e0] font-mono flex items-center gap-1 truncate">
                  {a.isPK && <span className="text-amber-400 shrink-0">PK</span>}
                  {a.isFK && <span className="text-sky-400 shrink-0">FK</span>}
                  <span className={a.isPK ? 'underline' : ''}>{a.name}</span>
                  <span className="text-text-muted">: {a.type}</span>
                  {a.isNullable && <span className="text-text-muted shrink-0">?</span>}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
