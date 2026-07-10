import { useUIStore } from '../../stores/ui'
import { useDiagramStore } from '../../stores/diagram'
import type { UseCaseNodeData, ElementKind } from '../../types/diagram'

const SHAPES: { value: ElementKind; label: string }[] = [
  { value: 'actor',           label: 'Actor' },
  { value: 'use-case',        label: 'Use Case' },
  { value: 'system-boundary', label: 'System Boundary' },
]

export function UseCaseNodeInspector() {
  const { inspector } = useUIStore()
  const { nodes, updateNodeData } = useDiagramStore()

  if (inspector?.kind !== 'node') return null
  const node = nodes.find((n) => n.id === inspector.id)
  if (!node) return null

  const d = node.data as unknown as UseCaseNodeData

  function set(patch: Partial<UseCaseNodeData>) {
    updateNodeData(inspector!.id, patch as never)
  }

  const kind = d.elementKind ?? 'actor'

  return (
    <aside className="w-56 shrink-0 border-l border-border bg-surface overflow-y-auto p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-3">
        Use Case Element
      </p>

      {/* Type */}
      <div className="mb-3">
        <label className="block text-[10px] text-text-muted mb-1">Type</label>
        <select
          value={kind}
          onChange={(e) => set({ elementKind: e.target.value as ElementKind })}
          className="w-full bg-elevated border border-border rounded-md
            px-2 py-1.5 text-xs text-text-primary
            focus:outline-none focus:border-pink-500/50 transition-colors"
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
            focus:outline-none focus:border-pink-500/50 transition-colors"
        />
      </div>

      {/* Description */}
      <div className="mb-3">
        <label className="block text-[10px] text-text-muted mb-1">Description</label>
        <textarea
          rows={2}
          value={d.description ?? ''}
          onChange={(e) => set({ description: e.target.value })}
          className="w-full bg-elevated border border-border rounded-md
            px-2 py-1.5 text-xs text-text-primary resize-none
            focus:outline-none focus:border-pink-500/50 transition-colors"
        />
      </div>

      {/* Actor type */}
      {kind === 'actor' && (
        <div className="mb-3">
          <label className="block text-[10px] text-text-muted mb-1">Actor Type</label>
          <select
            value={d.actorType ?? 'primary'}
            onChange={(e) => set({ actorType: e.target.value as 'primary' | 'secondary' })}
            className="w-full bg-elevated border border-border rounded-md
              px-2 py-1.5 text-xs text-text-primary
              focus:outline-none focus:border-pink-500/50 transition-colors"
          >
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
          </select>
        </div>
      )}

      {/* Use-case conditions */}
      {kind === 'use-case' && (
        <>
          <div className="mb-3">
            <label className="block text-[10px] text-text-muted mb-1">Preconditions</label>
            <textarea
              rows={2}
              value={d.preconditions ?? ''}
              onChange={(e) => set({ preconditions: e.target.value })}
              placeholder="System is in state X…"
              className="w-full bg-elevated border border-border rounded-md
                px-2 py-1.5 text-xs text-text-primary resize-none
                focus:outline-none focus:border-pink-500/50 transition-colors"
            />
          </div>
          <div className="mb-3">
            <label className="block text-[10px] text-text-muted mb-1">Postconditions</label>
            <textarea
              rows={2}
              value={d.postconditions ?? ''}
              onChange={(e) => set({ postconditions: e.target.value })}
              placeholder="System transitions to state Y…"
              className="w-full bg-elevated border border-border rounded-md
                px-2 py-1.5 text-xs text-text-primary resize-none
                focus:outline-none focus:border-pink-500/50 transition-colors"
            />
          </div>
        </>
      )}

      <div className="mt-4 pt-3 border-t border-border">
        <p className="text-[10px] text-text-faint">
          kind: <span className="text-text-muted font-mono">use-case</span>
        </p>
      </div>
    </aside>
  )
}
