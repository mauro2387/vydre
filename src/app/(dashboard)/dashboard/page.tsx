import { CalendarDays, CalendarX, CheckCircle, Clock, AlertTriangle, Calendar, Send, Activity } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { getTodayAppointments, getUpcomingUnconfirmed, getRecentActivity } from '@/lib/actions/appointments'
import { getProfessional } from '@/lib/actions/professional'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AppointmentStatusBadge } from '@/components/app/appointment-status-badge'
import { ActivationBanner } from '@/components/app/activation-banner'
import type { AppointmentStatus, Professional } from '@/lib/types/database.types'

export default async function DashboardPage() {
  const [todayAppointments, unconfirmed, professional, recentActivity] = await Promise.all([
    getTodayAppointments(),
    getUpcomingUnconfirmed(),
    getProfessional(),
    getRecentActivity(),
  ])

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Buenos días' : 'Buenas tardes'
  const fechaHoy = format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
  const todayFormatted = fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1)

  const totalToday = todayAppointments.length
  const confirmedCount = todayAppointments.filter((apt) => {
    return apt.appointment_confirmations?.response === 'confirmed'
  }).length
  const pendingCount = totalToday - confirmedCount

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">
          {greeting}, {professional?.name?.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground">{todayFormatted}</p>
      </div>

      {/* Activation banner for new users */}
      {professional && !professional.activation_complete && (
        <ActivationBanner professional={professional as Professional} />
      )}

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-primary/10 p-3">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-bold">{totalToday}</p>
              <p className="text-sm text-muted-foreground">Turnos hoy</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-green-100 p-3">
              <CheckCircle className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <p className="text-3xl font-bold">{confirmedCount}</p>
              <p className="text-sm text-muted-foreground">Confirmados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-yellow-100 p-3">
              <Clock className="h-5 w-5 text-yellow-700" />
            </div>
            <div>
              <p className="text-3xl font-bold">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Sin confirmar</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today agenda */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Agenda de hoy</h2>
        {todayAppointments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarX className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">No tenés turnos agendados para hoy</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {todayAppointments.map((apt) => {
              const startTime = format(new Date(apt.start_at), 'HH:mm')
              const durationMs = new Date(apt.end_at).getTime() - new Date(apt.start_at).getTime()
              const durationMin = Math.round(durationMs / 60000)
              const patientName = apt.patients?.name ?? 'Paciente sin asignar'
              const confirmationResponse = (apt.appointment_confirmations?.response as 'confirmed' | 'declined' | null) ?? null

              return (
                <Card key={apt.id} className="cursor-default transition-colors hover:bg-muted/50">
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="text-center">
                      <p className="text-lg font-bold">{startTime}</p>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{patientName}</p>
                      <p className="text-sm text-muted-foreground">{durationMin} min</p>
                    </div>
                    <AppointmentStatusBadge
                      status={apt.status as AppointmentStatus}
                      confirmation={confirmationResponse}
                    />
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Unconfirmed alerts */}
      {unconfirmed.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-lg font-semibold">Turnos sin confirmar esta semana</h2>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
              {unconfirmed.length}
            </Badge>
          </div>
          <Card>
            <CardContent className="divide-y pt-4">
              {unconfirmed.map((apt) => {
                const dateStr = format(new Date(apt.start_at), "EEEE d 'de' MMMM, HH:mm", {
                  locale: es,
                })
                const patientName = apt.patients?.name ?? 'Paciente sin asignar'

                return (
                  <div key={apt.id} className="flex items-center gap-3 py-3">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium">{patientName}</p>
                      <p className="text-sm capitalize text-muted-foreground">{dateStr}</p>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent activity */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Actividad reciente</h2>
        {recentActivity.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Sin actividad en las últimas 24 horas</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y pt-4">
              {recentActivity.map((item) => {
                const Icon = item.type === 'appointment'
                  ? Calendar
                  : item.type === 'confirmation'
                    ? CheckCircle
                    : Send
                const iconColor = item.type === 'appointment'
                  ? 'text-primary'
                  : item.type === 'confirmation'
                    ? 'text-green-600'
                    : 'text-blue-600'

                return (
                  <div key={item.id} className="flex items-center gap-3 py-3">
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                    <div className="flex-1">
                      <p className="text-sm">{item.description}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.timestamp), {
                        locale: es,
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
