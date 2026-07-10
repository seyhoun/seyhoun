import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout, Layers, Monitor, Save, PanelLeft, ChevronRight, Check, AlertCircle, History, LogOut } from 'lucide-react'
import { useUIStore, type AppMode } from '../../stores/ui'
import { useDiagramStore } from '../../stores/diagram'
import { useAuthStore } from '../../stores/auth'
import { api } from '../../lib/api'
import { ExportMenu } from '../panels/ExportMenu'
import { DIAGRAM_TYPE_MAP } from '../../lib/techRegistry'

const MODES: { key: AppMode; label: string; Icon: typeof Layout }[] = [
  { key: 'design',  label: 'Design',  Icon: Layout },
  { key: 'present', label: 'Present', Icon: Layers },
  { key: 'monitor', label: 'Monitor', Icon: Monitor },
]

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function TopBar() {
  const navigate = useNavigate()
  const { mode, setMode, toggleSidebar, historyPanelOpen, setHistoryPanelOpen } = useUIStore()
  const { user, logout } = useAuthStore()
  const { diagramId, defaultBranchId, diagramName, diagramType, nodes, edges, isDirty, markSaved, breadcrumb, popToIndex, loadDiagram } = useDiagramStore()
  const [saveState, setSaveState] = useState<SaveState>('idle')

  async function save() {
    if (!diagramId || !defaultBranchId) return
    setSaveState('saving')
    try {
      await api.commits.create(defaultBranchId, {
        message: 'Save',
        nodesJson: JSON.stringify(nodes),
        edgesJson: JSON.stringify(edges),
      })
      markSaved()
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
    } catch (e) {
      console.error('Save failed', e)
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 3000)
    }
  }

  async function goHome() {
    if (isDirty && diagramId) await save()
    navigate('/')
  }

  async function navigateToBreadcrumb(index: number) {
    if (diagramId && isDirty) await save()

    const target = breadcrumb[index]
    if (!target) return

    try {
      const d = await api.diagrams.get(target.diagramId)
      popToIndex(index)
      loadDiagram({
        id: target.diagramId,
        projectId: d.projectId,
        defaultBranchId: d.defaultBranchId,
        name: target.diagramName,
        diagramType: d.diagramType,
        nodes: JSON.parse(d.nodesJson || '[]'),
        edges: JSON.parse(d.edgesJson || '[]'),
      })
      navigate(`/schema/${target.diagramId}`)
    } catch (e) {
      console.error('Failed to navigate to breadcrumb', e)
    }
  }

  const showBreadcrumb = breadcrumb.length > 0

  return (
    <header className="h-12 shrink-0 flex items-center gap-3 px-4 border-b border-border bg-base">
      {/* Sidebar toggle */}
      <button
        onClick={toggleSidebar}
        className="text-text-muted hover:text-text-secondary transition-colors"
        title="Toggle sidebar"
      >
        <PanelLeft className="w-4 h-4" />
      </button>

      {/* Logo → home (auto-saves first) */}
      <button
        onClick={goHome}
        className="flex items-center gap-2 select-none hover:opacity-80 transition-opacity"
      >
        <img src="/seyhoun.png" alt="Seyhoun" className="h-7 w-auto" />
      </button>

      <div className="w-px h-5 bg-border" />

      {/* Breadcrumb / current diagram name */}
      <div className="flex items-center gap-1 min-w-0 flex-1">
        {showBreadcrumb ? (
          <>
            {breadcrumb.map((crumb, i) => (
              <span key={crumb.diagramId} className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => navigateToBreadcrumb(i)}
                  className="text-xs text-text-muted hover:text-indigo-400 transition-colors truncate max-w-[120px]"
                  title={crumb.diagramName}
                >
                  {crumb.diagramName}
                </button>
                <ChevronRight className="w-3 h-3 text-border shrink-0" />
              </span>
            ))}
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm text-text-secondary truncate max-w-[200px]">{diagramName}</span>
              {isDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" title="Unsaved changes" />
              )}
            </span>
          </>
        ) : (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm text-text-secondary truncate max-w-[240px]">{diagramName}</span>
            {diagramType && DIAGRAM_TYPE_MAP.get(diagramType) && (
              <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {DIAGRAM_TYPE_MAP.get(diagramType)!.label}
              </span>
            )}
            {isDirty && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" title="Unsaved changes" />
            )}
          </div>
        )}
      </div>

      {/* Mode switcher */}
      <div className="flex items-center gap-1 bg-elevated border border-border rounded-lg p-0.5">
        {MODES.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              mode === key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-text-muted hover:text-text-primary hover:bg-hover'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Export menu (all modes) */}
      <ExportMenu />

      {/* History toggle (design mode only) */}
      {mode === 'design' && diagramId && (
        <button
          onClick={() => setHistoryPanelOpen(!historyPanelOpen)}
          title="Version history"
          className={`p-1.5 rounded-md transition-colors ${
            historyPanelOpen
              ? 'text-indigo-400 bg-indigo-900/30'
              : 'text-text-muted hover:text-text-secondary hover:bg-elevated'
          }`}
        >
          <History className="w-4 h-4" />
        </button>
      )}

      {/* User / logout */}
      {user && (
        <div className="flex items-center gap-2 ml-1">
          <span className="text-xs text-text-muted hidden sm:block max-w-[120px] truncate" title={user.email}>
            {user.name}
          </span>
          <button
            onClick={() => { logout(); navigate('/login') }}
            title="Sign out"
            className="p-1.5 rounded-md text-text-muted hover:text-text-secondary hover:bg-elevated transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Save */}
      <div className="flex items-center gap-2 ml-1">
        <button
          onClick={save}
          disabled={saveState === 'saving' || (!isDirty && saveState === 'idle') || !diagramId}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
            disabled:cursor-not-allowed
            ${saveState === 'saved'
              ? 'bg-emerald-600 text-white'
              : saveState === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-30'
            }`}
        >
          {saveState === 'saving' && <Save className="w-3.5 h-3.5 animate-pulse" />}
          {saveState === 'saved'  && <Check className="w-3.5 h-3.5" />}
          {saveState === 'error'  && <AlertCircle className="w-3.5 h-3.5" />}
          {saveState === 'idle'   && <Save className="w-3.5 h-3.5" />}
          {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Failed' : 'Save'}
        </button>
      </div>
    </header>
  )
}
