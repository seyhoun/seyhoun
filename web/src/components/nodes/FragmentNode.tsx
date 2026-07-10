import { type NodeProps } from '@xyflow/react'
import type { ArchNode, SequenceNodeData } from '../../types/diagram'
import { useUIStore } from '../../stores/ui'
import { NodeHandles } from './shared/NodeHandles'
import { NodeDeleteButton } from './shared/NodeDeleteButton'

const RING = 'ring-1 ring-rose-500/50 shadow-lg shadow-black/40'

// Fragment types that use a dashed divider for the two regions
const DUAL_REGION = new Set(['alt', 'break'])

export function FragmentNode({ data, selected, id }: NodeProps<ArchNode>) {
  const d = data as unknown as SequenceNodeData
  const { mode } = useUIStore()
  const isDesign = mode === 'design'

  const fragType = d.fragmentType ?? 'alt'
  const condition = d.fragmentCondition ?? ''
  const isDual = DUAL_REGION.has(fragType)

  // Pentagon tag dimensions
  const tagW = 56, tagH = 22, tagTip = 10

  return (
    <div className="relative">
      <NodeHandles />
      {isDesign && selected && <NodeDeleteButton nodeId={id} />}

      <div
        className={`
          relative rounded-lg border border-dashed border-rose-500/40 bg-elevated/20
          select-none transition-all duration-150 min-w-[220px] min-h-[140px]
          ${selected ? RING : ''}
        `}
      >
        {/* Pentagon tag in top-left */}
        <div className="absolute -top-px -left-px" style={{ width: tagW, height: tagH }}>
          <svg width={tagW} height={tagH}>
            <polygon
              points={`0,0 ${tagW - tagTip},0 ${tagW},${tagH / 2} ${tagW - tagTip},${tagH} 0,${tagH}`}
              fill="#1e1a2e"
              stroke={selected ? '#fb7185' : '#fb718566'}
              strokeWidth="1"
            />
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-start pl-2 text-[10px] font-bold text-rose-400 font-mono"
            style={{ paddingRight: tagTip + 2 }}
          >
            {fragType}
          </span>
        </div>

        {/* Condition text */}
        <div className="pt-6 px-3 pb-0">
          {condition && (
            <p className="text-[10px] text-rose-300/80 font-mono">[{condition}]</p>
          )}
        </div>

        {/* Main region */}
        <div className={`px-3 flex items-center justify-center ${isDual ? 'min-h-[44px]' : 'min-h-[72px]'}`}>
          <p className="text-[10px] text-[#4a4f6a] italic">region 1</p>
        </div>

        {/* Dashed divider + second region for alt/break */}
        {isDual && (
          <>
            <div className="border-t border-dashed border-rose-500/30 mx-2" />
            <div className="px-3 min-h-[44px] flex items-center justify-center">
              <p className="text-[10px] text-[#4a4f6a] italic">region 2</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
