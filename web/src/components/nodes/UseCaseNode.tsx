import { Handle, Position, type NodeProps } from '@xyflow/react'
import { X } from 'lucide-react'
import type { ArchNode, UseCaseNodeData } from '../../types/diagram'
import { useDiagramStore } from '../../stores/diagram'
import { useUIStore } from '../../stores/ui'

const HANDLE_CLASS = 'arch-handle'

export function UseCaseNode({ data, selected, id }: NodeProps<ArchNode>) {
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
    <div className="relative">
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

      {/* Oval shape */}
      <div
        className={`
          px-6 py-3 bg-elevated border border-pink-500/40 select-none
          transition-all duration-150 text-center
          min-w-[120px] max-w-[200px]
          ${selected ? 'ring-1 ring-pink-500/50 shadow-lg shadow-black/40' : ''}
        `}
        style={{ borderRadius: '50%' }}
      >
        <p className="text-xs font-semibold text-text-primary leading-tight">
          {d.label}
        </p>
      </div>
    </div>
  )
}
