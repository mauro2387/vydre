import { createClient } from '@supabase/supabase-js'
import { formatInTimezone } from '@/lib/utils'
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import Link from 'next/link'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function ConfirmarPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ r?: string }>
}) {
  const { token } = await params
  const { r } = await searchParams

  const supabase = getServiceClient()

  const { data: confirmation, error } = await supabase
    .from('appointment_confirmations')
    .select(`
      id,
      appointment_id,
      response,
      appointments (
        id,
        start_at,
        status,
        professionals (name, specialty)
      )
    `)
    .eq('token', token)
    .single()

  // Invalid token
  if (error || !confirmation) {
    return (
      <PageWrapper>
        <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
        <h1 className="text-xl font-bold text-gray-900">Link inválido</h1>
        <p className="mt-2 text-gray-600">
          Este enlace de confirmación no existe o ya expiró.
        </p>
      </PageWrapper>
    )
  }

  const appointment = confirmation.appointments as unknown as {
    id: string
    start_at: string
    status: string
    professionals: { name: string; specialty: string } | null
  } | null

  const DEFAULT_TZ = 'America/Argentina/Buenos_Aires'
  const appointmentDate = appointment
    ? formatInTimezone(new Date(appointment.start_at), DEFAULT_TZ, {
        weekday: 'long', day: 'numeric', month: 'long',
      })
    : ''
  const formattedDate = appointmentDate.charAt(0).toUpperCase() + appointmentDate.slice(1)
  const appointmentTime = appointment
    ? formatInTimezone(new Date(appointment.start_at), DEFAULT_TZ, {
        hour: '2-digit', minute: '2-digit', hour12: false,
      })
    : ''

  // FIX: always show "ya respondiste" if already responded, even with ?r= param
  if (confirmation.response) {
    const isConfirmed = confirmation.response === 'confirmed'
    return (
      <PageWrapper>
        <Info className="mx-auto mb-4 h-12 w-12 text-blue-500" />
        <h1 className="text-xl font-bold text-gray-900">Ya respondiste a este recordatorio</h1>
        <p className="mt-2 text-gray-600">
          Tu turno del {formattedDate} a las {appointmentTime} está{' '}
          <span className={isConfirmed ? 'font-semibold text-green-600' : 'font-semibold text-yellow-600'}>
            {isConfirmed ? 'confirmado' : 'cancelado'}
          </span>.
        </p>
      </PageWrapper>
    )
  }

  // Process response
  if (r === 'si' || r === 'no') {
    const response = r === 'si' ? 'confirmed' : 'declined'

    await supabase
      .from('appointment_confirmations')
      .update({
        response,
        responded_at: new Date().toISOString(),
      })
      .eq('id', confirmation.id)

    if (r === 'si' && appointment) {
      await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', appointment.id)
    }

    // Create notification for the professional (best-effort)
    if (appointment) {
      const { data: apt } = await supabase
        .from('appointments')
        .select('professional_id, patients (name)')
        .eq('id', appointment.id)
        .single()

      const aptData = apt as unknown as {
        professional_id: string
        patients: { name: string } | null
      } | null

      if (aptData?.professional_id) {
        const patientName = aptData.patients?.name ?? 'Un paciente'
        try {
          await supabase.from('notifications').insert({
            professional_id: aptData.professional_id,
            type: r === 'si' ? 'appointment_confirmed' : 'appointment_declined',
            title: r === 'si'
              ? `${patientName} confirmó su turno`
              : `${patientName} canceló su turno`,
            body: r === 'si'
              ? `Turno el ${formattedDate} a las ${appointmentTime}`
              : `Turno el ${formattedDate} a las ${appointmentTime} — revisá la agenda`,
            action_url: '/agenda',
          })
        } catch {
          // best-effort
        }
      }
    }

    if (r === 'si') {
      return (
        <PageWrapper bg="bg-green-50">
          <div className="animate-pop-in">
            <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-green-900">
            ¡Perfecto! Tu turno está confirmado
          </h1>
          <p className="mt-3 text-green-700">
            Te esperamos el {formattedDate} a las {appointmentTime}
          </p>
          {appointment?.professionals && (
            <p className="mt-1 text-sm text-green-600">
              {appointment.professionals.name} · {appointment.professionals.specialty}
            </p>
          )}
        </PageWrapper>
      )
    }

    return (
      <PageWrapper bg="bg-yellow-50">
        <div className="animate-pop-in">
          <XCircle className="mx-auto mb-4 h-16 w-16 text-yellow-500" />
        </div>
        <h1 className="text-2xl font-bold text-yellow-900">
          Entendido, cancelaste tu turno
        </h1>
        <p className="mt-3 text-yellow-700">
          Si cambiás de opinión, contactá directamente al consultorio.
        </p>
      </PageWrapper>
    )
  }

  // Landing page — show appointment info and buttons
  return (
    <PageWrapper>
      <p className="mb-6 text-lg font-bold text-gray-900">Vydre</p>
      <h1 className="text-2xl font-bold text-gray-900">Confirmar turno</h1>

      {/* Appointment info card */}
      <div className="mx-auto mt-6 w-full max-w-sm rounded-lg border-l-4 border-l-primary bg-white p-4 text-left shadow-sm">
        <p className="text-xl font-medium text-gray-900">{formattedDate}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{appointmentTime}</p>
        {appointment?.professionals && (
          <p className="mt-2 text-sm text-gray-500">
            {appointment.professionals.name} · {appointment.professionals.specialty}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="mx-auto mt-8 flex w-full max-w-sm flex-col gap-3">
        <Link
          href={`/confirmar/${token}?r=si`}
          className="inline-flex min-h-[52px] items-center justify-center rounded-lg bg-green-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-green-700"
        >
          <CheckCircle className="mr-2 h-5 w-5" />
          Sí, confirmo mi turno
        </Link>
        <Link
          href={`/confirmar/${token}?r=no`}
          className="inline-flex min-h-[52px] items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          No puedo asistir
        </Link>
      </div>
    </PageWrapper>
  )
}

function PageWrapper({
  children,
  bg = 'bg-gray-50',
}: {
  children: React.ReactNode
  bg?: string
}) {
  return (
    <div className={`flex min-h-screen items-center justify-center px-6 ${bg}`}>
      <div className="w-full max-w-[480px] text-center">
        {children}
      </div>
    </div>
  )
}
