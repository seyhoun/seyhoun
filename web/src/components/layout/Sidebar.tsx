import { useEffect, useRef, useState } from 'react'
import {
  Plus, ChevronRight, ChevronDown,
  FolderOpen, LayoutDashboard, Search, X,
} from 'lucide-react'
import { useUIStore } from '../../stores/ui'
import { useDiagramStore } from '../../stores/diagram'
import { api } from '../../lib/api'
import { TECH_REGISTRY, getCategoriesForType } from '../../lib/techRegistry'
import type { CategoryDef } from '../../lib/techRegistry'
import {
  isInfraDiagramType, getUmlCategoriesForType, getElementsForDiagramType,
} from '../../lib/elementRegistry'
import type { UmlCategory, ElementDef } from '../../lib/elementRegistry'

// ── Node palette ─────────────────────────────────────────────────────

function PaletteItem({ technology, label, Icon, colors }: (typeof TECH_REGISTRY)[0]) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/reactflow/tech', technology)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md border ${colors.border}
        cursor-grab active:cursor-grabbing hover:brightness-110 transition-all select-none
        bg-elevated/60`}
    >
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />
      <Icon className={`w-3 h-3 shrink-0 ${colors.icon}`} />
      <span className="text-[11px] text-text-dim font-medium truncate">{label}</span>
    </div>
  )
}

function SubcategorySection({
  categoryId,
  subcategoryId,
  label,
}: {
  categoryId: string
  subcategoryId: string
  label: string
}) {
  const [open, setOpen] = useState(true)
  const items = TECH_REGISTRY.filter(
    (t) => t.category === categoryId && t.subcategory === subcategoryId
  )
  if (items.length === 0) return null

  return (
    <div className="ml-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1 py-0.5 text-[9px] font-semibold
          uppercase tracking-widest text-text-faint hover:text-[#6b6f8a] transition-colors"
      >
        {open
          ? <ChevronDown className="w-2 h-2 shrink-0" />
          : <ChevronRight className="w-2 h-2 shrink-0" />}
        {label}
      </button>
      {open && (
        <div className="flex flex-col gap-0.5 mb-1.5 ml-1">
          {items.map((item) => <PaletteItem key={item.technology} {...item} />)}
        </div>
      )}
    </div>
  )
}

function CategorySection({ cat }: { cat: CategoryDef }) {
  const [open, setOpen] = useState(true)
  const items = TECH_REGISTRY.filter((t) => t.category === cat.id)

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 py-1 text-[10px] font-semibold
          uppercase tracking-widest text-text-muted hover:text-text-secondary transition-colors"
      >
        {open
          ? <ChevronDown className="w-2.5 h-2.5" />
          : <ChevronRight className="w-2.5 h-2.5" />}
        {cat.label}
      </button>
      {open && (
        <div className="mb-2">
          {cat.subcategories ? (
            cat.subcategories.map((sub) => (
              <SubcategorySection
                key={sub.id}
                categoryId={cat.id}
                subcategoryId={sub.id}
                label={sub.label}
              />
            ))
          ) : (
            <div className="flex flex-col gap-0.5">
              {items.map((item) => <PaletteItem key={item.technology} {...item} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── UML element palette ───────────────────────────────────────────────

function UmlPaletteItem({ def }: { def: ElementDef }) {
  const { colors, Icon, label, elementKind } = def
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/reactflow/element', elementKind)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md border ${colors.border}
        cursor-grab active:cursor-grabbing hover:brightness-110 transition-all select-none
        bg-elevated/60`}
    >
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />
      <Icon className={`w-3 h-3 shrink-0 ${colors.icon}`} />
      <span className="text-[11px] text-text-dim font-medium truncate">{label}</span>
    </div>
  )
}

function UmlCategorySection({ cat, allElements }: { cat: UmlCategory; allElements: ElementDef[] }) {
  const [open, setOpen] = useState(true)
  const items = allElements.filter((e) => cat.elementKinds.includes(e.elementKind))
  if (items.length === 0) return null

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 py-1 text-[10px] font-semibold
          uppercase tracking-widest text-text-muted hover:text-text-secondary transition-colors"
      >
        {open
          ? <ChevronDown className="w-2.5 h-2.5" />
          : <ChevronRight className="w-2.5 h-2.5" />}
        {cat.label}
      </button>
      {open && (
        <div className="flex flex-col gap-0.5 mb-2">
          {items.map((item) => <UmlPaletteItem key={item.elementKind} def={item} />)}
        </div>
      )}
    </div>
  )
}

// ── Project tree ──────────────────────────────────────────────────────

function ProjectTree() {
  const {
    projects, activeDiagrams, loadingProjects,
    setProjects, setActiveProject, setActiveDiagrams, setLoadingProjects,
  } = useUIStore()
  const { loadDiagram } = useDiagramStore()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const wsId = localStorage.getItem('seyhoun_active_ws')
    if (!wsId) return
    setLoadingProjects(true)
    api.workspaces.projects(wsId)
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoadingProjects(false))
  }, [])

  async function createProject() {
    if (!newName.trim()) return
    const wsId = localStorage.getItem('seyhoun_active_ws')
    if (!wsId) return
    const p = await api.workspaces.createProject(wsId, { name: newName.trim() })
    setProjects([p, ...projects])
    setNewName('')
    setCreating(false)
  }

  async function toggleProject(id: string) {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    setActiveProject(id)
    const diagrams = await api.projects.diagrams(id).catch(() => [])
    setActiveDiagrams(diagrams)
  }

  async function openDiagram(id: string, projectId: string, name: string) {
    try {
      const d = await api.diagrams.get(id)
      loadDiagram({
        id,
        projectId,
        defaultBranchId: d.defaultBranchId,
        name,
        diagramType: d.diagramType,
        nodes: JSON.parse(d.nodesJson || '[]'),
        edges: JSON.parse(d.edgesJson || '[]'),
      })
    } catch (e) {
      console.error('Failed to load diagram', e)
    }
  }

  async function createDiagram(projectId: string) {
    const name = prompt('Diagram name:')
    if (!name) return
    const d = await api.diagrams.create({ projectId, name })
    setActiveDiagrams([d, ...activeDiagrams])
    openDiagram(d.id, projectId, d.name)
  }

  return (
    <div className="flex flex-col gap-0.5">
      {loadingProjects && (
        <p className="text-[11px] text-text-muted px-1 py-2">Loading…</p>
      )}

      {projects.map((p) => (
        <div key={p.id}>
          <button
            onClick={() => toggleProject(p.id)}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs
              text-text-secondary hover:text-text-primary hover:bg-hover transition-colors"
          >
            {expanded === p.id
              ? <ChevronDown className="w-3 h-3 shrink-0" />
              : <ChevronRight className="w-3 h-3 shrink-0" />}
            <FolderOpen className="w-3.5 h-3.5 shrink-0 text-text-muted" />
            <span className="truncate">{p.name}</span>
          </button>

          {expanded === p.id && (
            <div className="ml-5 flex flex-col gap-0.5 mt-0.5">
              {activeDiagrams.map((d) => (
                <button
                  key={d.id}
                  onClick={() => openDiagram(d.id, p.id, d.name)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs
                    text-text-muted hover:text-text-primary hover:bg-hover transition-colors"
                >
                  <LayoutDashboard className="w-3 h-3 shrink-0" />
                  <span className="truncate">{d.name}</span>
                </button>
              ))}
              <button
                onClick={() => createDiagram(p.id)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs
                  text-text-muted hover:text-indigo-400 transition-colors"
              >
                <Plus className="w-3 h-3" />
                New diagram
              </button>
            </div>
          )}
        </div>
      ))}

      {creating ? (
        <div className="flex items-center gap-1 px-1 mt-1">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') createProject()
              if (e.key === 'Escape') setCreating(false)
            }}
            placeholder="Project name…"
            className="flex-1 bg-hover border border-border rounded px-2 py-1
              text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-indigo-500/60"
          />
          <button onClick={createProject} className="text-indigo-400 hover:text-indigo-300 transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-2 py-1.5 mt-1 rounded-md text-xs
            text-text-muted hover:text-indigo-400 hover:bg-hover transition-colors"
        >
          <Plus className="w-3 h-3" />
          New project
        </button>
      )}
    </div>
  )
}

// ── Sidebar root ──────────────────────────────────────────────────────

export function Sidebar() {
  const { sidebarOpen } = useUIStore()
  const { diagramType } = useDiagramStore()
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  if (!sidebarOpen) return null

  const isInfra = isInfraDiagramType(diagramType)

  // Infra palette
  const visibleCategories = getCategoriesForType(diagramType)
  const visibleCategoryIds = new Set(visibleCategories.map((c) => c.id))

  // UML palette
  const umlCategories = getUmlCategoriesForType(diagramType)
  const umlElements   = getElementsForDiagramType(diagramType)

  const q = query.trim().toLowerCase()

  const filteredInfraItems = isInfra && q
    ? TECH_REGISTRY.filter((t) => visibleCategoryIds.has(t.category) && t.label.toLowerCase().includes(q))
    : null

  const filteredUmlItems = !isInfra && q
    ? umlElements.filter((e) => e.label.toLowerCase().includes(q))
    : null

  return (
    <aside className="w-52 shrink-0 flex flex-col border-r border-border bg-surface overflow-hidden">
      {/* Palette */}
      <section className="flex-1 overflow-y-auto p-3 border-b border-border">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-2">
          {isInfra ? 'Components' : 'Elements'}
        </p>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-full bg-elevated border border-border rounded-md
              pl-6 pr-6 py-1.5 text-xs text-text-primary placeholder-text-faint
              focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); searchRef.current?.focus() }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {isInfra ? (
          // ── Infrastructure palette ────────────────────────────────────
          filteredInfraItems ? (
            filteredInfraItems.length > 0 ? (
              <div className="flex flex-col gap-0.5">
                {filteredInfraItems.map((item) => <PaletteItem key={item.technology} {...item} />)}
              </div>
            ) : (
              <p className="text-[11px] text-text-faint py-2 text-center">No results</p>
            )
          ) : (
            <>
              {visibleCategories.map((cat) => (
                <CategorySection key={cat.id} cat={cat} />
              ))}
              <p className="text-[10px] text-text-muted mt-1">Drag onto canvas</p>
            </>
          )
        ) : (
          // ── UML palette ───────────────────────────────────────────────
          filteredUmlItems ? (
            filteredUmlItems.length > 0 ? (
              <div className="flex flex-col gap-0.5">
                {filteredUmlItems.map((item) => <UmlPaletteItem key={item.elementKind} def={item} />)}
              </div>
            ) : (
              <p className="text-[11px] text-text-faint py-2 text-center">No results</p>
            )
          ) : (
            <>
              {umlCategories.map((cat) => (
                <UmlCategorySection key={cat.id} cat={cat} allElements={umlElements} />
              ))}
              <p className="text-[10px] text-text-muted mt-1">Drag onto canvas</p>
            </>
          )
        )}
      </section>

      {/* Projects */}
      <section className="flex-1 overflow-y-auto p-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-2">
          Projects
        </p>
        <ProjectTree />
      </section>
    </aside>
  )
}
