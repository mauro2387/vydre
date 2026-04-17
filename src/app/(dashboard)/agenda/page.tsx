import { getWeekAppointments } from '@/lib/actions/appointments'
import { getPatients } from '@/lib/actions/patients'
import { getProfessional } from '@/lib/actions/professional'
import { redirect } from 'next/navigation'
import { AgendaView } from '@/components/app/agenda-view'
import { todayInTimezone } from '@/lib/utils'

const getMondayOfWeek = (dateStr: string): string => {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>
}) {
  const params = await searchParams
  const professional = await getProfessional()
  if (!professional) redirect('/onboarding')

  const tz = professional.timezone ?? 'America/Argentina/Buenos_Aires'
  const weekStart = params.semana ?? getMondayOfWeek(todayInTimezone(tz))

  const [appointments, patients] = await Promise.all([
    getWeekAppointments(weekStart),
    getPatients(),
  ])

  return (
    <AgendaView
      appointments={appointments}
      patients={patients}
      professional={professional}
      weekStart={weekStart}
    />
  )
}
