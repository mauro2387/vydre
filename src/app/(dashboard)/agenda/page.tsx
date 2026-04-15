import { getWeekAppointments } from '@/lib/actions/appointments'
import { getPatients } from '@/lib/actions/patients'
import { getProfessional } from '@/lib/actions/professional'
import { redirect } from 'next/navigation'
import { AgendaView } from '@/components/app/agenda-view'

const getMondayOfWeek = (date: Date): Date => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>
}) {
  const params = await searchParams
  const weekStart = params.semana ?? getMondayOfWeek(new Date()).toISOString().split('T')[0]

  const [appointments, patients, professional] = await Promise.all([
    getWeekAppointments(weekStart),
    getPatients(),
    getProfessional(),
  ])

  if (!professional) redirect('/onboarding')

  return (
    <AgendaView
      appointments={appointments}
      patients={patients}
      professional={professional}
      weekStart={weekStart}
    />
  )
}
