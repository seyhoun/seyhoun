/**
 * Generic UML node inspector — shows label + description.
 * Type-specific inspectors (ClassNodeInspector, etc.) are rendered by DesignMode
 * for nodes that have richer data.
 */
import { useUIStore } from '../../stores/ui'
import { useDiagramStore } from '../../stores/diagram'
import type { DiagramNodeData } from '../../types/diagram'

export function UmlNodeInspector() {
  const { inspector } = useUIStore()
  const { nodes, updateNodeData } = useDiagramStore()

  if (inspector?.kind !== 'node') return null
  const node = nodes.find((n) => n.id === inspector.id)
  if (!node) return null

  const d = node.data as DiagramNodeData

  function set(patch: Partial<DiagramNodeData>) {
    updateNodeData(inspector!.id, patch)
  }

  return (
    <aside className="w-56 shrink-0 border-l border-border bg-surface overflow-y-auto p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-3">
        Properties
      </p>

      {/* Label */}
      <div className="mb-3">
        <label className="block text-[10px] text-text-muted mb-1">Label</label>
        <input
          value={d.label as string ?? ''}
          onChange={(e) => set({ label: e.target.value } as Partial<DiagramNodeData>)}
          className="w-full bg-elevated border border-border rounded-md
            px-2 py-1.5 text-xs text-text-primary
            focus:outline-none focus:border-indigo-500/50 transition-colors"
        />
      </div>

      {/* Description */}
      {'description' in d && (
        <div className="mb-3">
          <label className="block text-[10px] text-text-muted mb-1">Description</label>
          <textarea
            rows={3}
            value={(d as { description?: string }).description ?? ''}
            onChange={(e) => set({ description: e.target.value } as Partial<DiagramNodeData>)}
            className="w-full bg-elevated border border-border rounded-md
              px-2 py-1.5 text-xs text-text-primary resize-none
              focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>
      )}

      {/* Kind badge */}
      <div className="mt-4 pt-3 border-t border-border">
        <p className="text-[10px] text-text-faint">
          kind: <span className="text-text-muted font-mono">{d.kind ?? 'infra'}</span>
        </p>
      </div>
    </aside>
  )
}
