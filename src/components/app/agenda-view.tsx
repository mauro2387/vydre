'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { format, addDays, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AppointmentStatusBadge } from '@/components/app/appointment-status-badge'
import { NewAppointmentModal } from '@/components/app/new-appointment-modal'
import { updateAppointmentStatus, cancelAppointment } from '@/lib/actions/appointments'
import type {
  AppointmentWithRelations,
  Patient,
  Professional,
  AppointmentStatus,
} from '@/lib/types/database.types'

export function AgendaView({
  appointments,
  patients,
  professional,
  weekStart,
}: {
  appointments: AppointmentWithRelations[]
  patients: Patient[]
  professional: Professional
  weekStart: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [openNewAppointment, setOpenNewAppointment] = useState(false)

  const monday = new Date(weekStart + 'T00:00:00')
  const sunday = addDays(monday, 6)
  const today = new Date()

  // Week navigation
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newMonday = new Date(monday)
    newMonday.setDate(newMonday.getDate() + (direction === 'prev' ? -7 : 7))
    const newWeekStart = newMonday.toISOString().split('T')[0]
    startTransition(() => {
      router.push(`/agenda?semana=${newWeekStart}`)
    })
  }

  const goToToday = () => {
    const todayMonday = getMondayOfWeek(new Date())
    const newWeekStart = todayMonday.toISOString().split('T')[0]
    startTransition(() => {
      router.push(`/agenda?semana=${newWeekStart}`)
    })
  }

  // Format week range for header
  const formatWeekRange = () => {
    const startMonth = format(monday, 'MMMM', { locale: es })
    const endMonth = format(sunday, 'MMMM', { locale: es })
    const year = format(sunday, 'yyyy')

    if (startMonth === endMonth) {
      return `${format(monday, 'd')} – ${format(sunday, 'd')} de ${startMonth} de ${year}`
    }
    return `${format(monday, 'd')} de ${startMonth} – ${format(sunday, 'd')} de ${endMonth} de ${year}`
  }

  // Group appointments by day
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))

  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.start_at)
      return isSameDay(aptDate, day)
    })
  }

  // Handle status update
  const handleStatusUpdate = async (appointmentId: string, status: AppointmentStatus) => {
    try {
      await updateAppointmentStatus(appointmentId, status)
      router.refresh()
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  // Handle cancel
  const handleCancel = async (appointmentId: string, patientName: string) => {
    const confirmed = confirm(
      `¿Cancelar el turno de ${patientName}? Esta acción no se puede deshacer.`
    )
    if (!confirmed) return

    try {
      await cancelAppointment(appointmentId)
      router.refresh()
    } catch (error) {
      console.error('Error cancelling:', error)
    }
  }

  return (
    <div className="space-y-6 pb-24">
      {/* SECCIÓN A — Week navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateWeek('prev')}
            disabled={isPending}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateWeek('next')}
            disabled={isPending}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold capitalize">
            {formatWeekRange()}
          </span>
        </div>
        <Button variant="outline" onClick={goToToday} disabled={isPending}>
          Hoy
        </Button>
      </div>

      {/* SECCIÓN B — Daily list view */}
      <div className="space-y-6">
        {days.map((day, dayIndex) => {
          const dayAppointments = getAppointmentsForDay(day)
          const isToday = isSameDay(day, today)
          const dayLabel = format(day, "EEEE d", { locale: es })
          const capitalizedDay = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)

          return (
            <div key={dayIndex}>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-base font-bold">{capitalizedDay}</h3>
                {isToday && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                    Hoy
                  </span>
                )}
              </div>

              {dayAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin turnos</p>
              ) : (
                <div className="space-y-2">
                  {dayAppointments.map((apt) => (
                    <TurnoCard
                      key={apt.id}
                      appointment={apt}
                      onStatusUpdate={handleStatusUpdate}
                      onCancel={handleCancel}
                    />
                  ))}
                </div>
              )}

              {dayIndex < 6 && <Separator className="mt-4" />}
            </div>
          )
        })}
      </div>

      {/* SECCIÓN C — Floating "Nuevo turno" button */}
      <Button
        className="fixed bottom-6 right-6 z-50 gap-2 shadow-lg"
        size="lg"
        onClick={() => setOpenNewAppointment(true)}
      >
        <Plus className="h-5 w-5" />
        Nuevo turno
      </Button>

      {/* New appointment modal */}
      <NewAppointmentModal
        open={openNewAppointment}
        onOpenChange={setOpenNewAppointment}
        patients={patients}
        professional={professional}
      />
    </div>
  )
}

// TurnoCard subcomponent
function TurnoCard({
  appointment,
  onStatusUpdate,
  onCancel,
}: {
  appointment: AppointmentWithRelations
  onStatusUpdate: (id: string, status: AppointmentStatus) => void
  onCancel: (id: string, patientName: string) => void
}) {
  const startTime = format(new Date(appointment.start_at), 'HH:mm')
  const endTime = format(new Date(appointment.end_at), 'HH:mm')
  const patientName = appointment.patients?.name ?? 'Paciente sin asignar'
  const status = appointment.status as AppointmentStatus
  const confirmation = (appointment.appointment_confirmations?.response as 'confirmed' | 'declined' | null) ?? null

  const showCompleted = status !== 'completed' && status !== 'no_show'
  const showNoShow = status !== 'completed' && status !== 'no_show'
  const showCancel = status !== 'cancelled'
  const hasActions = showCompleted || showNoShow || showCancel

  return (
    <Card className="transition-colors hover:bg-muted/50">
      <CardContent className="flex items-center gap-4 py-3">
        <div className="w-24 shrink-0 text-center">
          <p className="text-sm font-bold">{startTime} – {endTime}</p>
        </div>
        <div className="flex-1">
          <p className="font-medium">{patientName}</p>
        </div>
        <AppointmentStatusBadge status={status} confirmation={confirmation} />
        {hasActions && (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground">
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {showCompleted && (
                <DropdownMenuItem onClick={() => onStatusUpdate(appointment.id, 'completed')}>
                  Marcar como realizado
                </DropdownMenuItem>
              )}
              {showNoShow && (
                <DropdownMenuItem onClick={() => onStatusUpdate(appointment.id, 'no_show')}>
                  Marcar como ausente
                </DropdownMenuItem>
              )}
              {showCancel && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onCancel(appointment.id, patientName)}
                >
                  Cancelar turno
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardContent>
    </Card>
  )
}

// Helper
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}
