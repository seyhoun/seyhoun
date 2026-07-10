import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, LayoutDashboard, FolderOpen, ChevronDown, ChevronRight,
  Trash2, Clock, Upload, FolderPlus, Settings, LogOut, Check,
  Building2, PlusCircle, Users,
} from 'lucide-react'
import { api } from '../lib/api'
import { useDiagramStore } from '../stores/diagram'
import { useAuthStore } from '../stores/auth'
import { ImportDialog } from '../components/panels/ImportDialog'
import { MembersModal } from '../components/panels/MembersModal'
import { SettingsModal } from '../components/home/SettingsModal'
import { NewWorkspaceModal } from '../components/home/NewWorkspaceModal'
import { NewProjectModal } from '../components/home/NewProjectModal'
import { NewSchemaModal } from '../components/home/NewSchemaModal'
import type { Diagram, Project, DiagramSummary, Workspace } from '../types/diagram'

// ── helpers ────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

const WS_KEY = 'seyhoun_active_ws'

// ── Diagram card ───────────────────────────────────────────────────────

function DiagramCard({
  diagram,
  onDelete,
}: {
  diagram: DiagramSummary
  onDelete: (id: string) => void
}) {
  const navigate = useNavigate()
  const [hover, setHover] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (confirmDelete) {
      onDelete(diagram.id)
    } else {
      setConfirmDelete(true)
    }
  }

  return (
    <div
      onClick={() => navigate(`/schema/${diagram.id}`)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setConfirmDelete(false) }}
      className="group relative flex flex-col gap-3 p-4 rounded-xl border border-border bg-surface hover:border-indigo-500/40 hover:bg-elevated transition-all cursor-pointer"
    >
      <div className="w-full h-24 rounded-lg bg-base border border-border flex items-center justify-center">
        <LayoutDashboard className="w-8 h-8 text-border group-hover:text-indigo-500/40 transition-colors" />
      </div>

      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium text-text-primary truncate">{diagram.name}</span>
        <span className="flex items-center gap-1 text-[11px] text-text-muted">
          <Clock className="w-3 h-3" />
          {relativeTime(diagram.updatedAt)}
        </span>
      </div>

      {hover && (
        <button
          onClick={handleDelete}
          className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
            confirmDelete
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-hover text-text-muted hover:text-red-400 border border-transparent'
          }`}
        >
          <Trash2 className="w-3 h-3" />
          {confirmDelete ? 'Confirm' : ''}
        </button>
      )}
    </div>
  )
}

// ── Project section ────────────────────────────────────────────────────

function ProjectSection({
  project,
  projects,
  activeWorkspaceId,
  onDeleteProject,
  onOpenMembers,
}: {
  project: Project
  projects: Project[]
  activeWorkspaceId: string
  onDeleteProject: (id: string) => void
  onOpenMembers: () => void
}) {
  const navigate = useNavigate()
  const { loadDiagram } = useDiagramStore()
  const [open, setOpen] = useState(true)
  const [diagrams, setDiagrams] = useState<DiagramSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    api.projects.diagrams(project.id)
      .then(setDiagrams)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [project.id])

  function handleNewCreated(d: Diagram) {
    setShowModal(false)
    loadDiagram({
      id: d.id,
      projectId: d.projectId,
      defaultBranchId: d.defaultBranchId,
      name: d.name,
      diagramType: d.diagramType,
      nodes: [],
      edges: [],
    })
    navigate(`/schema/${d.id}`)
  }

  async function handleDeleteDiagram(id: string) {
    await api.diagrams.delete(id).catch(console.error)
    setDiagrams((prev) => prev.filter((d) => d.id !== id))
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 flex-1 min-w-0 group"
          >
            {open
              ? <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
              : <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />}
            <FolderOpen className="w-4 h-4 text-text-muted shrink-0" />
            <span className="text-sm font-semibold text-text-dim group-hover:text-text-primary transition-colors truncate">
              {project.name}
            </span>
            <span className="text-[11px] text-text-faint shrink-0">
              {diagrams.length} schema{diagrams.length !== 1 ? 's' : ''}
            </span>
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-text-muted hover:text-indigo-400 border border-transparent hover:border-indigo-500/30 hover:bg-indigo-500/10 transition-colors"
          >
            <Plus className="w-3 h-3" />
            New schema
          </button>

          <button
            onClick={onOpenMembers}
            title="Manage members"
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-text-muted hover:text-[#a78bfa] border border-transparent hover:border-[#a78bfa]/30 hover:bg-[#a78bfa]/10 transition-colors"
          >
            <Users className="w-3 h-3" />
            Members
          </button>

          <button
            onClick={() => {
              if (confirmDelete) {
                onDeleteProject(project.id)
              } else {
                setConfirmDelete(true)
                setTimeout(() => setConfirmDelete(false), 3000)
              }
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
              confirmDelete
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'text-text-faint hover:text-red-400 border border-transparent'
            }`}
          >
            <Trash2 className="w-3 h-3" />
            {confirmDelete ? 'Delete project?' : ''}
          </button>
        </div>

        {open && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pl-6">
            {loading && (
              <p className="col-span-full text-[11px] text-text-faint py-4">Loading…</p>
            )}
            {!loading && diagrams.map((d) => (
              <DiagramCard key={d.id} diagram={d} onDelete={handleDeleteDiagram} />
            ))}
            {!loading && (
              <button
                onClick={() => setShowModal(true)}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border hover:border-indigo-500/40 hover:bg-elevated transition-all min-h-[152px] cursor-pointer"
              >
                <Plus className="w-5 h-5 text-text-faint" />
                <span className="text-xs text-text-muted">New schema</span>
              </button>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <NewSchemaModal
          projects={projects}
          activeWorkspaceId={activeWorkspaceId}
          preselectedProjectId={project.id}
          onClose={() => setShowModal(false)}
          onCreated={handleNewCreated}
        />
      )}
    </>
  )
}

// ── Home page ──────────────────────────────────────────────────────────

export function HomePage() {
  const { user, logout } = useAuthStore()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspaceId, setActiveWsId] = useState<string>(() => localStorage.getItem(WS_KEY) ?? '')
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showNewProject, setShowNewProject] = useState(false)
  const [showNewWorkspace, setShowNewWorkspace] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [membersModal, setMembersModal] = useState<{
    type: 'workspace' | 'project'
    id: string
    name: string
  } | null>(null)
  const navigate = useNavigate()
  const { loadDiagram } = useDiagramStore()
  const wsDropdownRef = useRef<HTMLDivElement>(null)

  // Close workspace dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wsDropdownRef.current && !wsDropdownRef.current.contains(e.target as Node)) {
        setWsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Load workspaces on mount
  useEffect(() => {
    api.workspaces.list()
      .then((ws) => {
        setWorkspaces(ws)
        if (ws.length === 0) return
        const saved = localStorage.getItem(WS_KEY)
        const valid = ws.find((w) => w.id === saved)
        const selected = valid ?? ws.find((w) => w.isPersonal) ?? ws[0]
        setActiveWsId(selected.id)
        localStorage.setItem(WS_KEY, selected.id)
      })
      .catch(console.error)
  }, [])

  // Load projects whenever workspace changes
  useEffect(() => {
    if (!activeWorkspaceId) return
    setLoading(true)
    api.workspaces.projects(activeWorkspaceId)
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [activeWorkspaceId])

  function handleSelectWorkspace(id: string) {
    setActiveWsId(id)
    localStorage.setItem(WS_KEY, id)
    setWsDropdownOpen(false)
  }

  function handleModalCreated(d: Diagram) {
    setShowModal(false)
    loadDiagram({
      id: d.id,
      projectId: d.projectId,
      defaultBranchId: d.defaultBranchId,
      name: d.name,
      diagramType: d.diagramType,
      nodes: [],
      edges: [],
    })
    navigate(`/schema/${d.id}`)
  }

  async function handleDeleteProject(id: string) {
    await api.projects.delete(id).catch(console.error)
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  function handleProjectCreated(p: Project) {
    setProjects((prev) => [...prev, p])
    setShowNewProject(false)
  }

  function handleWorkspaceCreated(ws: Workspace) {
    setWorkspaces((prev) => [...prev, ws])
    handleSelectWorkspace(ws.id)
    setShowNewWorkspace(false)
  }

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId)

  return (
    <div className="min-h-screen flex flex-col bg-base text-text-primary">
      {/* Navbar */}
      <header className="h-14 shrink-0 flex items-center gap-3 px-5 border-b border-border bg-base">
        <img src="/seyhoun.png" alt="Seyhoun" className="h-8 w-auto" />
        <div className="w-px h-5 bg-border mx-1" />

        {/* Workspace selector */}
        <div className="relative" ref={wsDropdownRef}>
          <button
            onClick={() => setWsDropdownOpen((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-text-primary hover:bg-elevated transition-colors"
          >
            <Building2 className="w-3.5 h-3.5 text-text-muted shrink-0" />
            <span className="max-w-[160px] truncate font-medium">
              {activeWorkspace?.name ?? 'Select workspace'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted shrink-0" />
          </button>

          {wsDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-[#13162a] border border-border rounded-xl shadow-2xl py-1 z-50">
              {workspaces.map((ws) => (
                <div key={ws.id} className="flex items-center group">
                  <button
                    onClick={() => handleSelectWorkspace(ws.id)}
                    className={`flex-1 flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors hover:bg-elevated ${
                      ws.id === activeWorkspaceId ? 'text-text-primary' : 'text-text-secondary'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 shrink-0 text-text-muted" />
                    <span className="flex-1 truncate">{ws.name}</span>
                    {ws.isPersonal && (
                      <span className="text-[10px] text-text-muted shrink-0">Personal</span>
                    )}
                    {ws.id === activeWorkspaceId && (
                      <Check className="w-3 h-3 text-indigo-400 shrink-0" />
                    )}
                  </button>
                  {!ws.isPersonal && (
                    <button
                      onClick={() => {
                        setWsDropdownOpen(false)
                        setMembersModal({ type: 'workspace', id: ws.id, name: ws.name })
                      }}
                      title="Manage members"
                      className="px-2 py-2 text-text-muted hover:text-[#a78bfa] opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Users className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <div className="border-t border-border mt-1 pt-1">
                <button
                  onClick={() => { setWsDropdownOpen(false); setShowNewWorkspace(true) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-text-muted hover:text-indigo-400 hover:bg-elevated transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                  New workspace
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1" />

        <span className="text-sm text-text-muted truncate max-w-[160px] hidden sm:block">
          {user?.name}
        </span>
        <button
          onClick={() => setShowSettings(true)}
          title="Settings"
          className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-elevated transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
        <button
          onClick={() => { logout(); navigate('/login') }}
          title="Log out"
          className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-elevated transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Hero */}
      <div className="border-b border-border px-8 py-10">
        <div className="max-w-6xl mx-auto flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Your schemas</h1>
            <p className="text-sm text-text-muted mt-1">Design, present and monitor your architecture.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border text-text-secondary hover:text-text-primary hover:border-text-faint transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
            <button
              onClick={() => setShowNewProject(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border text-text-secondary hover:text-text-primary hover:border-text-faint transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              New project
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New schema
            </button>
          </div>
        </div>
      </div>

      {/* Projects + diagrams */}
      <div className="max-w-6xl mx-auto w-full px-8 py-8 flex flex-col gap-10">
        {loading && <p className="text-sm text-text-muted">Loading…</p>}

        {!loading && projects.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center">
              <LayoutDashboard className="w-8 h-8 text-border" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">No schemas yet</p>
              <p className="text-xs text-text-muted mt-1">Create your first architecture schema to get started.</p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border text-text-secondary hover:text-text-primary hover:border-text-faint transition-colors"
              >
                <Upload className="w-4 h-4" />
                Import or template
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New schema
              </button>
            </div>
          </div>
        )}

        {projects.map((p) => (
          <ProjectSection
            key={p.id}
            project={p}
            projects={projects}
            activeWorkspaceId={activeWorkspaceId}
            onDeleteProject={handleDeleteProject}
            onOpenMembers={() => setMembersModal({ type: 'project', id: p.id, name: p.name })}
          />
        ))}
      </div>

      {showModal && (
        <NewSchemaModal
          projects={projects}
          activeWorkspaceId={activeWorkspaceId}
          onClose={() => setShowModal(false)}
          onCreated={handleModalCreated}
        />
      )}

      {showNewProject && (
        <NewProjectModal
          activeWorkspaceId={activeWorkspaceId}
          onClose={() => setShowNewProject(false)}
          onCreated={handleProjectCreated}
        />
      )}

      {showNewWorkspace && (
        <NewWorkspaceModal
          onClose={() => setShowNewWorkspace(false)}
          onCreated={handleWorkspaceCreated}
        />
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {membersModal && (
        <MembersModal
          title={`${membersModal.name} — Members`}
          entityType={membersModal.type}
          entityId={membersModal.id}
          onClose={() => setMembersModal(null)}
        />
      )}

      {showImport && (
        <ImportDialog
          projects={projects}
          activeWorkspaceId={activeWorkspaceId}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  )
}
