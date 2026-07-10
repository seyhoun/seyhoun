import { useEffect, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronDown as SelectIcon } from 'lucide-react'
import { api } from '../../lib/api'
import { DIAGRAM_TYPES } from '../../lib/techRegistry'
import type { Diagram, DiagramType, Project } from '../../types/diagram'

interface Props {
  projects: Project[]
  activeWorkspaceId: string
  preselectedProjectId?: string
  onClose: () => void
  onCreated: (diagram: Diagram) => void
}

export function NewSchemaModal({
  projects,
  activeWorkspaceId,
  preselectedProjectId,
  onClose,
  onCreated,
}: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [diagramType, setDiagramType] = useState<DiagramType>('architecture')
  const [schemaName, setSchemaName] = useState('')
  const [projectMode, setProjectMode] = useState<'existing' | 'new'>(
    projects.length === 0 ? 'new' : 'existing'
  )
  const [selectedProjectId, setSelectedProjectId] = useState(
    preselectedProjectId ?? projects[0]?.id ?? ''
  )
  const [newProjectName, setNewProjectName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === 2) nameRef.current?.focus()
  }, [step])

  const selectedTypeDef = DIAGRAM_TYPES.find((dt) => dt.id === diagramType)!

  const canSubmit =
    schemaName.trim() &&
    (projectMode === 'existing' ? !!selectedProjectId : !!newProjectName.trim())

  async function handleCreate() {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError('')
    try {
      let projectId = selectedProjectId
      if (projectMode === 'new') {
        const p = await api.workspaces.createProject(activeWorkspaceId, { name: newProjectName.trim() })
        projectId = p.id
      }
      const d = await api.diagrams.create({ projectId, name: schemaName.trim(), diagramType })
      onCreated(d)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  const inputCls =
    'w-full bg-base border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary ' +
    'placeholder-text-faint focus:outline-none focus:border-indigo-500/60 transition-colors'

  const tabActiveCls = 'bg-elevated text-text-primary'
  const tabInactiveCls = 'text-text-muted hover:text-text-secondary'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg mx-4 bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button onClick={() => setStep(1)} className="text-text-muted hover:text-text-primary transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="text-base font-semibold text-text-primary">New schema</h2>
              <p className="text-xs text-text-muted mt-0.5">
                {step === 1 ? 'Choose a diagram type to get started.' : 'Name your diagram and pick a project.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 1 ? (
          <>
            {/* Step 1: Type selection grid */}
            <div className="px-6 py-5 grid grid-cols-3 gap-2.5">
              {DIAGRAM_TYPES.map((dt) => {
                const Icon = dt.Icon
                const selected = diagramType === dt.id
                return (
                  <button
                    key={dt.id}
                    onClick={() => dt.ready && setDiagramType(dt.id)}
                    disabled={!dt.ready}
                    className={`relative flex flex-col items-start gap-2 p-3 rounded-xl border text-left transition-all
                      ${dt.ready ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}
                      ${
                        selected
                          ? 'border-indigo-500/70 bg-indigo-500/10'
                          : dt.ready
                            ? 'border-border bg-elevated/60 hover:border-[#4a4f6a] hover:bg-elevated'
                            : 'border-border bg-elevated/40'
                      }`}
                  >
                    {!dt.ready && (
                      <span className="absolute top-2 right-2 text-[9px] font-semibold uppercase tracking-wider text-text-muted bg-border rounded px-1 py-0.5 leading-none">
                        Soon
                      </span>
                    )}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${selected ? 'bg-indigo-500/20' : 'bg-border'}`}>
                      <Icon className={`w-3.5 h-3.5 ${selected ? 'text-indigo-400' : 'text-text-secondary'}`} />
                    </div>
                    <div>
                      <p className={`text-xs font-medium leading-tight ${selected ? 'text-text-primary' : 'text-text-dim'}`}>
                        {dt.label}
                      </p>
                      <p className="text-[10px] text-text-muted leading-tight mt-0.5 line-clamp-2">
                        {dt.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text-primary transition-colors">
                Cancel
              </button>
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Step 2: Name + project */}
            <div className="px-6 py-5 flex flex-col gap-5">
              {/* Selected type badge */}
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded flex items-center justify-center bg-indigo-500/20">
                  <selectedTypeDef.Icon className="w-3 h-3 text-indigo-400" />
                </div>
                <span className="text-xs font-medium text-indigo-400">{selectedTypeDef.label}</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-secondary">Schema name</label>
                <input
                  ref={nameRef}
                  value={schemaName}
                  onChange={(e) => setSchemaName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                  placeholder="e.g. User service architecture"
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-secondary">Project</label>

                <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                  {projects.length > 0 && (
                    <button
                      onClick={() => setProjectMode('existing')}
                      className={`flex-1 py-2 font-medium transition-colors ${projectMode === 'existing' ? tabActiveCls : tabInactiveCls}`}
                    >
                      Existing
                    </button>
                  )}
                  <button
                    onClick={() => setProjectMode('new')}
                    className={`flex-1 py-2 font-medium transition-colors ${projectMode === 'new' ? tabActiveCls : tabInactiveCls}`}
                  >
                    New project
                  </button>
                </div>

                {projectMode === 'existing' && projects.length > 0 ? (
                  <div className="relative">
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full appearance-none bg-base border border-border rounded-lg px-3 py-2.5 pr-8 text-sm text-text-primary focus:outline-none focus:border-indigo-500/60 transition-colors"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <SelectIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                  </div>
                ) : (
                  <input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                    placeholder="Project name…"
                    className={inputCls}
                  />
                )}
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text-primary transition-colors">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!canSubmit || submitting}
                className="px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating…' : 'Create schema'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
