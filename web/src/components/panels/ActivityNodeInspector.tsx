import { useUIStore } from '../../stores/ui'
import { useDiagramStore } from '../../stores/diagram'
import type { ActivityNodeData, ElementKind } from '../../types/diagram'

const SHAPES: { value: ElementKind; label: string }[] = [
  { value: 'action',         label: 'Action' },
  { value: 'decision-merge', label: 'Decision / Merge' },
  { value: 'fork-join',      label: 'Fork / Join' },
  { value: 'initial-state',  label: 'Start' },
  { value: 'final-state',    label: 'End' },
  { value: 'swim-lane',      label: 'Swim Lane' },
  { value: 'signal-send',    label: 'Send Signal' },
  { value: 'signal-receive', label: 'Receive Signal' },
  { value: 'note',           label: 'Note' },
]

const NO_LABEL = new Set<ElementKind>(['initial-state', 'final-state', 'fork-join'])
const HAS_DESCRIPTION = new Set<ElementKind>(['action', 'note'])
const HAS_GUARD = new Set<ElementKind>(['decision-merge'])

export function ActivityNodeInspector() {
  const { inspector } = useUIStore()
  const { nodes, updateNodeData } = useDiagramStore()

  if (inspector?.kind !== 'node') return null
  const node = nodes.find((n) => n.id === inspector.id)
  if (!node) return null

  const d = node.data as unknown as ActivityNodeData

  function set(patch: Partial<ActivityNodeData>) {
    updateNodeData(inspector!.id, patch as never)
  }

  const kind = d.elementKind ?? 'action'

  return (
    <aside className="w-56 shrink-0 border-l border-border bg-surface overflow-y-auto p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-3">
        Activity Element
      </p>

      {/* Shape */}
      <div className="mb-3">
        <label className="block text-[10px] text-text-muted mb-1">Type</label>
        <select
          value={kind}
          onChange={(e) => set({ elementKind: e.target.value as ElementKind })}
          className="w-full bg-elevated border border-border rounded-md
            px-2 py-1.5 text-xs text-text-primary
            focus:outline-none focus:border-cyan-500/50 transition-colors"
        >
          {SHAPES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Label */}
      {!NO_LABEL.has(kind) && (
        <div className="mb-3">
          <label className="block text-[10px] text-text-muted mb-1">Label</label>
          <input
            value={d.label ?? ''}
            onChange={(e) => set({ label: e.target.value })}
            className="w-full bg-elevated border border-border rounded-md
              px-2 py-1.5 text-xs text-text-primary
              focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>
      )}

      {/* Guard (decision-merge only) */}
      {HAS_GUARD.has(kind) && (
        <div className="mb-3">
          <label className="block text-[10px] text-text-muted mb-1">Guard Condition</label>
          <input
            value={d.guard ?? ''}
            onChange={(e) => set({ guard: e.target.value })}
            placeholder="[condition]"
            className="w-full bg-elevated border border-border rounded-md
              px-2 py-1.5 text-xs text-text-primary
              focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>
      )}

      {/* Description */}
      {HAS_DESCRIPTION.has(kind) && (
        <div className="mb-3">
          <label className="block text-[10px] text-text-muted mb-1">Description</label>
          <textarea
            rows={3}
            value={d.description ?? ''}
            onChange={(e) => set({ description: e.target.value })}
            className="w-full bg-elevated border border-border rounded-md
              px-2 py-1.5 text-xs text-text-primary resize-none
              focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-border">
        <p className="text-[10px] text-text-faint">
          kind: <span className="text-text-muted font-mono">activity</span>
        </p>
      </div>
    </aside>
  )
}
