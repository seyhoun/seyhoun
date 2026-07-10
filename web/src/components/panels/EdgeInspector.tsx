import { useEffect, useState } from 'react'
import { X, Trash2, ArrowRight } from 'lucide-react'
import { useUIStore } from '../../stores/ui'
import { useDiagramStore } from '../../stores/diagram'
import { getTech } from '../../lib/techRegistry'
import type { EdgeData, DatabaseEntry } from '../../types/diagram'
import { topicHandleId, queueHandleId, dbHandleId, tableHandleId } from '../nodes/SubItems'

const PROTOCOLS = [
  'HTTP', 'HTTPS', 'gRPC', 'GraphQL',
  'WebSocket', 'SQL', 'Pub/Sub', 'AMQP',
  'TCP', 'async', 'event', 'internal',
]

const inputCls =
  'w-full bg-elevated border border-border rounded-md px-2.5 py-1.5 text-xs ' +
  'text-text-primary placeholder-text-muted focus:outline-none focus:border-indigo-500/60 transition-colors'

const selectCls =
  'w-full bg-elevated border border-border rounded-md px-2.5 py-1.5 text-xs ' +
  'text-text-primary focus:outline-none focus:border-indigo-500/60 transition-colors appearance-none'

// ── Sub-resource selector for broker targets ──────────────────────────

function BrokerSubResource({
  topics,
  queues,
  selectedTopic,
  selectedQueue,
  onTopicChange,
  onQueueChange,
}: {
  topics: string[]
  queues: string[]
  selectedTopic: string
  selectedQueue: string
  onTopicChange: (v: string) => void
  onQueueChange: (v: string) => void
}) {
  const hasTopics = topics.length > 0
  const hasQueues = queues.length > 0

  if (!hasTopics && !hasQueues) {
    return (
      <p className="text-[10px] text-text-muted italic">
        No topics/queues defined on this broker. Add them in the node inspector first.
      </p>
    )
  }

  return (
    <>
      {hasTopics && (
        <div>
          <label className="block text-[9px] uppercase tracking-widest text-text-muted mb-1">
            Topic
          </label>
          <select
            value={selectedTopic}
            onChange={(e) => onTopicChange(e.target.value)}
            className={selectCls}
          >
            <option value="">— any topic —</option>
            {topics.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {selectedTopic && (
            <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded
              bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono">
              {selectedTopic}
            </span>
          )}
        </div>
      )}

      {hasQueues && (
        <div>
          <label className="block text-[9px] uppercase tracking-widest text-text-muted mb-1">
            Queue
          </label>
          <select
            value={selectedQueue}
            onChange={(e) => onQueueChange(e.target.value)}
            className={selectCls}
          >
            <option value="">— any queue —</option>
            {queues.map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
          {selectedQueue && (
            <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded
              bg-orange-500/10 border border-orange-500/30 text-orange-300 font-mono">
              {selectedQueue}
            </span>
          )}
        </div>
      )}
    </>
  )
}

// ── Sub-resource selector for datastore targets ───────────────────────

function DatastoreSubResource({
  databases,
  selectedDatabase,
  selectedSchema,
  selectedTable,
  onDatabaseChange,
  onSchemaChange,
  onTableChange,
}: {
  databases: DatabaseEntry[]
  selectedDatabase: string
  selectedSchema: string
  selectedTable: string
  onDatabaseChange: (v: string) => void
  onSchemaChange: (v: string) => void
  onTableChange: (v: string) => void
}) {
  const db = databases.find((d) => d.name === selectedDatabase)
  const schemas = db?.schemas ?? []
  const schema = schemas.find((s) => s.name === selectedSchema)
  // Tables are either from the selected schema, or the flat db.tables if no schemas
  const tables = schema ? schema.tables : (db?.tables ?? [])

  if (databases.length === 0) {
    return (
      <p className="text-[10px] text-text-muted italic">
        No databases defined. Add them in the node inspector first.
      </p>
    )
  }

  return (
    <>
      {/* Database picker */}
      <div>
        <label className="block text-[9px] uppercase tracking-widest text-text-muted mb-1">
          Database
        </label>
        <select
          value={selectedDatabase}
          onChange={(e) => {
            onDatabaseChange(e.target.value)
            onSchemaChange('')
            onTableChange('')
          }}
          className={selectCls}
        >
          <option value="">— any database —</option>
          {databases.map((d) => (
            <option key={d.id} value={d.name}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Schema picker — only if the selected DB has schemas */}
      {db && schemas.length > 0 && (
        <div>
          <label className="block text-[9px] uppercase tracking-widest text-text-muted mb-1">
            Schema
          </label>
          <select
            value={selectedSchema}
            onChange={(e) => {
              onSchemaChange(e.target.value)
              onTableChange('')
            }}
            className={selectCls}
          >
            <option value="">— any schema —</option>
            {schemas.map((s) => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Table picker */}
      {db && tables.length > 0 && (
        <div>
          <label className="block text-[9px] uppercase tracking-widest text-text-muted mb-1">
            Table
          </label>
          <select
            value={selectedTable}
            onChange={(e) => onTableChange(e.target.value)}
            className={selectCls}
          >
            <option value="">— any table —</option>
            {tables.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {selectedTable && (
            <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded
              bg-sky-500/10 border border-sky-500/30 text-sky-300 font-mono">
              {[selectedDatabase, selectedSchema, selectedTable].filter(Boolean).join(' → ')}
            </span>
          )}
        </div>
      )}
    </>
  )
}

// ── Edge Inspector root ───────────────────────────────────────────────

export function EdgeInspector() {
  const { inspector, clearSelection } = useUIStore()
  const { edges, nodes, updateEdge, deleteEdge } = useDiagramStore()

  const edgeId = inspector?.kind === 'edge' ? inspector.id : null
  const edge = edges.find((e) => e.id === edgeId)

  const [label, setLabel] = useState('')
  const [protocol, setProtocol] = useState('')
  const [targetTopic, setTargetTopic] = useState('')
  const [targetQueue, setTargetQueue] = useState('')
  const [targetDatabase, setTargetDatabase] = useState('')
  const [targetSchema, setTargetSchema] = useState('')
  const [targetTable, setTargetTable] = useState('')

  useEffect(() => {
    if (edge) {
      setLabel(typeof edge.label === 'string' ? edge.label : '')
      const d = edge.data as EdgeData | undefined
      setProtocol(d?.protocol ?? '')
      setTargetTopic(d?.targetTopic ?? '')
      setTargetQueue(d?.targetQueue ?? '')
      setTargetDatabase(d?.targetDatabase ?? '')
      setTargetSchema(d?.targetSchema ?? '')
      setTargetTable(d?.targetTable ?? '')
    }
  }, [edge?.id])

  if (!edge) return null

  const sourceNode = nodes.find((n) => n.id === edge.source)
  const targetNode = nodes.find((n) => n.id === edge.target)

  const isBrokerTarget    = targetNode?.data.category === 'broker'
  const isDatastoreTarget = targetNode?.data.category === 'datastore' || targetNode?.data.category === 'analytics'

  function commitAll(overrides?: Partial<EdgeData>) {
    const merged: EdgeData = {
      protocol,
      targetTopic,
      targetQueue,
      targetDatabase,
      targetSchema,
      targetTable,
      ...overrides,
    }

    // Compute a targetHandle pointing to the relevant sub-item, if a specific
    // sub-resource is selected. This keeps the visual connection point in sync
    // when the user changes the target resource via the inspector dropdown.
    let newTargetHandle: string | undefined = undefined
    const topic = merged.targetTopic
    const queue = merged.targetQueue
    const db    = merged.targetDatabase
    const tbl   = merged.targetTable
    const sch   = merged.targetSchema

    if (topic) {
      newTargetHandle = topicHandleId(topic, 't')
    } else if (queue) {
      newTargetHandle = queueHandleId(queue, 't')
    } else if (tbl && db) {
      newTargetHandle = tableHandleId(db, sch, tbl, 't')
    } else if (db) {
      newTargetHandle = dbHandleId(db, 't')
    }

    updateEdge(edge!.id, {
      label,
      data: merged,
      ...(newTargetHandle !== undefined ? { targetHandle: newTargetHandle } : {}),
    })
  }

  function handleDelete() {
    deleteEdge(edge!.id)
    clearSelection()
  }

  return (
    <aside className="w-64 shrink-0 flex flex-col border-l border-border bg-surface">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <ArrowRight className="w-3.5 h-3.5 text-text-muted" />
        <span className="text-xs font-semibold text-text-primary flex-1">Connection</span>
        <button onClick={() => clearSelection()} className="text-text-muted hover:text-text-secondary transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {/* Source → Target */}
        <div className="flex items-center gap-2 px-2.5 py-2 bg-elevated border border-border rounded-md">
          {sourceNode && (
            <>
              <div className="flex items-center gap-1.5 min-w-0">
                {(() => {
                  const t = getTech((sourceNode.data as import('../../types/diagram').NodeData).technology)
                  return <t.Icon className={`w-3 h-3 shrink-0 ${t.colors.icon}`} />
                })()}
                <span className="text-[10px] text-text-primary truncate">{sourceNode.data.label as string}</span>
              </div>
              <ArrowRight className="w-3 h-3 shrink-0 text-text-muted" />
            </>
          )}
          {targetNode && (
            <div className="flex items-center gap-1.5 min-w-0">
              {(() => {
                const t = getTech((targetNode.data as import('../../types/diagram').NodeData).technology)
                return <t.Icon className={`w-3 h-3 shrink-0 ${t.colors.icon}`} />
              })()}
              <span className="text-[10px] text-text-primary truncate">{targetNode.data.label as string}</span>
            </div>
          )}
        </div>

        {/* Label */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1">
            Label / Description
          </label>
          <input
            className={inputCls}
            placeholder='e.g. "reads user data"'
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => commitAll()}
          />
        </div>

        {/* Protocol */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1">
            Protocol
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PROTOCOLS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  const next = protocol === p ? '' : p
                  setProtocol(next)
                  commitAll({ protocol: next })
                }}
                className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                  protocol === p
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-elevated border-border text-text-secondary hover:border-indigo-500/40 hover:text-text-primary'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Broker sub-resource targeting */}
        {isBrokerTarget && (
          <div className="pt-1 border-t border-border">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-2">
              Target Resource
            </p>
            <div className="space-y-2">
              <BrokerSubResource
                topics={targetNode?.data.topics as string[] ?? []}
                queues={targetNode?.data.queues as string[] ?? []}
                selectedTopic={targetTopic}
                selectedQueue={targetQueue}
                onTopicChange={(v) => { setTargetTopic(v); commitAll({ targetTopic: v }) }}
                onQueueChange={(v) => { setTargetQueue(v); commitAll({ targetQueue: v }) }}
              />
            </div>
          </div>
        )}

        {/* Datastore sub-resource targeting */}
        {isDatastoreTarget && (
          <div className="pt-1 border-t border-border">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-2">
              Target Resource
            </p>
            <div className="space-y-2">
              <DatastoreSubResource
                databases={targetNode?.data.databases as DatabaseEntry[] ?? []}
                selectedDatabase={targetDatabase}
                selectedSchema={targetSchema}
                selectedTable={targetTable}
                onDatabaseChange={(v) => { setTargetDatabase(v); commitAll({ targetDatabase: v, targetSchema: '', targetTable: '' }) }}
                onSchemaChange={(v) => { setTargetSchema(v); commitAll({ targetSchema: v, targetTable: '' }) }}
                onTableChange={(v) => { setTargetTable(v); commitAll({ targetTable: v }) }}
              />
            </div>
          </div>
        )}

        {/* Delete */}
        <div className="pt-1 border-t border-border">
          <button
            onClick={handleDelete}
            className="w-full flex items-center justify-center gap-2 py-1.5 rounded-md text-xs
              font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete connection
          </button>
        </div>
      </div>
    </aside>
  )
}
