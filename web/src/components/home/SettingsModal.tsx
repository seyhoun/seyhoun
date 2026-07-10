import { useState } from 'react'
import { X, Check } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import { AdminUsersTab } from '../panels/AdminUsersTab'

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { user, setUser } = useAuthStore()
  const [tab, setTab] = useState<'profile' | 'security' | 'admin'>('profile')

  // Profile tab
  const [name, setName] = useState(user?.name ?? '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSaved, setProfileSaved] = useState(false)

  // Security tab
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)

  async function handleSaveProfile() {
    if (!name.trim()) return
    setProfileSaving(true)
    setProfileError('')
    setProfileSaved(false)
    try {
      const updated = await api.auth.updateProfile({ name: name.trim(), email: user?.email ?? '' })
      setUser(updated)
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    } catch (e: unknown) {
      setProfileError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setProfileSaving(false)
    }
  }

  async function handleChangePassword() {
    if (!currentPw || !newPw || !confirmPw) return
    if (newPw !== confirmPw) {
      setPwError('New passwords do not match')
      return
    }
    if (newPw.length < 8) {
      setPwError('New password must be at least 8 characters')
      return
    }
    setPwSaving(true)
    setPwError('')
    setPwSaved(false)
    try {
      await api.auth.changePassword({ currentPassword: currentPw, newPassword: newPw })
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setPwSaved(true)
      setTimeout(() => setPwSaved(false), 3000)
    } catch (e: unknown) {
      setPwError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setPwSaving(false)
    }
  }

  const inputCls =
    'w-full bg-base border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary ' +
    'placeholder-text-faint focus:outline-none focus:border-indigo-500/60 transition-colors'

  const tabCls = (active: boolean) =>
    `flex-1 py-3 font-medium transition-colors ${
      active ? 'bg-elevated text-text-primary' : 'text-text-muted hover:text-text-secondary'
    }`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md mx-4 bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Settings</h2>
            <p className="text-xs text-text-faint mt-0.5">Manage your profile and security.</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border text-xs">
          <button onClick={() => setTab('profile')} className={tabCls(tab === 'profile')}>Profile</button>
          <button onClick={() => setTab('security')} className={tabCls(tab === 'security')}>Security</button>
          {user?.isAdmin && (
            <button onClick={() => setTab('admin')} className={tabCls(tab === 'admin')}>Admin</button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto max-h-[70vh]">
          {tab === 'profile' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-secondary">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-secondary">Email</label>
                <div className="w-full bg-base border border-border rounded-lg px-3 py-2.5 text-sm text-text-muted select-all cursor-default">
                  {user?.email}
                </div>
                <p className="text-[11px] text-text-faint">Email cannot be changed.</p>
              </div>
              {profileError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {profileError}
                </p>
              )}
              {profileSaved && (
                <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 flex items-center gap-1.5">
                  <Check className="w-3 h-3" /> Profile updated
                </p>
              )}
              <div className="flex justify-end pt-1">
                <button
                  onClick={handleSaveProfile}
                  disabled={!name.trim() || profileSaving}
                  className="px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {profileSaving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </>
          )}

          {tab === 'security' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-secondary">Current password</label>
                <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="••••••••" className={inputCls} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-secondary">New password</label>
                <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Min. 8 characters" className={inputCls} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-secondary">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="••••••••"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleChangePassword() }}
                  className={inputCls}
                />
              </div>
              {pwError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {pwError}
                </p>
              )}
              {pwSaved && (
                <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 flex items-center gap-1.5">
                  <Check className="w-3 h-3" /> Password changed
                </p>
              )}
              <div className="flex justify-end pt-1">
                <button
                  onClick={handleChangePassword}
                  disabled={!currentPw || !newPw || !confirmPw || pwSaving}
                  className="px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {pwSaving ? 'Changing…' : 'Change password'}
                </button>
              </div>
            </>
          )}

          {tab === 'admin' && user?.isAdmin && (
            <AdminUsersTab currentUserId={user.id} />
          )}
        </div>
      </div>
    </div>
  )
}
