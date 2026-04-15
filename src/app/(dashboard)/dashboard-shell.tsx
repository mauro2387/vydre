'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Toaster } from 'sonner'
import { SidebarNav } from './sidebar-nav'

export function DashboardShell({
  professionalName,
  professionalSpecialty,
  unreadNotifications,
  children,
}: {
  professionalName: string
  professionalSpecialty: string
  unreadNotifications: number
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Close sidebar on navigation
  useEffect(() => {
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
        />
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 pt-18 md:p-6 lg:p-8">
        {children}
      </main>

      <Toaster richColors position="bottom-right" />
    </div>
  )
}
