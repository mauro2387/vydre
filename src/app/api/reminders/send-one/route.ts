import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendReminderEmail } from '@/lib/email'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { appointmentId } = await request.json()
    if (!appointmentId) {
      return NextResponse.json(
        { error: 'appointmentId requerido' },
        { status: 400 }
      )
    }

    const { data: apt, error } = await supabase
      .from('appointments')
      .select(`
        id, start_at, professional_id,
        patients (name, email),
        professionals (name, specialty),
        appointment_confirmations (token, reminder_sent_at)
      `)
      .eq('id', appointmentId)
      .single()

    if (error || !apt) {
      return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })
    }

    const patient = apt.patients as unknown as { name: string; email: string | null } | null
    if (!patient?.email) {
      return NextResponse.json(
        { error: 'El paciente no tiene email registrado' },
        { status: 400 }
      )
    }

    const confirmations = apt.appointment_confirmations as unknown as
      | { token: string; reminder_sent_at: string | null }[]
      | null
    const conf = confirmations?.[0] ?? null
    let token = conf?.token

    if (!conf) {
      const { data: newConf, error: confError } = await supabase
        .from('appointment_confirmations')
        .insert({ appointment_id: apt.id })
        .select('token')
        .single()

      if (confError) throw new Error(confError.message)
      token = newConf.token
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const appointmentDate = format(
      new Date(apt.start_at),
      "EEEE d 'de' MMMM",
      { locale: es }
    )
    const appointmentDateFormatted =
      appointmentDate.charAt(0).toUpperCase() + appointmentDate.slice(1)
    const appointmentTime = format(new Date(apt.start_at), 'HH:mm')

    const professional = apt.professionals as unknown as { name: string; specialty: string } | null

    await sendReminderEmail({
      to: patient.email,
      patientName: patient.name,
      professionalName: professional?.name ?? 'Tu médico',
      specialty: professional?.specialty ?? '',
      appointmentDate: appointmentDateFormatted,
      appointmentTime,
      confirmUrl: `${appUrl}/confirmar/${token}?r=si`,
      declineUrl: `${appUrl}/confirmar/${token}?r=no`,
    })

    await supabase
      .from('appointment_confirmations')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('appointment_id', apt.id)

    // Track activation
    await supabase
      .from('professionals')
      .update({ first_reminder_sent: true })
      .eq('id', apt.professional_id)
      .eq('first_reminder_sent', false)

    // Check if activation is complete
    const { data: prof } = await supabase
      .from('professionals')
      .select('first_patient_created, first_appointment_created, first_reminder_sent, activation_complete')
      .eq('id', apt.professional_id)
      .single()

    if (
      prof &&
      !prof.activation_complete &&
      prof.first_patient_created &&
      prof.first_appointment_created &&
      prof.first_reminder_sent
    ) {
      await supabase
        .from('professionals')
        .update({ activation_complete: true })
        .eq('id', apt.professional_id)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
