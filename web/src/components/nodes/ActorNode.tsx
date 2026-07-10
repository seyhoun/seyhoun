import { Handle, Position, type NodeProps } from '@xyflow/react'
import { X } from 'lucide-react'
import type { ArchNode, UseCaseNodeData } from '../../types/diagram'
import { useDiagramStore } from '../../stores/diagram'
import { useUIStore } from '../../stores/ui'

const HANDLE_CLASS = 'arch-handle'

export function ActorNode({ data, selected, id }: NodeProps<ArchNode>) {
  const d = data as unknown as UseCaseNodeData
  const { deleteNode } = useDiagramStore()
  const { mode, clearSelection } = useUIStore()
  const isDesign = mode === 'design'

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    deleteNode(id)
    clearSelection()
  }

  return (
    <div className="relative flex flex-col items-center">
      <Handle type="target" position={Position.Top}    id="top-t"    className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Top}    id="top-s"    className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Left}   id="left-t"   className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Left}   id="left-s"   className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Bottom} id="bottom-t"  className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Bottom} id="bottom-s"  className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Right}  id="right-t"   className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Right}  id="right-s"   className={HANDLE_CLASS} />

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

      {/* Stick figure */}
      <svg
        width="44"
        height="64"
        viewBox="0 0 44 64"
        className={`transition-all ${selected ? 'drop-shadow-[0_0_6px_rgba(251,146,60,0.6)]' : ''}`}
      >
        {/* Head */}
        <circle cx="22" cy="10" r="8" fill="none" stroke="#fb923c" strokeWidth="2" />
        {/* Body */}
        <line x1="22" y1="18" x2="22" y2="40" stroke="#fb923c" strokeWidth="2" />
        {/* Arms */}
        <line x1="6"  y1="28" x2="38" y2="28" stroke="#fb923c" strokeWidth="2" />
        {/* Left leg */}
        <line x1="22" y1="40" x2="10" y2="58" stroke="#fb923c" strokeWidth="2" />
        {/* Right leg */}
        <line x1="22" y1="40" x2="34" y2="58" stroke="#fb923c" strokeWidth="2" />
      </svg>

      {/* Label */}
      <p className="text-xs font-semibold text-text-primary text-center mt-1 max-w-[100px] leading-tight select-none">
        {d.label}
      </p>
    </div>
  )
}
