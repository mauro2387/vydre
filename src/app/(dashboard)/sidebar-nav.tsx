'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, CalendarDays, Users, Settings, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/pacientes', label: 'Pacientes', icon: Users },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
]

const avatarColors = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
]

function getAvatarColor(name: string): string {
  let sum = 0
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i)
  }
  return avatarColors[sum % avatarColors.length]
}

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
}: {
  professionalName: string
  professionalSpecialty: string
}) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="flex w-[220px] flex-col border-r bg-muted/40">
      <div className="p-6">
        <h1 className="text-xl font-bold">Vydre</h1>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <Separator />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
              getAvatarColor(professionalName)
            )}
          >
            {getInitials(professionalName)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{professionalName}</p>
            <p className="text-xs text-muted-foreground truncate">{professionalSpecialty}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  )
}
