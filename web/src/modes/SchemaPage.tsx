import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { TopBar } from '../components/layout/TopBar'
import { Sidebar } from '../components/layout/Sidebar'
import { DesignMode } from './DesignMode'
import { PresentMode } from './PresentMode'
import { MonitorMode } from './MonitorMode'
import { useUIStore } from '../stores/ui'
import { useDiagramStore } from '../stores/diagram'
import { api } from '../lib/api'

export function SchemaPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { mode } = useUIStore()
  const { diagramId: loadedId, loadDiagram } = useDiagramStore()
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    // Already loaded (e.g. navigated from creation flow) — skip the fetch
    if (loadedId === id) {
      setLoading(false)
      return
    }
    setLoading(true)
    setNotFound(false)
    api.diagrams.get(id)
      .then((d) => {
        loadDiagram({
          id: d.id,
          projectId: d.projectId,
          defaultBranchId: d.defaultBranchId,
          name: d.name,
          diagramType: d.diagramType,
          nodes: JSON.parse(d.nodesJson || '[]'),
          edges: JSON.parse(d.edgesJson || '[]'),
        })
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-base text-text-muted text-sm">
        Loading…
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-base">
        <p className="text-sm text-text-muted">Diagram not found.</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
        >
          Back to home
        </button>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-base text-text-primary overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        {mode === 'design' && <Sidebar />}
        <main className="flex flex-1 overflow-hidden">
          {mode === 'design'  && <DesignMode />}
          {mode === 'present' && <PresentMode />}
          {mode === 'monitor' && <MonitorMode />}
        </main>
      </div>
    </div>
  )
}
