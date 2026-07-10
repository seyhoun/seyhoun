import { useRef, useState, useEffect } from 'react'
import { Download, Image, FileJson, Link, Check, ChevronDown } from 'lucide-react'
import { toPng, toSvg } from 'html-to-image'
import { saveAs } from 'file-saver'
import { useDiagramStore } from '../../stores/diagram'
import { api } from '../../lib/api'

export function ExportMenu() {
  const { diagramId, diagramName } = useDiagramStore()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function getFlowEl(): HTMLElement | null {
    return document.querySelector('.react-flow__viewport')?.parentElement ?? null
  }

  async function exportPng() {
    const el = getFlowEl()
    if (!el) return
    setOpen(false)
    try {
      const dataUrl = await toPng(el, { backgroundColor: '#0d0f1a', pixelRatio: 2 })
      saveAs(dataUrl, `${diagramName || 'diagram'}.png`)
    } catch (e) {
      console.error('PNG export failed', e)
    }
  }

  async function exportSvg() {
    const el = getFlowEl()
    if (!el) return
    setOpen(false)
    try {
      const dataUrl = await toSvg(el, { backgroundColor: '#0d0f1a' })
      const blob = new Blob([atob(dataUrl.split(',')[1])], { type: 'image/svg+xml' })
      saveAs(blob, `${diagramName || 'diagram'}.svg`)
    } catch (e) {
      console.error('SVG export failed', e)
    }
  }

  async function exportJson() {
    if (!diagramId) return
    setOpen(false)
    try {
      const bundle = await api.diagrams.exportJson(diagramId)
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
      saveAs(blob, `${diagramName || 'diagram'}.seyhoun.json`)
    } catch (e) {
      console.error('JSON export failed', e)
    }
  }

  async function copyShareLink() {
    if (!diagramId) return
    const url = `${window.location.origin}/schema/${diagramId}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('Copy failed', e)
    }
    setOpen(false)
  }

  if (!diagramId) return null

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Export diagram"
        className={`flex items-center gap-1 p-1.5 rounded-md transition-colors ${
          open
            ? 'text-indigo-400 bg-indigo-900/30'
            : 'text-text-muted hover:text-text-secondary hover:bg-elevated'
        }`}
      >
        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-[#13162a] border border-border rounded-lg shadow-xl z-50 py-1 overflow-hidden">
          <button
            onClick={exportPng}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors"
          >
            <Image className="w-3.5 h-3.5 shrink-0" />
            Export as PNG
          </button>
          <button
            onClick={exportSvg}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors"
          >
            <Image className="w-3.5 h-3.5 shrink-0" />
            Export as SVG
          </button>
          <div className="my-1 border-t border-border" />
          <button
            onClick={exportJson}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors"
          >
            <FileJson className="w-3.5 h-3.5 shrink-0" />
            Export as JSON
          </button>
          <div className="my-1 border-t border-border" />
          <button
            onClick={copyShareLink}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors"
          >
            <Link className="w-3.5 h-3.5 shrink-0" />
            Copy share link
          </button>
        </div>
      )}
    </div>
  )
}
