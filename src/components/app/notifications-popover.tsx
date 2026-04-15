'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCircle, XCircle, Send, Info, CheckCheck } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  getUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/actions/notifications'
import type { Notification } from '@/lib/types/database.types'

const typeIcons: Record<string, { icon: typeof Bell; color: string }> = {
  appointment_confirmed: { icon: CheckCircle, color: 'text-green-500' },
  appointment_declined: { icon: XCircle, color: 'text-red-500' },
  summary_sent: { icon: Send, color: 'text-blue-500' },
  system: { icon: Info, color: 'text-gray-400' },
  appointment_reminder_sent: { icon: Bell, color: 'text-blue-500' },
}

export function NotificationsPopover({
  initialCount,
}: {
  initialCount: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [count, setCount] = useState(initialCount)
  const [loaded, setLoaded] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function loadNotifications() {
    const data = await getUnreadNotifications()
    setNotifications(data as Notification[])
    setCount(data.length)
    setLoaded(true)
  }

  function handleOpen(isOpen: boolean) {
    setOpen(isOpen)
    if (isOpen) {
      loadNotifications()
    }
  }

  async function handleMarkRead(id: string, actionUrl?: string | null) {
    startTransition(async () => {
      await markNotificationRead(id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      setCount((c) => Math.max(0, c - 1))
      if (actionUrl) {
        setOpen(false)
        router.push(actionUrl)
      }
    })
  }

  async function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead()
      setNotifications([])
      setCount(0)
    })
  }

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger>
        <div className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="start"
        side="right"
        sideOffset={8}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Notificaciones</h3>
          {notifications.length > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isPending}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <CheckCheck className="h-3 w-3" />
              Marcar todas
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {!loaded ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Cargando...
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Todo tranquilo por ahora</p>
            </div>
          ) : (
            notifications.map((n) => {
              const config = typeIcons[n.type] ?? { icon: Bell, color: 'text-muted-foreground' }
              const Icon = config.icon
              return (
                <button
                  key={n.id}
                  onClick={() => handleMarkRead(n.id, n.action_url)}
                  disabled={isPending}
                  className="flex w-full items-start gap-3 border-b px-4 py-3 text-left bg-blue-50/50 hover:bg-blue-50 transition-colors last:border-b-0"
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.color}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">{n.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {n.body}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground/60">
                      {formatDistanceToNow(new Date(n.created_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
