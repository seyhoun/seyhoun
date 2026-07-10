import { useUIStore } from '../../stores/ui'
import { useDiagramStore } from '../../stores/diagram'
import type { FlowchartNodeData, ElementKind } from '../../types/diagram'

const SHAPES: { value: ElementKind; label: string }[] = [
  { value: 'process',             label: 'Process' },
  { value: 'predefined-process',  label: 'Predefined Process (Subprocess)' },
  { value: 'decision',            label: 'Decision' },
  { value: 'terminal',            label: 'Terminal (Start / End)' },
  { value: 'io-box',              label: 'Input / Output' },
  { value: 'document',            label: 'Document' },
  { value: 'preparation',         label: 'Preparation (Hexagon)' },
  { value: 'connector',           label: 'Connector' },
]

export function FlowchartNodeInspector() {
  const { inspector } = useUIStore()
  const { nodes, updateNodeData } = useDiagramStore()

  if (inspector?.kind !== 'node') return null
  const node = nodes.find((n) => n.id === inspector.id)
  if (!node) return null

  const d = node.data as unknown as FlowchartNodeData

  function set(patch: Partial<FlowchartNodeData>) {
    updateNodeData(inspector!.id, patch as never)
  }

  return (
    <aside className="w-56 shrink-0 border-l border-border bg-surface overflow-y-auto p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-3">
        Flowchart Shape
      </p>

      {/* Shape */}
      <div className="mb-3">
        <label className="block text-[10px] text-text-muted mb-1">Shape</label>
        <select
          value={d.elementKind ?? 'process'}
          onChange={(e) => set({ elementKind: e.target.value as ElementKind })}
          className="w-full bg-elevated border border-border rounded-md
            px-2 py-1.5 text-xs text-text-primary
            focus:outline-none focus:border-sky-500/50 transition-colors"
        >
          {SHAPES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Label */}
      <div className="mb-3">
        <label className="block text-[10px] text-text-muted mb-1">Label</label>
        <input
          value={d.label ?? ''}
          onChange={(e) => set({ label: e.target.value })}
          className="w-full bg-elevated border border-border rounded-md
            px-2 py-1.5 text-xs text-text-primary
            focus:outline-none focus:border-sky-500/50 transition-colors"
        />
      </div>

      {/* Description */}
      <div className="mb-3">
        <label className="block text-[10px] text-text-muted mb-1">Description</label>
        <textarea
          rows={3}
          value={d.description ?? ''}
          onChange={(e) => set({ description: e.target.value })}
          className="w-full bg-elevated border border-border rounded-md
            px-2 py-1.5 text-xs text-text-primary resize-none
            focus:outline-none focus:border-sky-500/50 transition-colors"
        />
      </div>
    </aside>
  )
}
