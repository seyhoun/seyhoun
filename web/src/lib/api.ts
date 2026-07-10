import type { Project, Workspace, DiagramSummary, Diagram, DiagramVersion, DiagramVersionSummary, CommitSummary, Commit, AuthResponse, User, ImportResult, TemplateInfo, WorkspaceMember, ProjectMember, MemberRole, UserSearchResult } from '../types/diagram'
import { useDiagramStore } from '../stores/diagram'

const BASE = '/api'

function authHeaders(): Record<string, string> {
  try {
    const token = localStorage.getItem('seyhoun_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    ...init,
  })
  if (res.status === 401) {
    // Token expired or invalid — warn if there are unsaved changes, then redirect
    const isDirty = useDiagramStore.getState().isDirty
    if (isDirty) {
      window.alert('Your session has expired. Unsaved changes will be lost.')
    }
    localStorage.removeItem('seyhoun_token')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  auth: {
    register: (data: { email: string; name: string; password: string }) =>
      req<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      req<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    me: () => req<User>('/auth/me'),
    updateProfile: (data: { name: string; email: string }) =>
      req<User>('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      req<{ message: string }>('/auth/password', { method: 'PUT', body: JSON.stringify(data) }),
  },
  workspaces: {
    list: () => req<Workspace[]>('/workspaces'),
    create: (data: { name: string }) =>
      req<Workspace>('/workspaces', { method: 'POST', body: JSON.stringify(data) }),
    get: (id: string) => req<Workspace>(`/workspaces/${id}`),
    projects: (wsId: string) => req<Project[]>(`/workspaces/${wsId}/projects`),
    createProject: (wsId: string, data: { name: string; description?: string }) =>
      req<Project>(`/workspaces/${wsId}/projects`, { method: 'POST', body: JSON.stringify(data) }),
  },
  projects: {
    get: (id: string) => req<Project>(`/projects/${id}`),
    update: (id: string, data: Partial<Pick<Project, 'name' | 'description'>>) =>
      req<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => req<void>(`/projects/${id}`, { method: 'DELETE' }),
    diagrams: (projectId: string) =>
      req<DiagramSummary[]>(`/projects/${projectId}/diagrams`),
  },
  diagrams: {
    create: (data: {
      projectId: string
      name: string
      diagramType?: string
      nodesJson?: string
      edgesJson?: string
      pumlSource?: string
      viewport?: string
    }) => req<Diagram>('/diagrams', { method: 'POST', body: JSON.stringify(data) }),
    get: (id: string) => req<Diagram>(`/diagrams/${id}`),
    update: (
      id: string,
      data: Partial<Pick<Diagram, 'name' | 'nodesJson' | 'edgesJson' | 'pumlSource' | 'viewport'>>
    ) => req<Diagram>(`/diagrams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => req<void>(`/diagrams/${id}`, { method: 'DELETE' }),
    exportJson: (id: string) => req<unknown>(`/diagrams/${id}/export`),
  },
  versions: {
    list: (diagramId: string) =>
      req<DiagramVersionSummary[]>(`/diagrams/${diagramId}/versions`),
    get: (versionId: string) =>
      req<DiagramVersion>(`/versions/${versionId}`),
    restore: (diagramId: string, versionId: string) =>
      req<Diagram>(`/diagrams/${diagramId}/restore/${versionId}`, { method: 'POST' }),
  },
  commits: {
    listForDiagram: (diagramId: string) =>
      req<CommitSummary[]>(`/diagrams/${diagramId}/commits`),
    get: (commitId: string) =>
      req<Commit>(`/commits/${commitId}`),
    create: (branchId: string, data: { message: string; nodesJson: string; edgesJson: string; viewport?: string; pumlSource?: string }) =>
      req<Commit>(`/branches/${branchId}/commits`, { method: 'POST', body: JSON.stringify(data) }),
    revert: (diagramId: string, commitId: string) =>
      req<Commit>(`/diagrams/${diagramId}/revert/${commitId}`, { method: 'POST' }),
  },
  import: {
    json: (file: File) => uploadFile<ImportResult>('/import/json', file),
    compose: (file: File) => uploadFile<ImportResult>('/import/compose', file),
    terraform: (file: File) => uploadFile<ImportResult>('/import/terraform', file),
  },
  templates: {
    list: () => req<TemplateInfo[]>('/templates'),
    get: (id: string) => req<ImportResult>(`/templates/${id}`),
  },
  users: {
    search: (q: string) => req<UserSearchResult[]>(`/users/search?q=${encodeURIComponent(q)}`),
  },
  admin: {
    listUsers: () => req<User[]>('/admin/users'),
    createUser: (data: { email: string; name: string; password: string; isAdmin: boolean }) =>
      req<User>('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
    updateUser: (id: string, data: { name?: string; email?: string; isAdmin?: boolean }) =>
      req<User>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteUser: (id: string) => req<void>(`/admin/users/${id}`, { method: 'DELETE' }),
  },
  workspaceMembers: {
    list: (wsId: string) => req<WorkspaceMember[]>(`/workspaces/${wsId}/members`),
    add: (wsId: string, data: { userId: string; role: MemberRole }) =>
      req<WorkspaceMember>(`/workspaces/${wsId}/members`, { method: 'POST', body: JSON.stringify(data) }),
    update: (wsId: string, memberId: string, data: { role: MemberRole }) =>
      req<WorkspaceMember>(`/workspaces/${wsId}/members/${memberId}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (wsId: string, memberId: string) =>
      req<void>(`/workspaces/${wsId}/members/${memberId}`, { method: 'DELETE' }),
  },
  projectMembers: {
    list: (projectId: string) => req<ProjectMember[]>(`/projects/${projectId}/members`),
    add: (projectId: string, data: { userId: string; role: MemberRole }) =>
      req<ProjectMember>(`/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify(data) }),
    update: (projectId: string, memberId: string, data: { role: MemberRole }) =>
      req<ProjectMember>(`/projects/${projectId}/members/${memberId}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (projectId: string, memberId: string) =>
      req<void>(`/projects/${projectId}/members/${memberId}`, { method: 'DELETE' }),
  },
}

async function uploadFile<T>(path: string, file: File): Promise<T> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: form,
  })
  if (res.status === 401) {
    const isDirty = useDiagramStore.getState().isDirty
    if (isDirty) {
      window.alert('Your session has expired. Unsaved changes will be lost.')
    }
    localStorage.removeItem('seyhoun_token')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}
