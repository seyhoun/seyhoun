import { Handle, Position } from '@xyflow/react'
import type { DatabaseEntry } from '../../types/diagram'

// ── Handle ID helpers ─────────────────────────────────────────────────

/** Encode a sub-resource name so it's safe to use in a handle ID */
export function slugify(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '-')
}

export function topicHandleId(topic: string, kind: 't' | 's') {
  return `sub-topic-${slugify(topic)}-${kind}`
}

export function queueHandleId(queue: string, kind: 't' | 's') {
  return `sub-queue-${slugify(queue)}-${kind}`
}

export function dbHandleId(dbName: string, kind: 't' | 's') {
  return `sub-db-${slugify(dbName)}-${kind}`
}

export function tableHandleId(dbName: string, schemaName: string | undefined, tableName: string, kind: 't' | 's') {
  const parts = [dbName, schemaName, tableName].filter((v): v is string => Boolean(v)).map(slugify).join('.')
  return `sub-table-${parts}-${kind}`
}

// ── Shared sub-item row component ─────────────────────────────────────

function SubRow({
  label,
  accent,
  targetId,
  sourceId,
}: {
  label: string
  accent: string
  targetId: string
  sourceId: string
}) {
  return (
    <div className="relative flex items-center">
      {/* Left handle — target */}
      <Handle
        type="target"
        position={Position.Left}
        id={targetId}
        className="arch-sub-handle"
        style={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)' }}
      />

      <div
        className={`
          flex-1 flex items-center gap-1.5
          px-2 py-0.5 rounded border
          bg-[#1e2135] border-border/70
          text-[9px] font-mono text-text-secondary
          min-w-0
        `}
      >
        <span className={`w-1 h-1 rounded-full shrink-0 ${accent}`} />
        <span className="truncate">{label}</span>
      </div>

      {/* Right handle — source */}
      <Handle
        type="source"
        position={Position.Right}
        id={sourceId}
        className="arch-sub-handle"
        style={{ position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)' }}
      />
    </div>
  )
}

// ── TopicList ─────────────────────────────────────────────────────────

const TOPIC_LIMIT = 6

export function TopicList({ topics }: { topics: string[] }) {
  const visible = topics.slice(0, TOPIC_LIMIT)
  const overflow = topics.length - visible.length

  return (
    <div className="mt-2 space-y-1">
      <p className="text-[9px] uppercase tracking-widest text-text-muted mb-1">Topics</p>
      {visible.map((t) => (
        <SubRow
          key={t}
          label={t}
          accent="bg-amber-400"
          targetId={topicHandleId(t, 't')}
          sourceId={topicHandleId(t, 's')}
        />
      ))}
      {overflow > 0 && (
        <p className="text-[9px] text-text-muted text-right">+{overflow} more</p>
      )}
    </div>
  )
}

// ── QueueList ─────────────────────────────────────────────────────────

const QUEUE_LIMIT = 6

export function QueueList({ queues }: { queues: string[] }) {
  const visible = queues.slice(0, QUEUE_LIMIT)
  const overflow = queues.length - visible.length

  return (
    <div className="mt-2 space-y-1">
      <p className="text-[9px] uppercase tracking-widest text-text-muted mb-1">Queues</p>
      {visible.map((q) => (
        <SubRow
          key={q}
          label={q}
          accent="bg-orange-400"
          targetId={queueHandleId(q, 't')}
          sourceId={queueHandleId(q, 's')}
        />
      ))}
      {overflow > 0 && (
        <p className="text-[9px] text-text-muted text-right">+{overflow} more</p>
      )}
    </div>
  )
}

// ── DatabaseList ──────────────────────────────────────────────────────

const TABLE_LIMIT = 6

export function DatabaseList({ databases }: { databases: DatabaseEntry[] }) {
  // Flatten all tables across all databases to count for the limit
  let shown = 0

  return (
    <div className="mt-2 space-y-2">
      <p className="text-[9px] uppercase tracking-widest text-text-muted mb-1">Databases</p>
      {databases.map((db) => {
        // Flatten tables for this db (schemas or flat)
        const allTables: Array<{ table: string; schema?: string }> = db.schemas && db.schemas.length > 0
          ? db.schemas.flatMap((s) => s.tables.map((t) => ({ table: t, schema: s.name })))
          : db.tables.map((t) => ({ table: t }))

        return (
          <div key={db.id} className="space-y-1">
            {/* Database-level row */}
            <div className="relative flex items-center">
              <Handle
                type="target"
                position={Position.Left}
                id={dbHandleId(db.name, 't')}
                className="arch-sub-handle"
                style={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)' }}
              />
              <div className="flex-1 px-2 py-0.5 rounded bg-hover border border-border">
                <span className="text-[9px] font-semibold text-[#a8abbc]">{db.name}</span>
              </div>
              <Handle
                type="source"
                position={Position.Right}
                id={dbHandleId(db.name, 's')}
                className="arch-sub-handle"
                style={{ position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>

            {/* Table rows (indented) */}
            {allTables.map(({ table, schema }) => {
              if (shown >= TABLE_LIMIT) return null
              shown++
              const isLast = shown === TABLE_LIMIT && allTables.length > TABLE_LIMIT
              return (
                <div key={`${schema ?? ''}-${table}`} className="pl-2">
                  {isLast ? (
                    <p className="text-[9px] text-text-muted text-right">
                      +{allTables.length - TABLE_LIMIT + 1} more tables
                    </p>
                  ) : (
                    <SubRow
                      label={schema ? `${schema}.${table}` : table}
                      accent="bg-sky-400"
                      targetId={tableHandleId(db.name, schema, table, 't')}
                      sourceId={tableHandleId(db.name, schema, table, 's')}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
