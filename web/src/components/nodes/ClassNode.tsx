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
  const RING = selected ? 'ring-1 ring-indigo-500/50 shadow-lg shadow-black/40' : ''

  // ── Package (folder-tab shape) ────────────────────────────────────────
  if (d.stereotype === 'package') {
    return (
      <div className="relative">
        <NodeHandles />
        {isDesign && selected && <NodeDeleteButton nodeId={id} />}
        <div className={`select-none transition-all min-w-[160px] max-w-[260px] ${RING}`}>
          {/* Tab */}
          <div className="inline-block px-3 py-1 rounded-t-md border border-b-0 border-indigo-500/40 bg-elevated">
            <p className="text-[10px] font-semibold text-indigo-300">{d.label}</p>
          </div>
          {/* Body */}
          <div className="border border-indigo-500/40 rounded-b-md rounded-tr-md bg-elevated/50 min-h-[60px] p-3 flex items-center justify-center">
            <p className="text-[10px] text-[#4a4f6a] italic">contents</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Enumeration ───────────────────────────────────────────────────────
  if (d.stereotype === 'enumeration') {
    return (
      <div className="relative">
        <NodeHandles />
        {isDesign && selected && <NodeDeleteButton nodeId={id} />}
        <div
          className={`
            rounded-lg border border-indigo-500/40 bg-elevated select-none
            transition-all duration-150 min-w-[140px] max-w-[240px] ${RING}
          `}
        >
          <div className="px-3 py-2 border-b border-indigo-500/20 text-center">
            <p className="text-[9px] text-indigo-400 mb-0.5">«enumeration»</p>
            <p className="text-xs font-bold text-text-primary">{d.label}</p>
          </div>
          <div className="px-3 py-1.5 min-h-[28px]">
            {attrs.length === 0 ? (
              <p className="text-[10px] text-[#4a4f6a] italic text-center">literals</p>
            ) : (
              <div className="space-y-0.5">
                {attrs.map((a) => (
                  <p key={a.id} className="text-[10px] text-[#c4c7e0] font-mono truncate">{a.name}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Abstract class ────────────────────────────────────────────────────
  // Falls through to the same 3-compartment layout as a regular class,
  // but the name is rendered in italics to indicate abstraction.

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
          {d.stereotype && d.stereotype !== 'abstract' && (
            <p className="text-[9px] text-indigo-400 mb-0.5">«{d.stereotype}»</p>
          )}
          <p className={`text-xs font-bold text-text-primary ${d.stereotype === 'abstract' ? 'italic' : ''}`}>{d.label}</p>
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
