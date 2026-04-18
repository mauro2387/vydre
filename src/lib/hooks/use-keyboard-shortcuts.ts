'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

type ShortcutHandler = () => void

export function useKeyboardShortcuts(handlers: {
  onNewAppointment?: ShortcutHandler
  onFocusPatientSearch?: ShortcutHandler
  onToggleShortcuts?: ShortcutHandler
}) {
  const pathname = usePathname()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.target as HTMLElement)?.isContentEditable) return

      // N — new appointment (only on /agenda)
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && pathname?.startsWith('/agenda')) {
        e.preventDefault()
        handlers.onNewAppointment?.()
      }

      // P — focus patient search (only on /pacientes)
      if (e.key === 'p' && !e.metaKey && !e.ctrlKey && pathname?.startsWith('/pacientes')) {
        e.preventDefault()
        handlers.onFocusPatientSearch?.()
      }

      // ? — show shortcuts panel
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        handlers.onToggleShortcuts?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pathname, handlers])
}
