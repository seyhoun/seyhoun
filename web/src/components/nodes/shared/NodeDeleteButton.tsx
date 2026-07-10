import { X } from 'lucide-react'
import { useDiagramStore } from '../../../stores/diagram'
import { useUIStore } from '../../../stores/ui'

interface NodeDeleteButtonProps {
  nodeId: string
  /** Extra inline style to counter a parent transform (e.g. skewX on io-box). */
  style?: React.CSSProperties
}

/**
 * Delete button shown when a node is selected in design mode.
 * Positioned absolutely at the top-right corner of the node.
 */
export function NodeDeleteButton({ nodeId, style }: NodeDeleteButtonProps) {
  const { deleteNode } = useDiagramStore()
  const { clearSelection } = useUIStore()

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    deleteNode(nodeId)
    clearSelection()
  }

  return (
    <button
      onClick={handleClick}
      style={style}
      className="absolute -top-2 -right-2 z-10 w-5 h-5 rounded-full
        bg-elevated border border-red-500/40 text-red-400
        hover:bg-red-500/20 hover:border-red-400 flex items-center justify-center
        transition-colors"
      title="Delete node"
    >
      <X className="w-2.5 h-2.5" />
    </button>
  )
}
