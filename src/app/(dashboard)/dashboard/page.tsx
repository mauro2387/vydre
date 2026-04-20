import Link from 'next/link'
import { CalendarDays, CalendarX, CheckCircle, Clock, AlertTriangle, Calendar, Send, Activity, DollarSign, UserX } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import { getTodayAppointments, getUpcomingUnconfirmed, getRecentActivity } from '@/lib/actions/appointments'
import { getProfessional } from '@/lib/actions/professional'
import { getInactivePatients } from '@/lib/actions/patients'
import { getPaymentsSummary } from '@/lib/actions/payments'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AppointmentStatusBadge } from '@/components/app/appointment-status-badge'
import { ActivationBanner } from '@/components/app/activation-banner'
import { TwoFactorBanner } from '@/components/app/two-factor-banner'
import { StatCard } from '@/components/ui/stat-card'
import { SectionHeader } from '@/components/ui/section-header'
import { nowInTimezone, formatInTimezone, DEFAULT_TZ } from '@/lib/utils'
import type { AppointmentStatus, Professional } from '@/lib/types/database.types'

export default async function DashboardPage() {
  const [todayAppointments, unconfirmed, professional, recentActivity, inactive, paymentsSummary] = await Promise.all([
    getTodayAppointments(),
    getUpcomingUnconfirmed(),
    getProfessional(),
    getRecentActivity(),
    getInactivePatients(60),
    getPaymentsSummary(),
  ])

  // Check 2FA status
  const supabase = await createClient()
  const { data: factors } = await supabase.auth.mfa.listFactors()
  const has2FA = factors?.totp?.some((f) => f.status === 'verified') ?? false
  const daysSinceRegistration = professional?.created_at
    ? Math.floor((Date.now() - new Date(professional.created_at).getTime()) / 86400000)
    : 0
  const show2FABanner = !has2FA && professional?.activation_complete && daysSinceRegistration >= 7

  const tz = professional?.timezone ?? DEFAULT_TZ
  const { hour } = nowInTimezone(tz)
  const greeting = hour < 12 ? 'Buenos días' : 'Buenas tardes'
  const todayFormatted = formatInTimezone(new Date(), tz, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const capitalizedDate = todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1)

  const totalToday = todayAppointments.length
  const confirmedCount = todayAppointments.filter((apt) => {
    return apt.appointment_confirmations?.response === 'confirmed'
  }).length
  const pendingCount = totalToday - confirmedCount

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="space-y-8">
      {/* Activation banner for new users */}
      {professional && !professional.activation_complete && (
        <ActivationBanner professional={professional as Professional} />
      )}

      {show2FABanner && <TwoFactorBanner />}

      {/* Hero — Next appointment */}
      {todayAppointments.length > 0 ? (() => {
        const now = new Date()
        const nextApt = todayAppointments.find(a => new Date(a.start_at) > now) ?? todayAppointments[0]
        const nextPatient = nextApt.patients?.name ?? 'Paciente sin asignar'
        const nextTime = formatInTimezone(new Date(nextApt.start_at), tz, { hour: '2-digit', minute: '2-digit', hour12: false })
        const durationMs = new Date(nextApt.end_at).getTime() - new Date(nextApt.start_at).getTime()
        const durationMin = Math.round(durationMs / 60000)
        const timeDistance = formatDistanceToNow(new Date(nextApt.start_at), { locale: es })

        return (
          <div
            style={{
              background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
              borderRadius: '16px',
              padding: '28px 32px',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span
                  className="inline-block"
                  style={{
                    background: 'rgba(14, 165, 233, 0.2)',
                    border: '1px solid rgba(14, 165, 233, 0.3)',
                    borderRadius: '20px',
                    padding: '4px 12px',
                    color: '#7DD3FC',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  Próximo turno
                </span>
                <h2 style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px' }}>
                  {nextPatient}
                </h2>
                <p style={{ fontSize: '16px', color: '#94A3B8', marginTop: '4px' }}>
                  Hoy a las {nextTime} · {durationMin} min
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p style={{ fontSize: '18px', fontWeight: 600, color: '#7DD3FC' }}>
                  en {timeDistance}
                </p>
              </div>
            </div>
          </div>
        )
      })() : (
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 'var(--card-radius)',
            padding: '28px 32px',
          }}
        >
          <p style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>
            No tenés turnos para hoy
          </p>
          <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            <Link href="/agenda" className="hover:underline" style={{ color: 'var(--brand)' }}>
              Ir a la agenda
            </Link>
          </p>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Turnos hoy"
          value={totalToday}
          icon={CalendarDays}
          iconBg="#EFF6FF"
          iconColor="#3B82F6"
        />
        <StatCard
          label="Confirmados"
          value={confirmedCount}
          icon={CheckCircle}
          iconBg="#ECFDF5"
          iconColor="#10B981"
        />
        <StatCard
          label="Sin confirmar"
          value={pendingCount}
          icon={Clock}
          iconBg="#FFFBEB"
          iconColor="#F59E0B"
        />
        <StatCard
          label="Ingresos del mes"
          value={fmtCurrency(paymentsSummary.total)}
          subtitle={`${paymentsSummary.count} cobros`}
          icon={DollarSign}
          iconBg="#F0FDF4"
          iconColor="#22C55E"
        />
      </div>

      {/* Two-column layout: Agenda + sidebar */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: today agenda (2/3) */}
        <div className="space-y-6 lg:col-span-2">
          <div>
            <SectionHeader title="Agenda de hoy" badge={todayAppointments.length} />
            {todayAppointments.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-12 text-center"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: 'var(--card-radius)',
                }}
              >
                <CalendarX className="mb-4 h-12 w-12" style={{ color: 'var(--text-tertiary)' }} />
                <p style={{ color: 'var(--text-tertiary)' }}>No tenés turnos agendados para hoy</p>
                <Link href="/agenda" className="mt-3 text-sm font-medium hover:underline" style={{ color: 'var(--brand)' }}>
                  Ir a la agenda para crear uno
                </Link>
              </div>
            ) : (
              <div
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: 'var(--card-radius)',
                  overflow: 'hidden',
                }}
              >
                {todayAppointments.map((apt, i) => {
                  const startTime = formatInTimezone(new Date(apt.start_at), tz, { hour: '2-digit', minute: '2-digit', hour12: false })
                  const durationMs = new Date(apt.end_at).getTime() - new Date(apt.start_at).getTime()
                  const durationMin = Math.round(durationMs / 60000)
                  const patientName = apt.patients?.name ?? 'Paciente sin asignar'
                  const confirmationResponse = (apt.appointment_confirmations?.response as 'confirmed' | 'declined' | null) ?? null

                  const statusLineColor =
                    confirmationResponse === 'confirmed' ? '#10B981'
                    : apt.status === 'completed' ? '#94A3B8'
                    : apt.status === 'no_show' ? '#EF4444'
                    : '#F59E0B'

                  return (
                    <div
                      key={apt.id}
                      className="flex items-center gap-4 transition-colors hover:bg-[#F8FAFC]"
                      style={{
                        padding: '14px 20px',
                        borderBottom: i < todayAppointments.length - 1 ? '1px solid #F1F5F9' : 'none',
                      }}
                    >
                      <span
                        className="shrink-0"
                        style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', width: '52px' }}
                      >
                        {startTime}
                      </span>
                      <div
                        className="shrink-0"
                        style={{ width: '2px', height: '32px', borderRadius: '1px', background: statusLineColor }}
                      />
                      <span className="flex-1 truncate" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {patientName}
                      </span>
                      <AppointmentStatusBadge
                        status={apt.status as AppointmentStatus}
                        confirmation={confirmationResponse}
                      />
                      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        {durationMin} min
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Unconfirmed alerts */}
          {unconfirmed.length > 0 && (
            <div>
              <SectionHeader title="Turnos sin confirmar esta semana" badge={unconfirmed.length} />
              <Card>
                <CardContent className="divide-y pt-4">
                  {unconfirmed.map((apt) => {
                    const dateStr = formatInTimezone(new Date(apt.start_at), tz, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
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
            <SectionHeader title="Actividad reciente" />
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
                      ? 'var(--brand)'
                      : item.type === 'confirmation'
                        ? '#10B981'
                        : '#3B82F6'

                    return (
                      <div key={item.id} className="flex items-center gap-3 py-3">
                        <Icon className="h-4 w-4" style={{ color: iconColor }} />
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

        {/* Right sidebar (1/3): inactive */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserX className="h-4 w-4 text-orange-500" />
                Pacientes inactivos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {inactive.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todos los pacientes están al día</p>
              ) : (
                <ul className="space-y-2">
                  {inactive.map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <Link href={`/pacientes?id=${p.id}`} className="font-medium hover:underline" style={{ color: 'var(--text-primary)' }}>
                        {p.name}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {p.lastVisit
                          ? formatDistanceToNow(new Date(p.lastVisit), { locale: es, addSuffix: true })
                          : 'Sin visitas'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
