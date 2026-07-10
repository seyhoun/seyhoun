import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import type { User } from '../../types/diagram'

interface Props {
  currentUserId: string
}

export function AdminUsersTab({ currentUserId }: Props) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Add user form
  const [showAdd, setShowAdd] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addName, setAddName] = useState('')
  const [addPassword, setAddPassword] = useState('')
  const [addIsAdmin, setAddIsAdmin] = useState(false)
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      setUsers(await api.admin.listUsers())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleAddUser() {
    if (!addEmail.trim() || !addName.trim() || !addPassword.trim()) {
      setAddError('All fields are required')
      return
    }
    if (addPassword.length < 8) {
      setAddError('Password must be at least 8 characters')
      return
    }
    setAddLoading(true)
    setAddError('')
    try {
      const user = await api.admin.createUser({
        email: addEmail.trim(),
        name: addName.trim(),
        password: addPassword,
        isAdmin: addIsAdmin,
      })
      setUsers(prev => [...prev, user])
      setShowAdd(false)
      setAddEmail('')
      setAddName('')
      setAddPassword('')
      setAddIsAdmin(false)
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : 'Failed to create user')
    } finally {
      setAddLoading(false)
    }
  }

  async function handleToggleAdmin(user: User) {
    try {
      const updated = await api.admin.updateUser(user.id, { isAdmin: !user.isAdmin })
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update user')
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm('Delete this user? This cannot be undone.')) return
    try {
      await api.admin.deleteUser(userId)
      setUsers(prev => prev.filter(u => u.id !== userId))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete user')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {/* User table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-base border-b border-border">
              <th className="text-left px-4 py-2 text-[#6b7280] font-medium">Name</th>
              <th className="text-left px-4 py-2 text-[#6b7280] font-medium">Email</th>
              <th className="text-left px-4 py-2 text-[#6b7280] font-medium">Admin</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-border last:border-0 hover:bg-elevated/50">
                <td className="px-4 py-2.5 text-white">{user.name}</td>
                <td className="px-4 py-2.5 text-[#9ca3af]">{user.email}</td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => handleToggleAdmin(user)}
                    disabled={user.id === currentUserId}
                    title={user.id === currentUserId ? 'Cannot change your own admin status' : undefined}
                    className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                      user.isAdmin
                        ? 'bg-[#a78bfa]/20 text-[#a78bfa] hover:bg-[#a78bfa]/30'
                        : 'bg-border text-[#6b7280] hover:bg-[#3d4170]'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {user.isAdmin ? 'Admin' : 'User'}
                  </button>
                </td>
                <td className="px-4 py-2.5 text-right">
                  {user.id !== currentUserId && (
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-[#6b7280] hover:text-red-400 transition-colors text-xs"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[#6b7280]">No users found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add user */}
      {!showAdd ? (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full py-2 border border-dashed border-border rounded-lg text-sm text-[#6b7280] hover:border-[#6366f1] hover:text-[#6366f1] transition-colors"
        >
          + Add user
        </button>
      ) : (
        <div className="border border-border rounded-lg p-4 space-y-3">
          <div className="text-sm font-medium text-white">New user</div>
          {addError && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {addError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Name"
              value={addName}
              onChange={e => setAddName(e.target.value)}
              className="px-3 py-2 bg-base border border-border rounded-lg text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#6366f1]"
            />
            <input
              type="email"
              placeholder="Email"
              value={addEmail}
              onChange={e => setAddEmail(e.target.value)}
              className="px-3 py-2 bg-base border border-border rounded-lg text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#6366f1]"
            />
          </div>
          <input
            type="password"
            placeholder="Password (min 8 characters)"
            value={addPassword}
            onChange={e => setAddPassword(e.target.value)}
            className="w-full px-3 py-2 bg-base border border-border rounded-lg text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#6366f1]"
          />
          <label className="flex items-center gap-2 text-sm text-[#9ca3af] cursor-pointer">
            <input
              type="checkbox"
              checked={addIsAdmin}
              onChange={e => setAddIsAdmin(e.target.checked)}
              className="accent-[#6366f1]"
            />
            Grant admin privileges
          </label>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAddUser}
              disabled={addLoading}
              className="px-4 py-1.5 bg-[#6366f1] hover:bg-[#5254cc] text-white text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              {addLoading ? 'Creating…' : 'Create'}
            </button>
            <button
              onClick={() => { setShowAdd(false); setAddError('') }}
              className="px-4 py-1.5 bg-border hover:bg-[#3d4170] text-white text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
