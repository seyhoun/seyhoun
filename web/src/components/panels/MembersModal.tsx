import { useState, useEffect } from 'react'
import { X, Crown, Shield, Code2, MessageSquare, Eye, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import { UserSearch } from './UserSearch'
import type { WorkspaceMember, ProjectMember, MemberRole } from '../../types/diagram'

type AnyMember = (WorkspaceMember | ProjectMember) & { user?: { id: string; email: string; name: string } }

const ROLES: { value: MemberRole; label: string; icon: React.ReactNode }[] = [
  { value: 'owner',      label: 'Owner',      icon: <Crown className="w-3 h-3" /> },
  { value: 'maintainer', label: 'Maintainer', icon: <Shield className="w-3 h-3" /> },
  { value: 'developer',  label: 'Developer',  icon: <Code2 className="w-3 h-3" /> },
  { value: 'commenter',  label: 'Commenter',  icon: <MessageSquare className="w-3 h-3" /> },
  { value: 'viewer',     label: 'Viewer',     icon: <Eye className="w-3 h-3" /> },
]

const ROLE_WEIGHTS: Record<MemberRole, number> = {
  owner: 5, maintainer: 4, developer: 3, commenter: 2, viewer: 1,
}

interface Props {
  title: string
  entityType: 'workspace' | 'project'
  entityId: string
  onClose: () => void
}

export function MembersModal({ title, entityType, entityId, onClose }: Props) {
  const { user: currentUser } = useAuthStore()
  const [members, setMembers] = useState<AnyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Add member
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; email: string } | null>(null)
  const [addRole, setAddRole] = useState<MemberRole>('viewer')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')

  const currentUserMember = members.find(m => m.userId === currentUser?.id)
  const currentUserRole = currentUserMember?.role ?? 'viewer'
  const currentUserWeight = ROLE_WEIGHTS[currentUserRole]
  const canManage = currentUserWeight >= ROLE_WEIGHTS.maintainer

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = entityType === 'workspace'
        ? await api.workspaceMembers.list(entityId)
        : await api.projectMembers.list(entityId)
      setMembers(data as AnyMember[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [entityId, entityType])

  async function handleUpdateRole(memberId: string, role: MemberRole) {
    try {
      if (entityType === 'workspace') {
        const updated = await api.workspaceMembers.update(entityId, memberId, { role })
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: updated.role } : m))
      } else {
        const updated = await api.projectMembers.update(entityId, memberId, { role })
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: updated.role } : m))
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update role')
    }
  }

  async function handleRemove(memberId: string) {
    try {
      if (entityType === 'workspace') {
        await api.workspaceMembers.remove(entityId, memberId)
      } else {
        await api.projectMembers.remove(entityId, memberId)
      }
      setMembers(prev => prev.filter(m => m.id !== memberId))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to remove member')
    }
  }

  async function handleAddMember() {
    if (!selectedUser) return
    setAddLoading(true)
    setAddError('')
    try {
      if (entityType === 'workspace') {
        const member = await api.workspaceMembers.add(entityId, { userId: selectedUser.id, role: addRole })
        setMembers(prev => [...prev, { ...member, user: selectedUser } as AnyMember])
      } else {
        const member = await api.projectMembers.add(entityId, { userId: selectedUser.id, role: addRole })
        setMembers(prev => [...prev, { ...member, user: selectedUser } as AnyMember])
      }
      setSelectedUser(null)
      setAddRole('viewer')
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : 'Failed to add member')
    } finally {
      setAddLoading(false)
    }
  }

  // Roles the current user is allowed to assign
  const assignableRoles = ROLES.filter(r => {
    if (r.value === 'owner') return currentUserWeight >= ROLE_WEIGHTS.owner
    return true
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg mx-4 bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-text-primary">{title}</h2>
            <p className="text-xs text-text-muted mt-0.5">
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-1">
              {members.map(member => {
                const isCurrentUser = member.userId === currentUser?.id
                const targetIsOwner = member.role === 'owner'
                // Cannot change/remove owners unless you are also an owner
                const canEdit = canManage && (!targetIsOwner || currentUserWeight >= ROLE_WEIGHTS.owner) && !isCurrentUser

                return (
                  <div key={member.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-elevated/60">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center text-sm font-medium text-[#a78bfa] flex-shrink-0">
                      {(member.user?.name ?? '?')[0].toUpperCase()}
                    </div>
                    {/* Name + email */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">
                        {member.user?.name ?? member.userId}
                        {isCurrentUser && <span className="ml-1.5 text-xs text-[#6b7280]">(you)</span>}
                      </div>
                      <div className="text-xs text-[#6b7280] truncate">{member.user?.email ?? ''}</div>
                    </div>
                    {/* Role */}
                    {canEdit ? (
                      <select
                        value={member.role}
                        onChange={e => handleUpdateRole(member.id, e.target.value as MemberRole)}
                        className="bg-base border border-border rounded-lg px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-[#6366f1] cursor-pointer"
                      >
                        {assignableRoles.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        member.role === 'owner' ? 'bg-[#a78bfa]/20 text-[#a78bfa]' :
                        member.role === 'maintainer' ? 'bg-[#6366f1]/20 text-[#6366f1]' :
                        member.role === 'developer' ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-border text-[#6b7280]'
                      }`}>
                        {member.role}
                      </span>
                    )}
                    {/* Remove */}
                    {canEdit && (
                      <button
                        onClick={() => handleRemove(member.id)}
                        className="text-[#6b7280] hover:text-red-400 transition-colors flex-shrink-0"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Add member — only for maintainers+ */}
          {canManage && (
            <div className="border-t border-border pt-4 space-y-3">
              <div className="text-xs font-medium text-text-secondary">Add member</div>
              {addError && (
                <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                  {addError}
                </div>
              )}
              {selectedUser ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-elevated border border-border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{selectedUser.name}</div>
                    <div className="text-xs text-[#6b7280] truncate">{selectedUser.email}</div>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="text-[#6b7280] hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <UserSearch onSelect={user => setSelectedUser(user)} />
              )}
              <div className="flex gap-2">
                <select
                  value={addRole}
                  onChange={e => setAddRole(e.target.value as MemberRole)}
                  className="flex-1 bg-base border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-[#6366f1]"
                >
                  {assignableRoles.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddMember}
                  disabled={!selectedUser || addLoading}
                  className="px-4 py-2 bg-[#6366f1] hover:bg-[#5254cc] text-white text-sm rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {addLoading ? 'Adding…' : 'Add'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
