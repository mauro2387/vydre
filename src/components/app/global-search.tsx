'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search } from 'lucide-react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { globalSearch, type GlobalSearchResult } from '@/lib/actions/search'

const getInitials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

function getMondayOfDate(iso: string): string {
  const d = new Date(iso)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

/**
 * Global Cmd+K / Ctrl+K search palette. Mount once (in the dashboard shell)
 * and it wires up its own keybinding listener.
 */
export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 250)
  const [results, setResults] = useState<GlobalSearchResult>({
    patients: [],
    appointments: [],
  })
  const [isPending, startTransition] = useTransition()

  // Keybinding: Cmd+K / Ctrl+K toggles the palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Reset query when palette closes so next open is fresh.
  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults({ patients: [], appointments: [] })
    }
  }, [open])

  // Run search as user types (debounced).
  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults({ patients: [], appointments: [] })
      return
    }
    startTransition(async () => {
      try {
        const res = await globalSearch(debouncedQuery)
        setResults(res)
      } catch (err) {
        console.error('[GlobalSearch] failed:', err)
      }
    })
  }, [debouncedQuery])

  const go = (url: string) => {
    setOpen(false)
    router.push(url)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-full items-center gap-2 rounded-md bg-secondary px-2 text-left text-xs text-muted-foreground transition-colors hover:bg-secondary/70"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 truncate">Buscar...</span>
        <kbd className="pointer-events-none hidden select-none rounded border bg-background px-1 font-mono text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Buscar en Vydre"
        description="Pacientes y turnos próximos"
      >
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Buscar pacientes o turnos..."
        />
        <CommandList>
          {query.trim().length >= 2 && !isPending &&
            results.patients.length === 0 && results.appointments.length === 0 && (
              <CommandEmpty>No encontramos resultados.</CommandEmpty>
            )}

          {results.patients.length > 0 && (
            <CommandGroup heading="Pacientes">
              {results.patients.map((p) => (
                <CommandItem
                  key={`p-${p.id}`}
                  value={`patient:${p.id}:${p.name}`}
                  onSelect={() => go(`/pacientes?id=${p.id}`)}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-medium text-primary">
                    {getInitials(p.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.phone}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results.appointments.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Turnos próximos">
                {results.appointments.map((a) => {
                  const when = format(new Date(a.start_at), "d 'de' MMM, HH:mm", { locale: es })
                  return (
                    <CommandItem
                      key={`a-${a.id}`}
                      value={`apt:${a.id}:${a.patients?.name ?? ''}`}
                      onSelect={() => go(`/agenda?semana=${getMondayOfDate(a.start_at)}`)}
                    >
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm">{a.patients?.name ?? 'Paciente sin asignar'}</span>
                        <span className="truncate text-xs text-muted-foreground">{when}</span>
                      </div>
                      <span className="text-[10px] uppercase text-muted-foreground">{a.status}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </>
          )}

          {query.trim().length >= 2 && (
            <>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  value={`search-all:${query}`}
                  onSelect={() => go(`/pacientes?q=${encodeURIComponent(query.trim())}`)}
                >
                  Buscar &ldquo;{query.trim()}&rdquo; en todos los pacientes →
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
