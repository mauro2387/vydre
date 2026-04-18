'use client'

import { AlertCircle, Check, Loader2 } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import { es } from 'date-fns/locale'
import { useEffect, useState } from 'react'
import type { AutoSaveStatus } from '@/lib/hooks/use-auto-save'

/**
 * Small inline "guardando… / guardado hace Nm / error" indicator.
 * Parent supplies the current status + lastSaved; we do the labelling.
 */
export function AutoSaveIndicator({
  status,
  lastSaved,
}: {
  status: AutoSaveStatus
  lastSaved: Date | null
}) {
  // Re-render once per 30s so the relative-time label stays fresh.
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!lastSaved) return
    const id = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [lastSaved])

  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
        Guardando…
      </span>
    )
  }

  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-destructive">
        <AlertCircle className="h-2.5 w-2.5" />
        Error al guardar
      </span>
    )
  }

  if (status === 'saved' && lastSaved) {
    const rel = formatDistanceToNowStrict(lastSaved, { locale: es, addSuffix: false })
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
        <Check className="h-2.5 w-2.5" />
        Guardado hace {rel}
      </span>
    )
  }

  return null
}
