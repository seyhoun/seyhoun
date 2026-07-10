import { ReactFlowProvider } from '@xyflow/react'
import { Eye } from 'lucide-react'
import { ViewCanvas } from '../components/canvas/ViewCanvas'
import { useDiagramStore } from '../stores/diagram'

export function PresentMode() {
  const { diagramName, nodes, edges } = useDiagramStore()
  const isEmpty = nodes.length === 0

  return (
    <ReactFlowProvider>
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top bar */}
        <div className="h-9 shrink-0 flex items-center gap-3 px-4 border-b border-border bg-surface">
          <Eye className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-xs font-medium text-text-primary">{diagramName}</span>
          <div className="w-px h-4 bg-border" />
          <span className="text-[10px] text-text-muted">
            {nodes.length} components · {edges.length} connections
          </span>
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-elevated border border-border text-text-muted">
            Read-only
          </span>
        </div>

        {/* Canvas */}
        {isEmpty ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-2">
            <Eye className="w-8 h-8 text-border" />
            <p className="text-sm text-text-muted">No diagram loaded</p>
            <p className="text-xs text-text-muted">Open a diagram in Design mode first</p>
          </div>
        ) : (
          <ViewCanvas />
        )}

      </div>
    </ReactFlowProvider>
  )
}
