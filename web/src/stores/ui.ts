import { create } from 'zustand'
import type { Project, DiagramSummary } from '../types/diagram'

export type AppMode = 'design' | 'present' | 'monitor'
export type InspectorTarget = { kind: 'node'; id: string } | { kind: 'edge'; id: string } | null

interface UIStore {
  mode: AppMode
  inspector: InspectorTarget
  sidebarOpen: boolean

  // Project / diagram tree
  projects: Project[]
  activeProjectId: string | null
  activeDiagrams: DiagramSummary[]
  loadingProjects: boolean

  // Drill-down: set to a nodeId when the user clicks the drill-in button on a node
  drillTarget: string | null

  // Version history panel
  historyPanelOpen: boolean

  setMode: (mode: AppMode) => void
  selectNode: (id: string | null) => void
  selectEdge: (id: string | null) => void
  clearSelection: () => void
  toggleSidebar: () => void
  setProjects: (projects: Project[]) => void
  setActiveProject: (id: string | null) => void
  setActiveDiagrams: (diagrams: DiagramSummary[]) => void
  setLoadingProjects: (v: boolean) => void
  setDrillTarget: (nodeId: string | null) => void
  setHistoryPanelOpen: (open: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
  mode: 'design',
  inspector: null,
  sidebarOpen: true,
  drillTarget: null,
  historyPanelOpen: false,

  projects: [],
  activeProjectId: null,
  activeDiagrams: [],
  loadingProjects: false,

  setMode: (mode) => set({ mode }),
  selectNode: (id) => set({ inspector: id ? { kind: 'node', id } : null }),
  selectEdge: (id) => set({ inspector: id ? { kind: 'edge', id } : null }),
  clearSelection: () => set({ inspector: null }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setProjects: (projects) => set({ projects }),
  setActiveProject: (id) => set({ activeProjectId: id }),
  setActiveDiagrams: (diagrams) => set({ activeDiagrams: diagrams }),
  setLoadingProjects: (v) => set({ loadingProjects: v }),
  setDrillTarget: (nodeId) => set({ drillTarget: nodeId }),
  setHistoryPanelOpen: (open) => set({ historyPanelOpen: open }),
}))
