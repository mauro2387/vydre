'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Toaster } from 'sonner'
import { SidebarNav } from './sidebar-nav'
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts'
import { KeyboardShortcutsDialog } from '@/components/app/keyboard-shortcuts-dialog'

export function DashboardShell({
  professionalName,
  professionalSpecialty,
  unreadNotifications,
  has2FA,
  children,
}: {
  professionalName: string
  professionalSpecialty: string
  unreadNotifications: number
  has2FA: boolean
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useKeyboardShortcuts({
    onNewAppointment: useCallback(() => {
      // Dispatch a custom event that agenda-view listens for
      window.dispatchEvent(new CustomEvent('vydre:new-appointment'))
    }, []),
    onFocusPatientSearch: useCallback(() => {
      // Focus the search input on the patients page
      const searchInput = document.querySelector<HTMLInputElement>('[data-patient-search]')
      searchInput?.focus()
    }, []),
    onToggleShortcuts: useCallback(() => {
      setShortcutsOpen((prev) => !prev)
    }, []),
  })

  // Close sidebar on navigation
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with Next.js router
    setSidebarOpen(false)
  }, [pathname])

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  return (
    <div className="flex min-h-screen">
      {/* Mobile header */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center border-b bg-background px-4 md:hidden">
        <div className="flex-1" />
        <span className="text-lg font-bold">Vydre</span>
        <div className="flex flex-1 justify-end">
          <button
            onClick={() => setSidebarOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[220px] transform border-r bg-muted/40 transition-transform duration-200 md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarNav
          professionalName={professionalName}
          professionalSpecialty={professionalSpecialty}
          unreadNotifications={unreadNotifications}
          has2FA={has2FA}
        />
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 pt-18 md:p-6 lg:p-8">
        {children}
      </main>

      <Toaster richColors position="bottom-right" />
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  )
}
