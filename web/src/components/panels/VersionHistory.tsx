import { useEffect, useState } from 'react'
import { History, RotateCcw, X, Eye } from 'lucide-react'
import { useUIStore } from '../../stores/ui'
import { useDiagramStore } from '../../stores/diagram'
import { api } from '../../lib/api'
import type { CommitSummary } from '../../types/diagram'

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  return `${Math.floor(diffH / 24)}d ago`
}

export function VersionHistory() {
  const { setHistoryPanelOpen } = useUIStore()
  const { diagramId, defaultBranchId, nodes, edges, diagramName, isDirty, markSaved, loadDiagram, projectId } =
    useDiagramStore()

  const [commits, setCommits] = useState<CommitSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState<string | null>(null)

  useEffect(() => {
    if (!diagramId) return
    setLoading(true)
    api.commits
      .listForDiagram(diagramId)
      .then(setCommits)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [diagramId])

  async function handlePreview(commitId: string) {
    if (previewing === commitId) {
      // Un-preview: reload current diagram
      setPreviewing(null)
      if (!diagramId) return
      try {
        const d = await api.diagrams.get(diagramId)
        loadDiagram({
          id: d.id,
          projectId: d.projectId,
          defaultBranchId: d.defaultBranchId,
          name: d.name,
          nodes: JSON.parse(d.nodesJson || '[]'),
          edges: JSON.parse(d.edgesJson || '[]'),
        })
      } catch (e) {
        console.error('Failed to reload diagram', e)
      }
      return
    }

    try {
      const c = await api.commits.get(commitId)
      setPreviewing(commitId)
      loadDiagram({
        id: diagramId!,
        projectId: projectId!,
        defaultBranchId: defaultBranchId ?? undefined,
        name: diagramName,
        nodes: JSON.parse(c.nodesJson || '[]'),
        edges: JSON.parse(c.edgesJson || '[]'),
      })
    } catch (e) {
      console.error('Failed to preview commit', e)
    }
  }

  async function handleRestore(commitId: string) {
    if (!diagramId) return
    setRestoring(commitId)
    try {
      // Auto-save current state first so it appears in history before reverting
      if (isDirty && defaultBranchId) {
        await api.commits.create(defaultBranchId, {
          message: 'Save',
          nodesJson: JSON.stringify(nodes),
          edgesJson: JSON.stringify(edges),
        })
        markSaved()
      }
      const c = await api.commits.revert(diagramId, commitId)
      loadDiagram({
        id: diagramId,
        projectId: projectId!,
        defaultBranchId: defaultBranchId ?? undefined,
        name: diagramName,
        nodes: JSON.parse(c.nodesJson || '[]'),
        edges: JSON.parse(c.edgesJson || '[]'),
      })
      setPreviewing(null)
      // Refresh commit list
      const updated = await api.commits.listForDiagram(diagramId)
      setCommits(updated)
    } catch (e) {
      console.error('Restore failed', e)
    } finally {
      setRestoring(null)
    }
  }

  return (
    <aside className="w-72 shrink-0 border-l border-border bg-base flex flex-col">
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-border">
        <div className="flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-medium text-text-primary">Version History</span>
        </div>
        <button
          onClick={() => setHistoryPanelOpen(false)}
          className="text-text-muted hover:text-text-secondary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {previewing && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-md bg-amber-900/30 border border-amber-700/40 text-xs text-amber-300">
          Previewing a past version — changes are not saved.
        </div>
      )}

      {/* Commit list */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading && (
          <p className="px-4 py-6 text-xs text-text-muted text-center">Loading history…</p>
        )}
        {!loading && commits.length === 0 && (
          <p className="px-4 py-6 text-xs text-text-muted text-center">
            No versions yet. Save the diagram to create one.
          </p>
        )}
        {commits.map((c) => (
          <div
            key={c.id}
            className={`mx-2 mb-1 px-3 py-2.5 rounded-md border transition-colors ${
              previewing === c.id
                ? 'border-indigo-500/60 bg-indigo-900/20'
                : 'border-transparent hover:border-border hover:bg-[#13162a]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-text-primary truncate max-w-[140px]" title={c.message}>
                {c.message}
              </span>
              <span className="text-[10px] text-text-muted shrink-0 ml-2">{formatRelative(c.createdAt)}</span>
            </div>
            <div className="flex gap-1.5 mt-2">
              <button
                onClick={() => handlePreview(c.id)}
                title={previewing === c.id ? 'Stop preview' : 'Preview this version'}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                  previewing === c.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-elevated text-text-secondary hover:text-text-primary hover:bg-hover'
                }`}
              >
                <Eye className="w-3 h-3" />
                {previewing === c.id ? 'Exit' : 'Preview'}
              </button>
              <button
                onClick={() => handleRestore(c.id)}
                disabled={restoring === c.id}
                title="Restore to this version"
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-elevated text-text-secondary hover:text-emerald-400 hover:bg-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-3 h-3" />
                {restoring === c.id ? 'Restoring…' : 'Restore'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
