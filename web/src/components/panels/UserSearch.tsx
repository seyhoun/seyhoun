import { useState, useEffect, useRef } from 'react'
import { api } from '../../lib/api'
import type { UserSearchResult } from '../../types/diagram'

interface Props {
  placeholder?: string
  onSelect: (user: UserSearchResult) => void
}

export function UserSearch({ placeholder = 'Search by name or email…', onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (query.length < 3) {
      setResults([])
      setOpen(false)
      return
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await api.users.search(query)
        setResults(data)
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(user: UserSearchResult) {
    onSelect(user)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-base border border-border rounded-lg text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#6366f1]"
      />
      {loading && (
        <div className="absolute right-3 top-2.5">
          <div className="w-4 h-4 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-elevated border border-border rounded-lg overflow-hidden shadow-xl">
          {results.map(user => (
            <button
              key={user.id}
              onClick={() => handleSelect(user)}
              className="w-full px-3 py-2 text-left hover:bg-border transition-colors"
            >
              <div className="text-sm text-white">{user.name}</div>
              <div className="text-xs text-[#6b7280]">{user.email}</div>
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && !loading && query.length >= 3 && (
        <div className="absolute z-50 w-full mt-1 bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-[#6b7280]">
          No users found
        </div>
      )}
    </div>
  )
}
