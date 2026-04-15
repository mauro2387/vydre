import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AppointmentStatus } from '@/lib/types/database.types'

const statusConfig: Record<string, { label: string; className: string }> = {
  completed: {
    label: 'Realizado',
    className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
  },
  no_show: {
    label: 'Ausente',
    className: 'bg-red-100 text-red-800 hover:bg-red-100',
  },
  cancelled: {
    label: 'Cancelado',
    className: 'bg-red-100 text-red-800 hover:bg-red-100',
  },
  confirmed: {
    label: 'Confirmado',
    className: 'bg-green-100 text-green-800 hover:bg-green-100',
  },
  declined: {
    label: 'No viene',
    className: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  },
  pending: {
    label: 'Pendiente',
    className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  },
}

export function AppointmentStatusBadge({
  status,
  confirmation,
}: {
  status: AppointmentStatus
  confirmation: 'confirmed' | 'declined' | null | undefined
}) {
  let key: string

  if (status === 'completed' || status === 'no_show' || status === 'cancelled') {
    key = status
  } else if (confirmation === 'confirmed') {
    key = 'confirmed'
  } else if (confirmation === 'declined') {
    key = 'declined'
  } else {
    key = 'pending'
  }

  const config = statusConfig[key]

  return (
    <Badge variant="secondary" className={cn(config.className)}>
      {config.label}
    </Badge>
  )
}
