import { useUIStore } from '../../stores/ui'
import { useDiagramStore } from '../../stores/diagram'
import type { SequenceNodeData, ElementKind } from '../../types/diagram'
import { SEQUENCE_MESSAGE_TYPES } from '../../lib/elementRegistry'

const SHAPES: { value: ElementKind; label: string }[] = [
  { value: 'lifeline',          label: 'Object Lifeline' },
  { value: 'actor',             label: 'Actor Lifeline' },
  { value: 'boundary-lifeline', label: 'Boundary (UI/API)' },
  { value: 'control-lifeline',  label: 'Control (Service)' },
  { value: 'entity-lifeline',   label: 'Entity (Data)' },
  { value: 'message',           label: 'Message' },
  { value: 'fragment',          label: 'Fragment' },
]

const PARTICIPANT_TYPES: { value: string; label: string }[] = [
  { value: 'object',   label: 'Object' },
  { value: 'actor',    label: 'Actor' },
  { value: 'boundary', label: 'Boundary' },
  { value: 'control',  label: 'Control' },
  { value: 'entity',   label: 'Entity' },
]

const FRAGMENT_TYPES: { value: string; label: string }[] = [
  { value: 'alt',   label: 'alt — alternatives' },
  { value: 'loop',  label: 'loop — repetition' },
  { value: 'opt',   label: 'opt — optional' },
  { value: 'break', label: 'break — break out' },
  { value: 'par',   label: 'par — parallel' },
]

export function SequenceNodeInspector() {
  const { inspector } = useUIStore()
  const { nodes, updateNodeData } = useDiagramStore()

  if (inspector?.kind !== 'node') return null
  const node = nodes.find((n) => n.id === inspector.id)
  if (!node) return null

  const d = node.data as unknown as SequenceNodeData

  function set(patch: Partial<SequenceNodeData>) {
    updateNodeData(inspector!.id, patch as never)
  }

  const kind = d.elementKind ?? 'lifeline'

  return (
    <aside className="w-56 shrink-0 border-l border-border bg-surface overflow-y-auto p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-3">
        Sequence Element
      </p>

      {/* Type */}
      <div className="mb-3">
        <label className="block text-[10px] text-text-muted mb-1">Type</label>
        <select
          value={kind}
          onChange={(e) => set({ elementKind: e.target.value as ElementKind })}
          className="w-full bg-elevated border border-border rounded-md
            px-2 py-1.5 text-xs text-text-primary
            focus:outline-none focus:border-rose-500/50 transition-colors"
        >
          {SHAPES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Label */}
      {kind !== 'fragment' && (
        <div className="mb-3">
          <label className="block text-[10px] text-text-muted mb-1">Label</label>
          <input
            value={d.label ?? ''}
            onChange={(e) => set({ label: e.target.value })}
            className="w-full bg-elevated border border-border rounded-md
              px-2 py-1.5 text-xs text-text-primary
              focus:outline-none focus:border-rose-500/50 transition-colors"
          />
        </div>
      )}

      {/* Lifeline fields */}
      {(kind === 'lifeline' || kind === 'actor' || kind === 'boundary-lifeline' || kind === 'control-lifeline' || kind === 'entity-lifeline') && (
        <>
          <div className="mb-3">
            <label className="block text-[10px] text-text-muted mb-1">Participant Type</label>
            <select
              value={d.participantType ?? 'object'}
              onChange={(e) => set({ participantType: e.target.value as SequenceNodeData['participantType'] })}
              className="w-full bg-elevated border border-border rounded-md
                px-2 py-1.5 text-xs text-text-primary
                focus:outline-none focus:border-rose-500/50 transition-colors"
            >
              {PARTICIPANT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="block text-[10px] text-text-muted mb-1">Stereotype</label>
            <input
              value={d.stereotype ?? ''}
              onChange={(e) => set({ stereotype: e.target.value })}
              placeholder="«boundary»"
              className="w-full bg-elevated border border-border rounded-md
                px-2 py-1.5 text-xs text-text-primary
                focus:outline-none focus:border-rose-500/50 transition-colors"
            />
          </div>
        </>
      )}

      {/* Message fields */}
      {kind === 'message' && (
        <div className="mb-3">
          <label className="block text-[10px] text-text-muted mb-1">Message Type</label>
          <select
            value={d.messageType ?? 'sync'}
            onChange={(e) => set({ messageType: e.target.value as SequenceNodeData['messageType'] })}
            className="w-full bg-elevated border border-border rounded-md
              px-2 py-1.5 text-xs text-text-primary
              focus:outline-none focus:border-rose-500/50 transition-colors"
          >
            {SEQUENCE_MESSAGE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Fragment fields */}
      {kind === 'fragment' && (
        <>
          <div className="mb-3">
            <label className="block text-[10px] text-text-muted mb-1">Fragment Type</label>
            <select
              value={d.fragmentType ?? 'alt'}
              onChange={(e) => set({ fragmentType: e.target.value as SequenceNodeData['fragmentType'], label: e.target.value })}
              className="w-full bg-elevated border border-border rounded-md
                px-2 py-1.5 text-xs text-text-primary
                focus:outline-none focus:border-rose-500/50 transition-colors"
            >
              {FRAGMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="block text-[10px] text-text-muted mb-1">Condition</label>
            <input
              value={d.fragmentCondition ?? ''}
              onChange={(e) => set({ fragmentCondition: e.target.value })}
              placeholder="[x > 0]"
              className="w-full bg-elevated border border-border rounded-md
                px-2 py-1.5 text-xs text-text-primary
                focus:outline-none focus:border-rose-500/50 transition-colors"
            />
          </div>
        </>
      )}

      <div className="mt-4 pt-3 border-t border-border">
        <p className="text-[10px] text-text-faint">
          kind: <span className="text-text-muted font-mono">sequence</span>
        </p>
      </div>
    </aside>
  )
}
