import { Plus, Trash2 } from 'lucide-react'
import { useUIStore } from '../../stores/ui'
import { useDiagramStore } from '../../stores/diagram'
import type { EntityNodeData, EntityAttribute } from '../../types/diagram'

export function EntityNodeInspector() {
  const { inspector } = useUIStore()
  const { nodes, updateNodeData } = useDiagramStore()

  if (inspector?.kind !== 'node') return null
  const node = nodes.find((n) => n.id === inspector.id)
  if (!node) return null

  const d = node.data as unknown as EntityNodeData

  function set(patch: Partial<EntityNodeData>) {
    updateNodeData(inspector!.id, patch as never)
  }

  function addAttr() {
    set({
      attributes: [
        ...(d.attributes ?? []),
        { id: crypto.randomUUID(), name: 'column', type: 'varchar' },
      ],
    })
  }

  function removeAttr(id: string) {
    set({ attributes: (d.attributes ?? []).filter((a) => a.id !== id) })
  }

  function updateAttr(id: string, patch: Partial<EntityAttribute>) {
    set({
      attributes: (d.attributes ?? []).map((a) => a.id === id ? { ...a, ...patch } : a),
    })
  }

  return (
    <aside className="w-64 shrink-0 border-l border-border bg-surface overflow-y-auto p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-3">
        Entity
      </p>

      {/* Name */}
      <div className="mb-3">
        <label className="block text-[10px] text-text-muted mb-1">Entity name</label>
        <input
          value={d.label ?? ''}
          onChange={(e) => set({ label: e.target.value })}
          className="w-full bg-elevated border border-border rounded-md
            px-2 py-1.5 text-xs text-text-primary font-semibold
            focus:outline-none focus:border-teal-500/50 transition-colors"
        />
      </div>

      {/* Weak entity toggle */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-[11px] text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={d.isWeak ?? false}
            onChange={(e) => set({ isWeak: e.target.checked })}
            className="accent-teal-500"
          />
          Weak entity (double border)
        </label>
      </div>

      {/* Attributes */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">Attributes</p>
          <button
            onClick={addAttr}
            className="flex items-center gap-0.5 text-[10px] text-teal-400 hover:text-teal-300 transition-colors"
          >
            <Plus className="w-2.5 h-2.5" /> Add
          </button>
        </div>
        <div className="space-y-1.5">
          {(d.attributes ?? []).map((a) => (
            <div key={a.id} className="bg-elevated rounded-md p-2 border border-border">
              <div className="flex items-center gap-1 mb-1.5">
                <label className="flex items-center gap-1 text-[9px] text-amber-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={a.isPK ?? false}
                    onChange={(e) => updateAttr(a.id, { isPK: e.target.checked, isFK: e.target.checked ? false : a.isFK })}
                    className="accent-amber-500"
                  />
                  PK
                </label>
                <label className="flex items-center gap-1 text-[9px] text-sky-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={a.isFK ?? false}
                    onChange={(e) => updateAttr(a.id, { isFK: e.target.checked, isPK: e.target.checked ? false : a.isPK })}
                    className="accent-sky-500"
                  />
                  FK
                </label>
                <label className="flex items-center gap-1 text-[9px] text-text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={a.isNullable ?? false}
                    onChange={(e) => updateAttr(a.id, { isNullable: e.target.checked })}
                    className="accent-gray-500"
                  />
                  null
                </label>
                <button
                  onClick={() => removeAttr(a.id)}
                  className="ml-auto text-red-400/60 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
              <input
                value={a.name}
                onChange={(e) => updateAttr(a.id, { name: e.target.value })}
                placeholder="column_name"
                className={`w-full bg-transparent text-[11px] text-text-primary font-mono mb-1
                  border-b border-border focus:outline-none focus:border-teal-500/50 pb-0.5
                  ${a.isPK ? 'underline' : ''}`}
              />
              <input
                value={a.type}
                onChange={(e) => updateAttr(a.id, { type: e.target.value })}
                placeholder="varchar(255)"
                className="w-full bg-transparent text-[10px] text-text-secondary font-mono
                  border-b border-border focus:outline-none focus:border-teal-500/50 pb-0.5"
              />
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
