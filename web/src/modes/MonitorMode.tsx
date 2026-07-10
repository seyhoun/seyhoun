import { ReactFlowProvider } from '@xyflow/react'
import { Activity, GitBranch, Database, Zap, AlertTriangle } from 'lucide-react'
import { ViewCanvas } from '../components/canvas/ViewCanvas'
import { useDiagramStore } from '../stores/diagram'

// ── Plugin slot (Phase 4 placeholder) ────────────────────────────────

interface PluginSlotProps {
  icon: React.ElementType
  name: string
  tech: string
  iconColor: string
  borderColor: string
}

function PluginSlot({ icon: Icon, name, tech, iconColor, borderColor }: PluginSlotProps) {
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border ${borderColor} bg-elevated`}>
      <div className="p-1.5 rounded-md bg-hover">
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text-primary truncate">{name}</p>
        <p className="text-[10px] text-text-muted">{tech}</p>
      </div>
      <span className="text-[9px] px-1.5 py-0.5 rounded bg-hover border border-border text-text-muted">
        Phase 4
      </span>
    </div>
  )
}

// ── Health legend ─────────────────────────────────────────────────────

function HealthLegend() {
  const items = [
    { color: 'bg-emerald-400', label: 'Healthy' },
    { color: 'bg-amber-400',   label: 'Warning' },
    { color: 'bg-red-400',     label: 'Error' },
    { color: 'bg-text-muted',   label: 'Unknown' },
  ]
  return (
    <div className="flex flex-col gap-1.5">
      {items.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
          <span className="text-[10px] text-text-secondary">{label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Monitor mode root ─────────────────────────────────────────────────

export function MonitorMode() {
  const { diagramName, nodes, edges } = useDiagramStore()
  const isEmpty = nodes.length === 0

  return (
    <ReactFlowProvider>
      <div className="flex flex-1 overflow-hidden">

        {/* Canvas — animated edges show data flow */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="h-9 shrink-0 flex items-center gap-3 px-4 border-b border-border bg-surface">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-text-primary">{diagramName}</span>
            <div className="w-px h-4 bg-border" />
            <span className="text-[10px] text-text-muted">
              {nodes.length} components · {edges.length} connections
            </span>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-elevated border border-border text-text-muted">
              Read-only · Live
            </span>
          </div>

          {isEmpty ? (
            <div className="flex-1 flex items-center justify-center flex-col gap-2">
              <Activity className="w-8 h-8 text-border" />
              <p className="text-sm text-text-muted">No diagram loaded</p>
              <p className="text-xs text-text-muted">Open a diagram in Design mode first</p>
            </div>
          ) : (
            <ViewCanvas animateEdges />
          )}
        </div>

        {/* Right panel */}
        <aside className="w-64 shrink-0 flex flex-col border-l border-border bg-surface overflow-y-auto">

          {/* Health legend */}
          <section className="p-3 border-b border-border">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-2">
              Health
            </p>
            <HealthLegend />
          </section>

          {/* Plugin slots */}
          <section className="p-3 flex flex-col gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1">
              Monitoring Plugins
            </p>

            <PluginSlot
              icon={Database}
              name="PostgreSQL"
              tech="pg_stat · connections · query time"
              iconColor="text-sky-400"
              borderColor="border-sky-500/30"
            />
            <PluginSlot
              icon={GitBranch}
              name="Kafka"
              tech="consumer lag · partition offsets"
              iconColor="text-amber-400"
              borderColor="border-amber-500/30"
            />
            <PluginSlot
              icon={Zap}
              name="Redis"
              tech="memory · ops/sec · hit rate"
              iconColor="text-red-400"
              borderColor="border-red-500/30"
            />

            <div className="mt-1 px-2 py-2 rounded-md bg-elevated border border-dashed border-border">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] font-semibold text-text-secondary">Coming in Phase 4</span>
              </div>
              <p className="text-[10px] text-text-muted leading-relaxed">
                Plugins will poll live metrics and overlay health indicators directly on the architecture nodes.
              </p>
            </div>
          </section>

          {/* Live stats placeholder */}
          <section className="p-3 border-t border-border mt-auto">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-2">
              Diagram Stats
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Components', value: nodes.length },
                { label: 'Connections', value: edges.length },
                { label: 'Datastores', value: nodes.filter(n => n.data.category === 'datastore').length },
                { label: 'Services',   value: nodes.filter(n => n.data.category === 'service').length },
              ].map(({ label, value }) => (
                <div key={label} className="px-2 py-1.5 rounded-md bg-elevated border border-border">
                  <p className="text-base font-bold text-text-primary">{value}</p>
                  <p className="text-[9px] text-text-muted">{label}</p>
                </div>
              ))}
            </div>
          </section>

        </aside>
      </div>
    </ReactFlowProvider>
  )
}
