import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '../ui'

beforeEach(() => {
  // Reset to defaults
  useUIStore.setState({
    mode: 'design',
    inspector: null,
    sidebarOpen: true,
    projects: [],
    activeProjectId: null,
    activeDiagrams: [],
    loadingProjects: false,
    drillTarget: null,
  })
})

describe('mode', () => {
  it('defaults to design', () => {
    expect(useUIStore.getState().mode).toBe('design')
  })

  it('setMode switches between modes', () => {
    useUIStore.getState().setMode('present')
    expect(useUIStore.getState().mode).toBe('present')

    useUIStore.getState().setMode('monitor')
    expect(useUIStore.getState().mode).toBe('monitor')

    useUIStore.getState().setMode('design')
    expect(useUIStore.getState().mode).toBe('design')
  })
})

describe('inspector', () => {
  it('selectNode sets inspector to node kind', () => {
    useUIStore.getState().selectNode('node-42')
    const inspector = useUIStore.getState().inspector
    expect(inspector).toEqual({ kind: 'node', id: 'node-42' })
  })

  it('selectEdge sets inspector to edge kind', () => {
    useUIStore.getState().selectEdge('edge-7')
    const inspector = useUIStore.getState().inspector
    expect(inspector).toEqual({ kind: 'edge', id: 'edge-7' })
  })

  it('selectNode(null) clears inspector', () => {
    useUIStore.getState().selectNode('n1')
    useUIStore.getState().selectNode(null)
    expect(useUIStore.getState().inspector).toBeNull()
  })

  it('clearSelection resets inspector to null', () => {
    useUIStore.getState().selectEdge('e1')
    useUIStore.getState().clearSelection()
    expect(useUIStore.getState().inspector).toBeNull()
  })
})

describe('sidebar', () => {
  it('toggleSidebar flips open state', () => {
    expect(useUIStore.getState().sidebarOpen).toBe(true)
    useUIStore.getState().toggleSidebar()
    expect(useUIStore.getState().sidebarOpen).toBe(false)
    useUIStore.getState().toggleSidebar()
    expect(useUIStore.getState().sidebarOpen).toBe(true)
  })
})

describe('project tree', () => {
  it('setProjects populates projects array', () => {
    const projects = [
      { id: 'p1', workspaceId: 'ws1', name: 'Alpha', description: '', createdAt: '', updatedAt: '' },
      { id: 'p2', workspaceId: 'ws1', name: 'Beta', description: '', createdAt: '', updatedAt: '' },
    ]
    useUIStore.getState().setProjects(projects)
    expect(useUIStore.getState().projects).toHaveLength(2)
  })

  it('setActiveProject updates activeProjectId', () => {
    useUIStore.getState().setActiveProject('p1')
    expect(useUIStore.getState().activeProjectId).toBe('p1')

    useUIStore.getState().setActiveProject(null)
    expect(useUIStore.getState().activeProjectId).toBeNull()
  })

  it('setLoadingProjects updates flag', () => {
    useUIStore.getState().setLoadingProjects(true)
    expect(useUIStore.getState().loadingProjects).toBe(true)
    useUIStore.getState().setLoadingProjects(false)
    expect(useUIStore.getState().loadingProjects).toBe(false)
  })
})

describe('drillTarget', () => {
  it('setDrillTarget updates and clears', () => {
    useUIStore.getState().setDrillTarget('node-drill')
    expect(useUIStore.getState().drillTarget).toBe('node-drill')
    useUIStore.getState().setDrillTarget(null)
    expect(useUIStore.getState().drillTarget).toBeNull()
  })
})
