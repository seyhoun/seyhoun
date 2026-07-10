import { type NodeProps } from '@xyflow/react'
import type { ArchNode, ClassNodeData } from '../../types/diagram'
import { useUIStore } from '../../stores/ui'
import { NodeHandles } from './shared/NodeHandles'
import { NodeDeleteButton } from './shared/NodeDeleteButton'

export function ClassNode({ data, selected, id }: NodeProps<ArchNode>) {
  const d = data as unknown as ClassNodeData
  const { mode } = useUIStore()
  const isDesign = mode === 'design'

  const attrs = d.attributes ?? []
  const methods = d.methods ?? []

  return (
    <div className="relative">
      <NodeHandles />
      {isDesign && selected && <NodeDeleteButton nodeId={id} />}

      <div
        className={`
          rounded-lg border border-indigo-500/40 bg-elevated select-none
          transition-all duration-150 min-w-[160px] max-w-[280px]
          ${selected ? 'ring-1 ring-indigo-500/50 shadow-lg shadow-black/40' : ''}
        `}
      >
        {/* Header: stereotype + name */}
        <div className="px-3 py-2 border-b border-indigo-500/20 text-center">
          {d.stereotype && (
            <p className="text-[9px] text-indigo-400 mb-0.5">«{d.stereotype}»</p>
          )}
          <p className="text-xs font-bold text-text-primary">{d.label}</p>
        </div>

        {/* Attributes compartment */}
        <div className="px-3 py-1.5 border-b border-indigo-500/20 min-h-[28px]">
          {attrs.length === 0 ? (
            <p className="text-[10px] text-[#4a4f6a] italic text-center">attributes</p>
          ) : (
            <div className="space-y-0.5">
              {attrs.map((a) => (
                <p key={a.id} className="text-[10px] text-[#c4c7e0] font-mono truncate">
                  <span className="text-indigo-400">{a.visibility}</span>
                  {' '}{a.name}: {a.type}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Methods compartment */}
        <div className="px-3 py-1.5 min-h-[28px]">
          {methods.length === 0 ? (
            <p className="text-[10px] text-[#4a4f6a] italic text-center">methods</p>
          ) : (
            <div className="space-y-0.5">
              {methods.map((m) => (
                <p key={m.id} className={`text-[10px] text-[#c4c7e0] font-mono truncate ${m.isAbstract ? 'italic' : ''}`}>
                  <span className="text-indigo-400">{m.visibility}</span>
                  {' '}{m.name}({m.params}): {m.returnType}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
