import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { api } from '../api'

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const mockProject = {
  id: 'p1',
  workspaceId: 'ws1',
  name: 'Alpha',
  description: 'desc',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const mockDiagram = {
  id: 'd1',
  projectId: 'p1',
  name: 'Main',
  nodesJson: '[]',
  edgesJson: '[]',
  pumlSource: '',
  viewport: '{"x":0,"y":0,"zoom":1}',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

// ── Workspaces ────────────────────────────────────────────────────────────────

describe('api.workspaces.projects', () => {
  it('returns projects for a workspace', async () => {
    server.use(http.get('/api/workspaces/ws1/projects', () => HttpResponse.json([mockProject])))
    const result = await api.workspaces.projects('ws1')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('p1')
  })
})

describe('api.workspaces.createProject', () => {
  it('posts and returns the created project', async () => {
    server.use(
      http.post('/api/workspaces/ws1/projects', () => HttpResponse.json(mockProject, { status: 201 }))
    )
    const result = await api.workspaces.createProject('ws1', { name: 'Alpha', description: 'desc' })
    expect(result.id).toBe('p1')
    expect(result.name).toBe('Alpha')
  })
})

// ── Projects ──────────────────────────────────────────────────────────────────

describe('api.projects.get', () => {
  it('fetches a single project by id', async () => {
    server.use(http.get('/api/projects/p1', () => HttpResponse.json(mockProject)))
    const result = await api.projects.get('p1')
    expect(result.id).toBe('p1')
  })
})

describe('api.projects.update', () => {
  it('puts and returns the updated project', async () => {
    const updated = { ...mockProject, name: 'Updated' }
    server.use(http.put('/api/projects/p1', () => HttpResponse.json(updated)))
    const result = await api.projects.update('p1', { name: 'Updated' })
    expect(result.name).toBe('Updated')
  })
})

describe('api.projects.delete', () => {
  it('sends DELETE and resolves without error on 204', async () => {
    server.use(http.delete('/api/projects/p1', () => new HttpResponse(null, { status: 204 })))
    await expect(api.projects.delete('p1')).resolves.toBeUndefined()
  })
})

describe('api.projects.diagrams', () => {
  it('returns diagram summaries for a project', async () => {
    const summary = { id: 'd1', projectId: 'p1', name: 'Main', createdAt: '', updatedAt: '' }
    server.use(http.get('/api/projects/p1/diagrams', () => HttpResponse.json([summary])))
    const result = await api.projects.diagrams('p1')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('d1')
  })
})

// ── Diagrams ──────────────────────────────────────────────────────────────────

describe('api.diagrams.create', () => {
  it('posts and returns the created diagram', async () => {
    server.use(
      http.post('/api/diagrams', () => HttpResponse.json(mockDiagram, { status: 201 }))
    )
    const result = await api.diagrams.create({ projectId: 'p1', name: 'Main' })
    expect(result.id).toBe('d1')
    expect(result.nodesJson).toBe('[]')
  })
})

describe('api.diagrams.get', () => {
  it('fetches a diagram by id', async () => {
    server.use(http.get('/api/diagrams/d1', () => HttpResponse.json(mockDiagram)))
    const result = await api.diagrams.get('d1')
    expect(result.id).toBe('d1')
  })
})

describe('api.diagrams.update', () => {
  it('puts and returns the updated diagram', async () => {
    const updated = { ...mockDiagram, name: 'Renamed' }
    server.use(http.put('/api/diagrams/d1', () => HttpResponse.json(updated)))
    const result = await api.diagrams.update('d1', { name: 'Renamed' })
    expect(result.name).toBe('Renamed')
  })
})

describe('api.diagrams.delete', () => {
  it('sends DELETE and resolves on 204', async () => {
    server.use(http.delete('/api/diagrams/d1', () => new HttpResponse(null, { status: 204 })))
    await expect(api.diagrams.delete('d1')).resolves.toBeUndefined()
  })
})

// ── Error handling ─────────────────────────────────────────────────────────────

describe('error handling', () => {
  it('throws an Error with the server error message on non-ok response', async () => {
    server.use(
      http.get('/api/projects/bad', () =>
        HttpResponse.json({ error: 'project not found' }, { status: 404 })
      )
    )
    await expect(api.projects.get('bad')).rejects.toThrow('project not found')
  })

  it('falls back to HTTP status text when response has no error field', async () => {
    server.use(
      http.get('/api/projects/broken', () =>
        new HttpResponse('Internal Server Error', { status: 500 })
      )
    )
    await expect(api.projects.get('broken')).rejects.toThrow()
  })
})
