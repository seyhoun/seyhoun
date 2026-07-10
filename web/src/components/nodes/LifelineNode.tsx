import { Handle, Position, type NodeProps } from '@xyflow/react'
import { X } from 'lucide-react'
import type { ArchNode, SequenceNodeData } from '../../types/diagram'
import { useDiagramStore } from '../../stores/diagram'
import { useUIStore } from '../../stores/ui'

const HANDLE_CLASS = 'arch-handle'
const LIFELINE_HEIGHT = 300

export function LifelineNode({ data, selected, id }: NodeProps<ArchNode>) {
  const d = data as unknown as SequenceNodeData
  const { deleteNode } = useDiagramStore()
  const { mode, clearSelection } = useUIStore()
  const isDesign = mode === 'design'

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    deleteNode(id)
    clearSelection()
  }

  return (
    <div className="relative flex flex-col items-center" style={{ width: 120 }}>
      {/* Top handles (for messages arriving at header level) */}
      <Handle type="target" position={Position.Top}   id="top-t"   className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Top}   id="top-s"   className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Left}  id="left-t"  className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Left}  id="left-s"  className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Right} id="right-t" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Right} id="right-s" className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Bottom} id="bottom-t" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Bottom} id="bottom-s" className={HANDLE_CLASS} />

      {isDesign && selected && (
        <button
          onClick={handleDelete}
          className="absolute -top-2 -right-2 z-10 w-5 h-5 rounded-full
            bg-elevated border border-red-500/40 text-red-400
            hover:bg-red-500/20 hover:border-red-400 flex items-center justify-center"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}

      {/* Participant header box */}
      <div
        className={`
          w-full px-3 py-2 rounded-lg border border-rose-500/40 bg-elevated
          select-none transition-all duration-150 text-center
          ${selected ? 'ring-1 ring-rose-500/50 shadow-lg shadow-black/40' : ''}
        `}
      >
        {d.participantType && d.participantType !== 'object' && (
          <p className="text-[9px] text-rose-400 mb-0.5">«{d.participantType}»</p>
        )}
        <p className="text-xs font-semibold text-text-primary">{d.label}</p>
      </div>

      {/* Dashed lifeline extending downward */}
      <div
        className="border-l-2 border-dashed border-rose-500/30"
        style={{ height: LIFELINE_HEIGHT, marginTop: 0 }}
      />
    </div>
  )
}

export function MessageNode({ data, selected, id }: NodeProps<ArchNode>) {
  const d = data as unknown as SequenceNodeData
  const { deleteNode } = useDiagramStore()
  const { mode, clearSelection } = useUIStore()
  const isDesign = mode === 'design'

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    deleteNode(id)
    clearSelection()
  }

  const isReturn = d.messageType === 'return'
  const isAsync  = d.messageType === 'async'

  return (
    <div className="relative flex items-center" style={{ minWidth: 120 }}>
      <Handle type="target" position={Position.Left}  id="left-t"  className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Left}  id="left-s"  className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Right} id="right-t" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Right} id="right-s" className={HANDLE_CLASS} />

      {isDesign && selected && (
        <button
          onClick={handleDelete}
          className="absolute -top-2 -right-2 z-10 w-5 h-5 rounded-full
            bg-elevated border border-red-500/40 text-red-400
            hover:bg-red-500/20 hover:border-red-400 flex items-center justify-center"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}

      <div className={`flex items-center gap-1 px-2 py-1 rounded select-none
        ${selected ? 'bg-rose-500/10 ring-1 ring-rose-500/30' : 'bg-elevated/50'}
      `}>
        {/* Arrow line */}
        <div className={`flex-1 h-px ${isReturn ? 'border-t border-dashed border-rose-400/60' : 'bg-rose-400/60'}`}
          style={{ minWidth: 80 }} />
        {/* Arrow tip indicator */}
        <span className="text-[9px] text-rose-400 font-mono shrink-0">
          {isAsync ? '→' : isReturn ? '⤵' : '➤'}
        </span>
        <span className="text-[10px] text-[#c4c7e0] font-mono shrink-0 ml-1">{d.label}</span>
      </div>
    </div>
  )
}
