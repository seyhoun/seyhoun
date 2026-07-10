import { useUIStore } from '../../stores/ui'
import { useDiagramStore } from '../../stores/diagram'
import { getEdgeKindsForDiagram, SEQUENCE_MESSAGE_TYPES } from '../../lib/elementRegistry'
import type { EdgeData } from '../../types/diagram'

export function UmlEdgeInspector() {
  const { inspector } = useUIStore()
  const { edges, updateEdge, diagramType } = useDiagramStore()

  if (inspector?.kind !== 'edge') return null
  const edge = edges.find((e) => e.id === inspector.id)
  if (!edge) return null

  const d = (edge.data ?? {}) as EdgeData
  const isSequence = diagramType === 'sequence'
  const edgeKinds = getEdgeKindsForDiagram(diagramType)

  function setData(patch: Partial<EdgeData>) {
    updateEdge(inspector!.id, { data: patch })
  }

  return (
    <aside className="w-56 shrink-0 border-l border-border bg-surface overflow-y-auto p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-3">
        Connection
      </p>

      {/* Label */}
      <div className="mb-3">
        <label className="block text-[10px] text-text-muted mb-1">Label</label>
        <input
          value={d.label as string ?? ''}
          onChange={(e) => setData({ label: e.target.value })}
          placeholder="edge label"
          className="w-full bg-elevated border border-border rounded-md
            px-2 py-1.5 text-xs text-text-primary font-mono
            focus:outline-none focus:border-indigo-500/50 transition-colors"
        />
      </div>

      {isSequence ? (
        // ── Sequence: message type ───────────────────────────────────
        <div className="mb-3">
          <label className="block text-[10px] text-text-muted mb-1">Message type</label>
          <select
            value={d.messageType ?? 'sync'}
            onChange={(e) => setData({ messageType: e.target.value as EdgeData['messageType'] })}
            className="w-full bg-elevated border border-border rounded-md
              px-2 py-1.5 text-xs text-text-primary
              focus:outline-none focus:border-rose-500/50 transition-colors"
          >
            {SEQUENCE_MESSAGE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      ) : (
        <>
          {/* Edge kind — filtered to what's relevant for this diagram type */}
          {edgeKinds.length > 0 && (
            <div className="mb-3">
              <label className="block text-[10px] text-text-muted mb-1">Relationship</label>
              <select
                value={d.edgeKind ?? edgeKinds[0].value}
                onChange={(e) => setData({ edgeKind: e.target.value as EdgeData['edgeKind'] })}
                className="w-full bg-elevated border border-border rounded-md
                  px-2 py-1.5 text-xs text-text-primary
                  focus:outline-none focus:border-indigo-500/50 transition-colors"
              >
                {edgeKinds.map((k) => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Guard — state machine, activity, flowchart */}
          {(diagramType === 'state_machine' || diagramType === 'activity' || diagramType === 'flowchart') && (
            <div className="mb-3">
              <label className="block text-[10px] text-text-muted mb-1">Guard</label>
              <input
                value={d.guard as string ?? ''}
                onChange={(e) => setData({ guard: e.target.value })}
                placeholder="[condition]"
                className="w-full bg-elevated border border-border rounded-md
                  px-2 py-1.5 text-xs text-text-primary font-mono
                  focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
          )}

          {/* Action — state machine only */}
          {diagramType === 'state_machine' && (
            <div className="mb-3">
              <label className="block text-[10px] text-text-muted mb-1">Action</label>
              <input
                value={d.action as string ?? ''}
                onChange={(e) => setData({ action: e.target.value })}
                placeholder="/ doSomething()"
                className="w-full bg-elevated border border-border rounded-md
                  px-2 py-1.5 text-xs text-text-primary font-mono
                  focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
          )}

          {/* Cardinality — class and ER */}
          {(diagramType === 'class' || diagramType === 'er') && (
            <div className="mb-3 space-y-2">
              <label className="block text-[10px] text-text-muted">Cardinality</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[9px] text-text-faint mb-0.5">Source</label>
                  <input
                    value={(d.cardinality as { source?: string; target?: string } | undefined)?.source ?? ''}
                    onChange={(e) => setData({ cardinality: { ...(d.cardinality as object ?? {}), source: e.target.value } })}
                    placeholder="1"
                    className="w-full bg-elevated border border-border rounded-md
                      px-2 py-1 text-xs text-text-primary font-mono
                      focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[9px] text-text-faint mb-0.5">Target</label>
                  <input
                    value={(d.cardinality as { source?: string; target?: string } | undefined)?.target ?? ''}
                    onChange={(e) => setData({ cardinality: { ...(d.cardinality as object ?? {}), target: e.target.value } })}
                    placeholder="*"
                    className="w-full bg-elevated border border-border rounded-md
                      px-2 py-1 text-xs text-text-primary font-mono
                      focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </aside>
  )
}
