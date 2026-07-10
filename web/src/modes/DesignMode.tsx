import { useEffect } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { ArchCanvas } from '../components/canvas/ArchCanvas'
import { NodeInspector } from '../components/panels/NodeInspector'
import { EdgeInspector } from '../components/panels/EdgeInspector'
import { VersionHistory } from '../components/panels/VersionHistory'
import { UmlNodeInspector } from '../components/panels/UmlNodeInspector'
import { UmlEdgeInspector } from '../components/panels/UmlEdgeInspector'
import { ClassNodeInspector } from '../components/panels/ClassNodeInspector'
import { EntityNodeInspector } from '../components/panels/EntityNodeInspector'
import { StateNodeInspector } from '../components/panels/StateNodeInspector'
import { FlowchartNodeInspector } from '../components/panels/FlowchartNodeInspector'
import { ActivityNodeInspector } from '../components/panels/ActivityNodeInspector'
import { UseCaseNodeInspector } from '../components/panels/UseCaseNodeInspector'
import { SequenceNodeInspector } from '../components/panels/SequenceNodeInspector'
import { useUIStore } from '../stores/ui'
import { useDiagramStore } from '../stores/diagram'
import { isInfraDiagramType } from '../lib/elementRegistry'
import {
  isClassNodeData, isEntityNodeData, isStateNodeData, isFlowchartNodeData,
  isActivityNodeData, isUseCaseNodeData, isSequenceNodeData,
} from '../types/diagram'
import { api } from '../lib/api'

function NodeInspectorRouter() {
  const { inspector } = useUIStore()
  const { nodes, diagramType } = useDiagramStore()

  if (inspector?.kind !== 'node') return null

  // Infra diagrams always use the existing NodeInspector
  if (isInfraDiagramType(diagramType)) return <NodeInspector />

  // UML diagrams: route to type-specific inspector based on node kind
  const node = nodes.find((n) => n.id === inspector.id)
  if (!node) return null

  const d = node.data
  if (isClassNodeData(d))     return <ClassNodeInspector />
  if (isEntityNodeData(d))    return <EntityNodeInspector />
  if (isStateNodeData(d))     return <StateNodeInspector />
  if (isFlowchartNodeData(d)) return <FlowchartNodeInspector />
  if (isActivityNodeData(d))  return <ActivityNodeInspector />
  if (isUseCaseNodeData(d))   return <UseCaseNodeInspector />
  if (isSequenceNodeData(d))  return <SequenceNodeInspector />
  return <UmlNodeInspector />
}

export function DesignMode() {
  const { inspector, drillTarget, setDrillTarget, historyPanelOpen } = useUIStore()
  const {
    diagramId, diagramName, projectId,
    nodes, edges, diagramType,
    isDirty, markSaved,
    updateNodeData, loadDiagram,
    pushBreadcrumb,
  } = useDiagramStore()

  const isInfra = isInfraDiagramType(diagramType)

  // Handle drill-in when user clicks the Maximize2 button on a node
  useEffect(() => {
    if (!drillTarget) return

    async function drillIn() {
      const node = nodes.find((n) => n.id === drillTarget)
      if (!node || !projectId) { setDrillTarget(null); return }

      // Auto-save current diagram before navigating
      if (diagramId && isDirty) {
        try {
          await api.diagrams.update(diagramId, {
            name: diagramName,
            nodesJson: JSON.stringify(nodes),
            edgesJson: JSON.stringify(edges),
          })
          markSaved()
        } catch (e) {
          console.error('Auto-save before drill-in failed', e)
        }
      }

      let childId = node.data.childDiagramId as string | undefined

      if (!childId) {
        // Create a new sub-diagram for this node
        try {
          const childDiagram = await api.diagrams.create({
            projectId,
            name: `${node.data.label} — Sub-Architecture`,
          })
          childId = childDiagram.id
          // Link the node to the new diagram
          updateNodeData(drillTarget!, { childDiagramId: childId })
          // Persist that link immediately
          const updatedNodes = nodes.map((n) =>
            n.id === drillTarget ? { ...n, data: { ...n.data, childDiagramId: childId } } : n
          )
          if (diagramId) {
            await api.diagrams.update(diagramId, {
              nodesJson: JSON.stringify(updatedNodes),
              edgesJson: JSON.stringify(edges),
            }).catch(console.error)
          }
        } catch (e) {
          console.error('Failed to create sub-diagram', e)
          setDrillTarget(null)
          return
        }
      }

      // Push current context onto breadcrumb
      pushBreadcrumb({
        diagramId: diagramId!,
        diagramName: diagramName,
        fromNodeId: drillTarget!,
      })

      // Load the child diagram
      try {
        const child = await api.diagrams.get(childId)
        loadDiagram({
          id: child.id,
          projectId: child.projectId,
          defaultBranchId: child.defaultBranchId,
          name: child.name,
          diagramType: child.diagramType,
          nodes: JSON.parse(child.nodesJson || '[]'),
          edges: JSON.parse(child.edgesJson || '[]'),
        })
      } catch (e) {
        console.error('Failed to load sub-diagram', e)
      }

      setDrillTarget(null)
    }

    drillIn()
  }, [drillTarget]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ReactFlowProvider>
      <div className="flex flex-1 overflow-hidden">
        <ArchCanvas />
        {inspector?.kind === 'node' && <NodeInspectorRouter />}
        {inspector?.kind === 'edge' && (isInfra ? <EdgeInspector /> : <UmlEdgeInspector />)}
        {historyPanelOpen && <VersionHistory />}
      </div>
    </ReactFlowProvider>
  )
}
