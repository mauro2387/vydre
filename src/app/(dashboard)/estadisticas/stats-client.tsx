'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import {
  CalendarCheck,
  UserPlus,
  DollarSign,
  AlertTriangle,
  Clock,
  TrendingUp,
  CheckCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { markPaymentPaid } from './actions'
import { toast } from 'sonner'

type MonthlyStats = {
  total_appointments: number
  completed_appointments: number
  cancelled_appointments: number
  no_show_appointments: number
  absence_rate: number
  new_patients: number
  total_revenue: number
  pending_revenue: number
  busiest_day: string
  busiest_hour: string
  confirmation_rate: number
} | null

type TrendItem = { month: string; appointments: number; revenue: number; noShows: number }
type HeatmapItem = { day: number; hour: number; count: number }
type PendingPayment = {
  id: string
  amount: number
  currency: string
  created_at: string
  patients: { name: string } | null
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function fmtCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function StatsClient({
  stats,
  prevStats,
  trend,
  heatmap,
  pendingPayments,
  currentMonth,
}: {
  stats: MonthlyStats
  prevStats: MonthlyStats
  trend: TrendItem[]
  heatmap: HeatmapItem[]
  pendingPayments: PendingPayment[]
  currentMonth: string
}) {
  const router = useRouter()
  const s = stats ?? {
    total_appointments: 0,
    completed_appointments: 0,
    cancelled_appointments: 0,
    no_show_appointments: 0,
    absence_rate: 0,
    new_patients: 0,
    total_revenue: 0,
    pending_revenue: 0,
    busiest_day: '—',
    busiest_hour: '—',
    confirmation_rate: 0,
  }

  const [period, setPeriod] = useState<'current' | 'prev'>('current')
  const displayStats = period === 'current' ? s : (prevStats ?? s)

  const maxHeat = Math.max(...heatmap.map((h) => h.count), 1)

  // Group heatmap by day (Mon-Sat, then Sun)
  const orderedDays = [1, 2, 3, 4, 5, 6, 0]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Estadísticas</h1>
        <div className="flex gap-2">
          <Button
            variant={period === 'current' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('current')}
          >
            Este mes
          </Button>
          <Button
            variant={period === 'prev' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('prev')}
          >
            Mes anterior
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Turnos realizados</CardTitle>
            <CalendarCheck className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {displayStats.completed_appointments}/{displayStats.total_appointments}
            </div>
            <p className="text-muted-foreground text-xs">
              {displayStats.total_appointments > 0
                ? Math.round(
                    (displayStats.completed_appointments / displayStats.total_appointments) * 100
                  )
                : 0}
              % completados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ausentismo</CardTitle>
            <AlertTriangle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                displayStats.absence_rate > 20
                  ? 'text-red-600'
                  : displayStats.absence_rate > 10
                    ? 'text-yellow-600'
                    : 'text-green-600'
              }`}
            >
              {displayStats.absence_rate}%
            </div>
            <p className="text-muted-foreground text-xs">
              {displayStats.no_show_appointments} ausencias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            <DollarSign className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtCurrency(displayStats.total_revenue)}</div>
            <p className="text-muted-foreground text-xs">
              {fmtCurrency(displayStats.pending_revenue)} pendiente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pacientes nuevos</CardTitle>
            <UserPlus className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayStats.new_patients}</div>
            <p className="text-muted-foreground text-xs">
              Confirmación: {displayStats.confirmation_rate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Extra info */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Clock className="text-muted-foreground h-5 w-5" />
            <div>
              <p className="text-sm font-medium">Día más ocupado</p>
              <p className="text-muted-foreground text-xs">{displayStats.busiest_day}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <TrendingUp className="text-muted-foreground h-5 w-5" />
            <div>
              <p className="text-sm font-medium">Hora pico</p>
              <p className="text-muted-foreground text-xs">{displayStats.busiest_hour}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <CheckCircle className="text-muted-foreground h-5 w-5" />
            <div>
              <p className="text-sm font-medium">Tasa de confirmación</p>
              <p className="text-muted-foreground text-xs">{displayStats.confirmation_rate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart — Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Turnos por mes (últimos 6 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="appointments" name="Turnos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="noShows" name="Ausencias" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Días y horarios más ocupados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="grid min-w-[500px]" style={{ gridTemplateColumns: '50px repeat(15, 1fr)' }}>
              {/* Header row */}
              <div />
              {Array.from({ length: 15 }, (_, i) => (
                <div key={i} className="text-muted-foreground text-center text-xs">
                  {i + 7}h
                </div>
              ))}

              {/* Data rows */}
              {orderedDays.map((day) => (
                <React.Fragment key={`row-${day}`}>
                  <div className="text-muted-foreground flex items-center text-xs">
                    {DAY_NAMES[day]}
                  </div>
                  {Array.from({ length: 15 }, (_, i) => {
                    const hour = i + 7
                    const item = heatmap.find((h) => h.day === day && h.hour === hour)
                    const count = item?.count ?? 0
                    const opacity = count > 0 ? 0.15 + (count / maxHeat) * 0.85 : 0.05
                    return (
                      <div
                        key={`${day}-${hour}`}
                        className="m-0.5 flex h-7 items-center justify-center rounded text-xs"
                        style={{ backgroundColor: `hsl(var(--primary) / ${opacity})` }}
                        title={`${DAY_NAMES[day]} ${hour}:00 — ${count} turnos`}
                      >
                        {count > 0 ? count : ''}
                      </div>
                    )
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending payments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cobros pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingPayments.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay cobros pendientes</p>
          ) : (
            <div className="space-y-2">
              {pendingPayments.map((p) => (
                <PendingRow key={p.id} payment={p} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function PendingRow({ payment }: { payment: PendingPayment }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleMark = async () => {
    setLoading(true)
    try {
      await markPaymentPaid(payment.id)
      toast.success('Pago registrado')
      router.refresh()
    } catch {
      toast.error('Error al marcar como pagado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div>
        <p className="text-sm font-medium">
          {(payment.patients as { name: string } | null)?.name ?? 'Paciente'}
        </p>
        <p className="text-muted-foreground text-xs">
          {new Date(payment.created_at).toLocaleDateString('es-AR')} ·{' '}
          {fmtCurrency(payment.amount)}
        </p>
      </div>
      <Button size="sm" variant="outline" disabled={loading} onClick={handleMark}>
        {loading ? 'Guardando...' : 'Marcar pagado'}
      </Button>
    </div>
  )
}
