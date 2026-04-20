'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, CalendarDays, Users, FileText, Settings, LogOut, BarChart2, ShieldCheck, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { GlobalSearch } from '@/components/app/global-search'

const mainNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/pacientes', label: 'Pacientes', icon: Users },
  { href: '/consultas', label: 'Consultas', icon: FileText },
  { href: '/estadisticas', label: 'Estadísticas', icon: BarChart2 },
  { href: '/seguridad', label: 'Seguridad', icon: ShieldCheck },
]

const bottomNavItems = [
  { href: '/configuracion', label: 'Configuración', icon: Settings },
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function SidebarNav({
  professionalName,
  professionalSpecialty,
  unreadNotifications,
  has2FA,
}: {
  professionalName: string
  professionalSpecialty: string
  unreadNotifications: number
  has2FA: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="sidebar flex h-full flex-col" style={{ background: 'var(--sidebar-bg)' }}>
      {/* Logo */}
      <div
        className="flex h-16 items-center gap-2.5 px-4"
        style={{ borderBottom: '1px solid var(--sidebar-border)' }}
      >
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center text-white"
          style={{ background: 'var(--brand)', borderRadius: '7px', fontSize: '15px', fontWeight: 700 }}
        >
          V
        </div>
        <span style={{ color: '#F8FAFC', fontSize: '16px', fontWeight: 600 }}>Vydre</span>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-1">
        <GlobalSearch />
      </div>

      {/* Main nav */}
      <nav className="flex-1 space-y-0.5 px-2 pt-2">
        {mainNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'text-[var(--sidebar-text-active)]'
                  : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-item-hover-bg)]'
              )}
              style={isActive ? { background: 'var(--sidebar-item-active-bg)' } : undefined}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2"
                  style={{
                    width: '3px',
                    height: '16px',
                    background: 'var(--brand)',
                    borderRadius: '0 2px 2px 0',
                  }}
                />
              )}
              <Icon
                size={16}
                style={isActive ? { color: 'var(--brand)' } : undefined}
              />
              {item.label}
            </Link>
          )
        })}

        {/* Separator */}
        <div
          className="mx-3 my-1"
          style={{ height: '1px', background: 'var(--sidebar-border)' }}
        />

        {bottomNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'text-[var(--sidebar-text-active)]'
                  : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-item-hover-bg)]'
              )}
              style={isActive ? { background: 'var(--sidebar-item-active-bg)' } : undefined}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2"
                  style={{
                    width: '3px',
                    height: '16px',
                    background: 'var(--brand)',
                    borderRadius: '0 2px 2px 0',
                  }}
                />
              )}
              <Icon
                size={16}
                style={isActive ? { color: 'var(--brand)' } : undefined}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div
        className="px-3 py-3"
        style={{ borderTop: '1px solid var(--sidebar-border)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
            style={{ background: 'var(--brand)', fontSize: '12px', fontWeight: 600 }}
          >
            {getInitials(professionalName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate" style={{ fontSize: '13px', fontWeight: 500, color: '#F8FAFC' }}>
              {professionalName}
            </p>
            <p className="truncate" style={{ fontSize: '12px', color: '#64748B' }}>
              {professionalSpecialty}
            </p>
            {has2FA && (
              <p style={{ fontSize: '11px', color: '#34D399' }}>
                ● 2FA activo
              </p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="group shrink-0 rounded-md p-1.5"
            title="Cerrar sesión"
          >
            <LogOut
              size={14}
              className="transition-colors"
              style={{ color: '#475569' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#F8FAFC' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#475569' }}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
