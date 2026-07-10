import { Plus, Trash2 } from 'lucide-react'
import { useUIStore } from '../../stores/ui'
import { useDiagramStore } from '../../stores/diagram'
import type { ClassNodeData, AttributeEntry, MethodEntry } from '../../types/diagram'

type Visibility = '+' | '-' | '#' | '~'
const VISIBILITIES: { value: Visibility; label: string }[] = [
  { value: '+', label: '+ public' },
  { value: '-', label: '- private' },
  { value: '#', label: '# protected' },
  { value: '~', label: '~ package' },
]

export function ClassNodeInspector() {
  const { inspector } = useUIStore()
  const { nodes, updateNodeData } = useDiagramStore()

  if (inspector?.kind !== 'node') return null
  const node = nodes.find((n) => n.id === inspector.id)
  if (!node) return null

  const d = node.data as unknown as ClassNodeData

  function set(patch: Partial<ClassNodeData>) {
    updateNodeData(inspector!.id, patch as never)
  }

  function addAttr() {
    set({
      attributes: [
        ...(d.attributes ?? []),
        { id: crypto.randomUUID(), visibility: '-', name: 'attribute', type: 'string' },
      ],
    })
  }

  function removeAttr(id: string) {
    set({ attributes: (d.attributes ?? []).filter((a) => a.id !== id) })
  }

  function updateAttr(id: string, patch: Partial<AttributeEntry>) {
    set({
      attributes: (d.attributes ?? []).map((a) => a.id === id ? { ...a, ...patch } : a),
    })
  }

  function addMethod() {
    set({
      methods: [
        ...(d.methods ?? []),
        { id: crypto.randomUUID(), visibility: '+', name: 'method', params: '', returnType: 'void' },
      ],
    })
  }

  function removeMethod(id: string) {
    set({ methods: (d.methods ?? []).filter((m) => m.id !== id) })
  }

  function updateMethod(id: string, patch: Partial<MethodEntry>) {
    set({
      methods: (d.methods ?? []).map((m) => m.id === id ? { ...m, ...patch } : m),
    })
  }

  return (
    <aside className="w-64 shrink-0 border-l border-border bg-surface overflow-y-auto p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-3">
        Class
      </p>

      {/* Stereotype */}
      <div className="mb-3">
        <label className="block text-[10px] text-text-muted mb-1">Stereotype</label>
        <input
          value={d.stereotype ?? ''}
          onChange={(e) => set({ stereotype: e.target.value })}
          placeholder="interface, abstract…"
          className="w-full bg-elevated border border-border rounded-md
            px-2 py-1.5 text-xs text-text-primary font-mono
            focus:outline-none focus:border-indigo-500/50 transition-colors"
        />
      </div>

      {/* Class name */}
      <div className="mb-4">
        <label className="block text-[10px] text-text-muted mb-1">Class name</label>
        <input
          value={d.label ?? ''}
          onChange={(e) => set({ label: e.target.value })}
          className="w-full bg-elevated border border-border rounded-md
            px-2 py-1.5 text-xs text-text-primary font-semibold
            focus:outline-none focus:border-indigo-500/50 transition-colors"
        />
      </div>

      {/* Attributes */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">Attributes</p>
          <button
            onClick={addAttr}
            className="flex items-center gap-0.5 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <Plus className="w-2.5 h-2.5" /> Add
          </button>
        </div>
        <div className="space-y-1.5">
          {(d.attributes ?? []).map((a) => (
            <div key={a.id} className="bg-elevated rounded-md p-2 border border-border">
              <div className="flex gap-1 mb-1">
                <select
                  value={a.visibility}
                  onChange={(e) => updateAttr(a.id, { visibility: e.target.value as Visibility })}
                  className="bg-hover border border-border rounded text-[10px] text-indigo-400 px-1 py-0.5 focus:outline-none"
                >
                  {VISIBILITIES.map((v) => (
                    <option key={v.value} value={v.value}>{v.value}</option>
                  ))}
                </select>
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
                placeholder="name"
                className="w-full bg-transparent text-[11px] text-text-primary font-mono mb-1
                  border-b border-border focus:outline-none focus:border-indigo-500/50 pb-0.5"
              />
              <input
                value={a.type}
                onChange={(e) => updateAttr(a.id, { type: e.target.value })}
                placeholder="type"
                className="w-full bg-transparent text-[10px] text-text-secondary font-mono
                  border-b border-border focus:outline-none focus:border-indigo-500/50 pb-0.5"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Methods */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">Methods</p>
          <button
            onClick={addMethod}
            className="flex items-center gap-0.5 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <Plus className="w-2.5 h-2.5" /> Add
          </button>
        </div>
        <div className="space-y-1.5">
          {(d.methods ?? []).map((m) => (
            <div key={m.id} className="bg-elevated rounded-md p-2 border border-border">
              <div className="flex gap-1 mb-1">
                <select
                  value={m.visibility}
                  onChange={(e) => updateMethod(m.id, { visibility: e.target.value as Visibility })}
                  className="bg-hover border border-border rounded text-[10px] text-indigo-400 px-1 py-0.5 focus:outline-none"
                >
                  {VISIBILITIES.map((v) => (
                    <option key={v.value} value={v.value}>{v.value}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1 ml-auto text-[9px] text-text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={m.isAbstract ?? false}
                    onChange={(e) => updateMethod(m.id, { isAbstract: e.target.checked })}
                    className="accent-indigo-500"
                  />
                  abstract
                </label>
                <button
                  onClick={() => removeMethod(m.id)}
                  className="text-red-400/60 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
              <input
                value={m.name}
                onChange={(e) => updateMethod(m.id, { name: e.target.value })}
                placeholder="methodName"
                className="w-full bg-transparent text-[11px] text-text-primary font-mono mb-1
                  border-b border-border focus:outline-none focus:border-indigo-500/50 pb-0.5"
              />
              <input
                value={m.params}
                onChange={(e) => updateMethod(m.id, { params: e.target.value })}
                placeholder="params"
                className="w-full bg-transparent text-[10px] text-text-secondary font-mono mb-1
                  border-b border-border focus:outline-none focus:border-indigo-500/50 pb-0.5"
              />
              <input
                value={m.returnType}
                onChange={(e) => updateMethod(m.id, { returnType: e.target.value })}
                placeholder="returnType"
                className="w-full bg-transparent text-[10px] text-text-secondary font-mono
                  border-b border-border focus:outline-none focus:border-indigo-500/50 pb-0.5"
              />
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
