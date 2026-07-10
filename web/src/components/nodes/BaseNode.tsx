import { Handle, Position, useUpdateNodeInternals, type NodeProps } from '@xyflow/react'
import { useEffect } from 'react'
import type { ArchNode } from '../../types/diagram'
import { getTech } from '../../lib/techRegistry'
import { useUIStore } from '../../stores/ui'
import { TopicList, QueueList, DatabaseList } from './SubItems'
import { NodeDeleteButton } from './shared/NodeDeleteButton'

export function BaseNode({ data: rawData, selected, id }: NodeProps<ArchNode>) {
  const { mode } = useUIStore()
  const isDesign = mode === 'design'
  const updateNodeInternals = useUpdateNodeInternals()
  // BaseNode only renders infra nodes — cast to the concrete NodeData shape
  const data = rawData as import('../../types/diagram').NodeData
  const tech = getTech(data.technology)
  const { colors, Icon, label: techLabel } = tech

  const topics = data.topics as string[] | undefined
  const queues = data.queues as string[] | undefined
  const databases = data.databases as import('../../types/diagram').DatabaseEntry[] | undefined

  const hasSubItems =
    (topics && topics.length > 0) ||
    (queues && queues.length > 0) ||
    (databases && databases.length > 0)

  // Re-register handles whenever sub-item arrays change
  useEffect(() => {
    updateNodeInternals(id)
  }, [id, topics?.length, queues?.length, databases?.length])

  return (
    <>
      {/* All 4 positions — both source and target so connections work in any direction */}
      <Handle type="target" position={Position.Top}    id="top-t"    className="arch-handle" />
      <Handle type="source" position={Position.Top}    id="top-s"    className="arch-handle" />
      <Handle type="target" position={Position.Left}   id="left-t"   className="arch-handle" />
      <Handle type="source" position={Position.Left}   id="left-s"   className="arch-handle" />

      {/* Delete button — top-right, only when selected in design mode */}
      {isDesign && selected && <NodeDeleteButton nodeId={id} />}

      {/* Node card */}
      <div
        className={`
          relative rounded-xl border bg-elevated
          px-3 pt-2.5 pb-2 select-none transition-all duration-150
          ${hasSubItems ? 'min-w-[200px] max-w-[280px]' : 'min-w-[152px] max-w-[224px]'}
          ${colors.border}
          ${selected ? `ring-1 ${colors.ring} shadow-lg shadow-black/40` : ''}
        `}
      >
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-hover shrink-0">
            <Icon className={`w-3.5 h-3.5 ${colors.icon}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-text-primary truncate leading-tight">
              {data.label}
            </p>
            {data.host && (
              <p className="text-[10px] text-text-muted truncate leading-tight mt-0.5 font-mono">
                {data.host}{data.port ? `:${data.port}` : ''}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        {data.description && (
          <p className="mt-1.5 text-[10px] text-text-secondary line-clamp-2 leading-relaxed">
            {data.description}
          </p>
        )}

        {/* Nested sub-items: topics, queues, databases/tables */}
        {data.category === 'broker' && topics && topics.length > 0 && (
          <TopicList topics={topics} />
        )}
        {data.category === 'broker' && queues && queues.length > 0 && (
          <QueueList queues={queues} />
        )}
        {(data.category === 'datastore' || data.category === 'analytics') && databases && databases.length > 0 && (
          <DatabaseList databases={databases} />
        )}

        {/* Application: language + health endpoint */}
        {data.technology === 'application' && (data.language || data.healthEndpoint) && (
          <div className="mt-2 space-y-1">
            {data.language && (
              <span className="inline-block text-[9px] font-mono px-1.5 py-0.5 rounded
                bg-violet-500/10 border border-violet-500/30 text-violet-300">
                {data.language as string}
              </span>
            )}
            {data.healthEndpoint && (
              <p className="text-[9px] text-text-muted font-mono truncate">
                {data.healthEndpoint as string}
              </p>
            )}
          </div>
        )}

        {/* Footer: tech badge + sub-diagram indicator + health */}
        <div className="flex items-center gap-1.5 mt-2">
          <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${colors.tag}`}>
            {techLabel}
          </span>
          {data.childDiagramId && (
            <span className="text-[9px] text-indigo-400/70 ml-auto">sub-arch</span>
          )}
          {data.health && (
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ml-auto ${
              data.health === 'healthy' ? 'bg-emerald-400' :
              data.health === 'warning'  ? 'bg-amber-400'   : 'bg-red-400'
            }`} />
          )}
          {data.metricsEndpoint && (
            <span className="text-[9px] text-text-muted ml-auto">metrics</span>
          )}
        </div>
      </div>

      <Handle type="target" position={Position.Bottom} id="bottom-t"  className="arch-handle" />
      <Handle type="source" position={Position.Bottom} id="bottom-s"  className="arch-handle" />
      <Handle type="target" position={Position.Right}  id="right-t"   className="arch-handle" />
      <Handle type="source" position={Position.Right}  id="right-s"   className="arch-handle" />
    </>
  )
}
