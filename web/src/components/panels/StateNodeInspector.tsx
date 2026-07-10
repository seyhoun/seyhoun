import { useUIStore } from '../../stores/ui'
import { useDiagramStore } from '../../stores/diagram'
import type { StateNodeData } from '../../types/diagram'

export function StateNodeInspector() {
  const { inspector } = useUIStore()
  const { nodes, updateNodeData } = useDiagramStore()

  if (inspector?.kind !== 'node') return null
  const node = nodes.find((n) => n.id === inspector.id)
  if (!node) return null

  const d = node.data as unknown as StateNodeData

  function set(patch: Partial<StateNodeData>) {
    updateNodeData(inspector!.id, patch as never)
  }

  const isPseudo = d.elementKind === 'initial-state' || d.elementKind === 'final-state'

  return (
    <aside className="w-56 shrink-0 border-l border-border bg-surface overflow-y-auto p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-3">
        {isPseudo ? 'Pseudo State' : 'State'}
      </p>

      {/* Label (not shown for pseudo-states) */}
      {!isPseudo && (
        <div className="mb-3">
          <label className="block text-[10px] text-text-muted mb-1">Name</label>
          <input
            value={d.label ?? ''}
            onChange={(e) => set({ label: e.target.value })}
            className="w-full bg-elevated border border-border rounded-md
              px-2 py-1.5 text-xs text-text-primary
              focus:outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>
      )}

      {isPseudo && (
        <p className="text-[11px] text-text-muted mb-3">
          {d.elementKind === 'initial-state' ? 'Initial pseudo-state (no label)' : 'Final pseudo-state (no label)'}
        </p>
      )}

      {/* Actions — only for regular states */}
      {!isPseudo && (
        <>
          <div className="mb-3">
            <label className="block text-[10px] text-text-muted mb-1">
              <span className="text-violet-400">entry</span> / action
            </label>
            <input
              value={d.entryAction ?? ''}
              onChange={(e) => set({ entryAction: e.target.value })}
              placeholder="on entry"
              className="w-full bg-elevated border border-border rounded-md
                px-2 py-1.5 text-xs text-text-primary font-mono
                focus:outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>

          <div className="mb-3">
            <label className="block text-[10px] text-text-muted mb-1">
              <span className="text-violet-400">do</span> / activity
            </label>
            <input
              value={d.doAction ?? ''}
              onChange={(e) => set({ doAction: e.target.value })}
              placeholder="while in state"
              className="w-full bg-elevated border border-border rounded-md
                px-2 py-1.5 text-xs text-text-primary font-mono
                focus:outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>

          <div className="mb-3">
            <label className="block text-[10px] text-text-muted mb-1">
              <span className="text-violet-400">exit</span> / action
            </label>
            <input
              value={d.exitAction ?? ''}
              onChange={(e) => set({ exitAction: e.target.value })}
              placeholder="on exit"
              className="w-full bg-elevated border border-border rounded-md
                px-2 py-1.5 text-xs text-text-primary font-mono
                focus:outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>

          <div className="mb-3">
            <label className="block text-[10px] text-text-muted mb-1">Description</label>
            <textarea
              rows={3}
              value={d.description ?? ''}
              onChange={(e) => set({ description: e.target.value })}
              className="w-full bg-elevated border border-border rounded-md
                px-2 py-1.5 text-xs text-text-primary resize-none
                focus:outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>
        </>
      )}
    </aside>
  )
}
