import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { AppointmentStatus } from '@/lib/types/database.types'

const statusConfig: Record<string, { label: string; dotColor: string; bg: string; color: string; tooltip: string }> = {
  completed: {
    label: 'Realizado',
    dotColor: '#475569',
    bg: '#F1F5F9',
    color: '#334155',
    tooltip: 'La consulta fue completada',
  },
  no_show: {
    label: 'Ausente',
    dotColor: '#DC2626',
    bg: '#FEF2F2',
    color: '#991B1B',
    tooltip: 'El paciente no se presentó',
  },
  cancelled: {
    label: 'Cancelado',
    dotColor: '#DC2626',
    bg: '#FEF2F2',
    color: '#991B1B',
    tooltip: 'El turno fue cancelado',
  },
  confirmed: {
    label: 'Confirmado',
    dotColor: '#059669',
    bg: '#ECFDF5',
    color: '#065F46',
    tooltip: 'El paciente confirmó su asistencia',
  },
  declined: {
    label: 'No viene',
    dotColor: '#D97706',
    bg: '#FFFBEB',
    color: '#92400E',
    tooltip: 'El paciente indicó que no asistirá',
  },
  pending: {
    label: 'Pendiente',
    dotColor: '#D97706',
    bg: '#FFFBEB',
    color: '#92400E',
    tooltip: 'No se recibió confirmación del paciente',
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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <span
            className="inline-flex items-center gap-1.5 whitespace-nowrap"
            style={{
              borderRadius: '6px',
              padding: '3px 10px',
              fontSize: '12px',
              fontWeight: 500,
              background: config.bg,
              color: config.color,
            }}
          >
            <span style={{ fontSize: '8px', color: config.dotColor }}>●</span>
            {config.label}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
