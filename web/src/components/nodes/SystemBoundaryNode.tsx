import { Handle, Position, type NodeProps } from '@xyflow/react'
import { X } from 'lucide-react'
import type { ArchNode, UseCaseNodeData } from '../../types/diagram'
import { useDiagramStore } from '../../stores/diagram'
import { useUIStore } from '../../stores/ui'

const HANDLE_CLASS = 'arch-handle'

export function SystemBoundaryNode({ data, selected, id }: NodeProps<ArchNode>) {
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

      {/* Large dashed boundary rectangle */}
      <div
        className={`
          bg-transparent border-2 border-dashed border-pink-500/40
          rounded-lg select-none transition-all duration-150
          min-w-[240px] min-h-[160px]
          ${selected ? 'border-pink-500/70' : ''}
        `}
      >
        {/* System name at top */}
        <div className="px-3 pt-2 pb-1 border-b border-pink-500/20">
          <p className="text-xs font-semibold text-pink-400 text-center">{d.label}</p>
        </div>
        {/* Empty interior — use cases are placed manually inside by dragging */}
        <div className="p-3 min-h-[120px] flex items-center justify-center">
          <p className="text-[10px] text-[#3a3f5a] italic select-none">drag use cases here</p>
        </div>
      </div>
    </div>
  )
}
