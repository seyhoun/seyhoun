import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { api } from '../../lib/api'
import type { Workspace } from '../../types/diagram'

interface Props {
  onClose: () => void
  onCreated: (workspace: Workspace) => void
}

export function NewWorkspaceModal({ onClose, onCreated }: Props) {
  const [wsName, setWsName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  async function handleCreate() {
    if (!wsName.trim() || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const ws = await api.workspaces.create({ name: wsName.trim() })
      onCreated(ws)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md mx-4 bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-text-primary">New workspace</h2>
            <p className="text-xs text-text-muted mt-0.5">Create a workspace to collaborate with your team.</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Workspace name</label>
            <input
              ref={nameRef}
              value={wsName}
              onChange={(e) => setWsName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
              placeholder="e.g. Acme Corp"
              className="w-full bg-base border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-faint focus:outline-none focus:border-indigo-500/60 transition-colors"
            />
          </div>
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!wsName.trim() || submitting}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating…' : 'Create workspace'}
          </button>
        </div>
      </div>
    </div>
  )
}
