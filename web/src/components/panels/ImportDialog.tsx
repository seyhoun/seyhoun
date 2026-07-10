import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Upload, FileJson, FileCode2, Container, Layers, ChevronRight } from 'lucide-react'
import { api } from '../../lib/api'
import { useDiagramStore } from '../../stores/diagram'
import type { ImportResult, TemplateInfo, Project } from '../../types/diagram'

// ── File type definitions ─────────────────────────────────────────────────

interface FileType {
  id: 'json' | 'compose' | 'terraform'
  label: string
  description: string
  accept: string
  Icon: typeof FileJson
}

const FILE_TYPES: FileType[] = [
  {
    id: 'json',
    label: 'Seyhoun JSON',
    description: 'Import a previously exported .json diagram',
    accept: '.json',
    Icon: FileJson,
  },
  {
    id: 'compose',
    label: 'Docker Compose',
    description: 'Import services from a docker-compose.yml',
    accept: '.yml,.yaml',
    Icon: Container,
  },
  {
    id: 'terraform',
    label: 'Terraform',
    description: 'Import AWS/GCP/Azure resources from a .tf file',
    accept: '.tf',
    Icon: FileCode2,
  },
]

// ── Props ─────────────────────────────────────────────────────────────────

interface ImportDialogProps {
  projects: Project[]
  onClose: () => void
  activeWorkspaceId?: string
}

// ── ImportDialog ──────────────────────────────────────────────────────────

export function ImportDialog({ projects, onClose, activeWorkspaceId }: ImportDialogProps) {
  const navigate = useNavigate()
  const { loadDiagram } = useDiagramStore()

  const [tab, setTab] = useState<'file' | 'template'>('template')
  const [templates, setTemplates] = useState<TemplateInfo[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)

  // File upload state
  const [fileType, setFileType] = useState<FileType['id']>('json')
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Project picker
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '')
  const [newProjectName, setNewProjectName] = useState('')
  const [projectMode, setProjectMode] = useState<'existing' | 'new'>(
    projects.length === 0 ? 'new' : 'existing'
  )
  const [diagramName, setDiagramName] = useState('')

  // Submit state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.templates.list()
      .then(setTemplates)
      .catch(console.error)
      .finally(() => setTemplatesLoading(false))
  }, [])

  // ── Drag & drop ───────────────────────────────────────────────────────

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) acceptFile(file)
  }, [])

  function acceptFile(file: File) {
    setSelectedFile(file)
    if (!diagramName) setDiagramName(file.name.replace(/\.[^.]+$/, ''))
  }

  // ── Import helpers ────────────────────────────────────────────────────

  async function resolveProjectId(): Promise<string> {
    if (projectMode === 'existing') return projectId
    const wsId = activeWorkspaceId ?? localStorage.getItem('seyhoun_active_ws') ?? ''
    const p = await api.workspaces.createProject(wsId, { name: newProjectName.trim() })
    return p.id
  }

  async function createDiagramFromResult(result: ImportResult, name: string) {
    const pid = await resolveProjectId()
    const d = await api.diagrams.create({
      projectId: pid,
      name: name || 'Imported diagram',
      nodesJson: JSON.stringify(result.nodes),
      edgesJson: JSON.stringify(result.edges),
    })
    loadDiagram({
      id: d.id,
      projectId: d.projectId,
      defaultBranchId: d.defaultBranchId,
      name: d.name,
      nodes: result.nodes,
      edges: result.edges,
    })
    navigate(`/schema/${d.id}`)
  }

  // ── File import submit ────────────────────────────────────────────────

  async function handleFileImport() {
    if (!selectedFile) return
    setLoading(true)
    setError('')
    try {
      const importFn =
        fileType === 'json' ? api.import.json :
        fileType === 'compose' ? api.import.compose :
        api.import.terraform

      const result = await importFn(selectedFile)
      await createDiagramFromResult(result, diagramName)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Import failed')
      setLoading(false)
    }
  }

  // ── Template import ───────────────────────────────────────────────────

  async function handleTemplateImport(templateId: string, templateName: string) {
    setLoading(true)
    setError('')
    try {
      const result = await api.templates.get(templateId)
      await createDiagramFromResult(result, templateName)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load template')
      setLoading(false)
    }
  }

  const canSubmitFile =
    !!selectedFile &&
    (projectMode === 'existing' ? !!projectId : !!newProjectName.trim())

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-2xl mx-4 bg-surface border border-border rounded-2xl shadow-2xl
        flex flex-col overflow-hidden max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Import diagram</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Start from a template or import an existing file.
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-border shrink-0">
          {(['template', 'file'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === t
                  ? 'text-indigo-400 border-b-2 border-indigo-500'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {t === 'template' ? 'From Template' : 'From File'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {tab === 'template' && (
            <div className="p-6">
              {/* Project picker for templates */}
              <ProjectPicker
                projects={projects}
                projectMode={projectMode}
                setProjectMode={setProjectMode}
                projectId={projectId}
                setProjectId={setProjectId}
                newProjectName={newProjectName}
                setNewProjectName={setNewProjectName}
              />

              {error && (
                <p className="mt-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {templatesLoading && (
                  <p className="col-span-2 text-sm text-text-muted py-8 text-center">Loading templates…</p>
                )}
                {!templatesLoading && templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => {
                      if (loading) return
                      const canSubmit = projectMode === 'existing' ? !!projectId : !!newProjectName.trim()
                      if (!canSubmit) {
                        setError('Please select or create a project first.')
                        return
                      }
                      setError('')
                      handleTemplateImport(tpl.id, tpl.name)
                    }}
                    disabled={loading}
                    className="flex flex-col items-start gap-3 p-4 rounded-xl border border-border
                      bg-base hover:border-indigo-500/40 hover:bg-elevated transition-all
                      text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start justify-between w-full gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                          <Layers className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">{tpl.name}</p>
                          <p className="text-[10px] text-text-muted">{tpl.category}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-text-faint mt-1 shrink-0" />
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">{tpl.description}</p>
                    <div className="text-[10px] text-text-faint">{tpl.nodeCount} nodes</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'file' && (
            <div className="p-6 flex flex-col gap-5">
              {/* File type selector */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-text-secondary">File type</label>
                <div className="grid grid-cols-3 gap-2">
                  {FILE_TYPES.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      onClick={() => setFileType(id)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-colors ${
                        fileType === id
                          ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-300'
                          : 'border-border text-text-muted hover:text-text-secondary hover:border-text-faint'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-text-muted">
                  {FILE_TYPES.find((f) => f.id === fileType)?.description}
                </p>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed
                  py-10 cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-indigo-500/60 bg-indigo-500/10'
                    : selectedFile
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-border hover:border-text-faint'
                }`}
              >
                <Upload className={`w-6 h-6 ${selectedFile ? 'text-emerald-400' : 'text-text-faint'}`} />
                {selectedFile ? (
                  <div className="text-center">
                    <p className="text-sm font-medium text-emerald-400">{selectedFile.name}</p>
                    <p className="text-xs text-text-muted mt-0.5">Click to change file</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-text-secondary">Drop file here or click to browse</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      Accepts {FILE_TYPES.find((f) => f.id === fileType)?.accept}
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={FILE_TYPES.find((f) => f.id === fileType)?.accept}
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f) }}
                />
              </div>

              {/* Diagram name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-secondary">Diagram name</label>
                <input
                  value={diagramName}
                  onChange={(e) => setDiagramName(e.target.value)}
                  placeholder="Imported diagram"
                  className="w-full bg-base border border-border rounded-lg px-3 py-2.5
                    text-sm text-text-primary placeholder-text-faint
                    focus:outline-none focus:border-indigo-500/60 transition-colors"
                />
              </div>

              {/* Project picker */}
              <ProjectPicker
                projects={projects}
                projectMode={projectMode}
                setProjectMode={setProjectMode}
                projectId={projectId}
                setProjectId={setProjectId}
                newProjectName={newProjectName}
                setNewProjectName={setNewProjectName}
              />

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFileImport}
                  disabled={!canSubmitFile || loading}
                  className="px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white
                    hover:bg-indigo-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {loading ? 'Importing…' : 'Import'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── ProjectPicker sub-component ───────────────────────────────────────────

interface ProjectPickerProps {
  projects: Project[]
  projectMode: 'existing' | 'new'
  setProjectMode: (m: 'existing' | 'new') => void
  projectId: string
  setProjectId: (id: string) => void
  newProjectName: string
  setNewProjectName: (n: string) => void
}

function ProjectPicker({
  projects, projectMode, setProjectMode, projectId, setProjectId, newProjectName, setNewProjectName,
}: ProjectPickerProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-text-secondary">Project</label>
      <div className="flex rounded-lg border border-border overflow-hidden text-xs">
        {projects.length > 0 && (
          <button
            onClick={() => setProjectMode('existing')}
            className={`flex-1 py-2 font-medium transition-colors ${
              projectMode === 'existing' ? 'bg-elevated text-text-primary' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Existing
          </button>
        )}
        <button
          onClick={() => setProjectMode('new')}
          className={`flex-1 py-2 font-medium transition-colors ${
            projectMode === 'new' ? 'bg-elevated text-text-primary' : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          New project
        </button>
      </div>
      {projectMode === 'existing' && projects.length > 0 ? (
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-full appearance-none bg-base border border-border rounded-lg
            px-3 py-2.5 text-sm text-text-primary
            focus:outline-none focus:border-indigo-500/60 transition-colors"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      ) : (
        <input
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          placeholder="Project name…"
          className="w-full bg-base border border-border rounded-lg px-3 py-2.5
            text-sm text-text-primary placeholder-text-faint
            focus:outline-none focus:border-indigo-500/60 transition-colors"
        />
      )}
    </div>
  )
}
