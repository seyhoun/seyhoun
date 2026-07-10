import { Handle, Position } from '@xyflow/react'

const HANDLE_CLASS = 'arch-handle'

/**
 * Standard 8-handle layout: top / bottom / left / right × source + target.
 * Used by all UML node components that support connections in any direction.
 */
export function NodeHandles() {
  return (
    <>
      <Handle type="target" position={Position.Top}    id="top-t"    className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Top}    id="top-s"    className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Left}   id="left-t"   className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Left}   id="left-s"   className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Bottom} id="bottom-t" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Bottom} id="bottom-s" className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Right}  id="right-t"  className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Right}  id="right-s"  className={HANDLE_CLASS} />
    </>
  )
}
