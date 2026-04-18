'use server'

import { createClient } from '@/lib/supabase/server'
import { getProfessional } from '@/lib/actions/professional'

export async function getMonthlyStats(month: string) {
  const supabase = await createClient()
  const professional = await getProfessional()
  if (!professional) return null

  const startDate = `${month}-01`
  const endDate = new Date(
    new Date(startDate).getFullYear(),
    new Date(startDate).getMonth() + 1,
    1
  ).toISOString()
  const startISO = new Date(startDate).toISOString()

  const [appointmentsRes, paymentsRes, patientsRes] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, start_at, status')
      .eq('professional_id', professional.id)
      .gte('start_at', startISO)
      .lt('start_at', endDate),
    supabase
      .from('payments')
      .select('amount, status')
      .eq('professional_id', professional.id)
      .gte('created_at', startISO)
      .lt('created_at', endDate),
    supabase
      .from('patients')
      .select('id, created_at')
      .eq('professional_id', professional.id)
      .gte('created_at', startISO)
      .lt('created_at', endDate),
  ])

  const appointments = appointmentsRes.data ?? []
  const payments = paymentsRes.data ?? []
  const patients = patientsRes.data ?? []

  const total = appointments.length
  const completed = appointments.filter((a) => a.status === 'completed').length
  const cancelled = appointments.filter((a) => a.status === 'cancelled').length
  const noShow = appointments.filter((a) => a.status === 'no_show').length
  const scheduled = total - cancelled
  const absenceRate = scheduled > 0 ? Math.round((noShow / scheduled) * 100) : 0
  const confirmationRate =
    scheduled > 0
      ? Math.round(
          (appointments.filter((a) => a.status === 'confirmed' || a.status === 'completed').length /
            scheduled) *
            100
        )
      : 0

  const totalRevenue = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount), 0)
  const pendingRevenue = payments
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  // Busiest day/hour
  const dayCounts: Record<number, number> = {}
  const hourCounts: Record<number, number> = {}
  for (const apt of appointments) {
    const d = new Date(apt.start_at)
    dayCounts[d.getDay()] = (dayCounts[d.getDay()] ?? 0) + 1
    hourCounts[d.getHours()] = (hourCounts[d.getHours()] ?? 0) + 1
  }
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const busiestDayIdx = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]
  const busiestHourEntry = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]

  return {
    total_appointments: total,
    completed_appointments: completed,
    cancelled_appointments: cancelled,
    no_show_appointments: noShow,
    absence_rate: absenceRate,
    new_patients: patients.length,
    total_revenue: totalRevenue,
    pending_revenue: pendingRevenue,
    busiest_day: busiestDayIdx ? dayNames[Number(busiestDayIdx[0])] : '—',
    busiest_hour: busiestHourEntry ? `${busiestHourEntry[0]}:00` : '—',
    confirmation_rate: confirmationRate,
  }
}

export async function getMonthlyTrend(months: number = 6) {
  const supabase = await createClient()
  const professional = await getProfessional()
  if (!professional) return []

  const now = new Date()
  const result: { month: string; appointments: number; revenue: number; noShows: number }[] = []

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    const startISO = d.toISOString()
    const endISO = nextMonth.toISOString()
    const label = d.toLocaleDateString('es', { month: 'short', year: '2-digit' })

    const [aptsRes, payRes] = await Promise.all([
      supabase
        .from('appointments')
        .select('id, status')
        .eq('professional_id', professional.id)
        .gte('start_at', startISO)
        .lt('start_at', endISO),
      supabase
        .from('payments')
        .select('amount')
        .eq('professional_id', professional.id)
        .eq('status', 'paid')
        .gte('created_at', startISO)
        .lt('created_at', endISO),
    ])

    const apts = aptsRes.data ?? []
    const pays = payRes.data ?? []

    result.push({
      month: label,
      appointments: apts.length,
      revenue: pays.reduce((s, p) => s + Number(p.amount), 0),
      noShows: apts.filter((a) => a.status === 'no_show').length,
    })
  }

  return result
}

export async function getHeatmapData() {
  const supabase = await createClient()
  const professional = await getProfessional()
  if (!professional) return []

  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const { data } = await supabase
    .from('appointments')
    .select('start_at')
    .eq('professional_id', professional.id)
    .gte('start_at', threeMonthsAgo.toISOString())

  const grid: { day: number; hour: number; count: number }[] = []
  const counts: Record<string, number> = {}

  for (const apt of data ?? []) {
    const d = new Date(apt.start_at)
    const key = `${d.getDay()}-${d.getHours()}`
    counts[key] = (counts[key] ?? 0) + 1
  }

  for (let day = 1; day <= 6; day++) {
    for (let hour = 7; hour <= 21; hour++) {
      grid.push({ day, hour, count: counts[`${day}-${hour}`] ?? 0 })
    }
  }
  // Sunday
  for (let hour = 7; hour <= 21; hour++) {
    grid.push({ day: 0, hour, count: counts[`0-${hour}`] ?? 0 })
  }

  return grid
}

export async function getPendingPayments() {
  const supabase = await createClient()
  const professional = await getProfessional()
  if (!professional) return []

  const { data } = await supabase
    .from('payments')
    .select('id, amount, currency, created_at, patient_id, appointment_id')
    .eq('professional_id', professional.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50)

  if (!data || data.length === 0) return []

  // Fetch patient names separately
  const patientIds = [...new Set(data.map((p) => p.patient_id).filter(Boolean))] as string[]
  const { data: patients } = patientIds.length > 0
    ? await supabase.from('patients').select('id, name').in('id', patientIds)
    : { data: [] }

  const patientMap = new Map((patients ?? []).map((p) => [p.id, p.name]))

  return data.map((p) => ({
    ...p,
    patients: p.patient_id ? { name: patientMap.get(p.patient_id) ?? 'Paciente' } : null,
  }))
}
