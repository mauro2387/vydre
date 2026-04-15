import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendReminderEmail } from '@/lib/email'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceClient()

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    const dayAfter = new Date(tomorrow)
    dayAfter.setHours(23, 59, 59, 999)

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        start_at,
        end_at,
        status,
        patients (name, email, phone),
        professionals (name, specialty),
        appointment_confirmations (id, token, reminder_sent_at)
      `)
      .gte('start_at', tomorrow.toISOString())
      .lte('start_at', dayAfter.toISOString())
      .eq('status', 'scheduled')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const results = []

    for (const apt of appointments ?? []) {
      try {
        const confirmations = apt.appointment_confirmations as unknown as
          | { id: string; token: string; reminder_sent_at: string | null }[]
          | null
        const conf = confirmations?.[0] ?? null

        if (conf?.reminder_sent_at) {
          results.push({ id: apt.id, status: 'already_sent' })
          continue
        }

        const patient = apt.patients as unknown as { name: string; email: string | null; phone: string } | null
        if (!patient?.email) {
          results.push({ id: apt.id, status: 'no_email' })
          continue
        }

        let confirmationToken = conf?.token

        if (!conf) {
          const { data: newConf, error: confError } = await supabase
            .from('appointment_confirmations')
            .insert({ appointment_id: apt.id })
            .select('token')
            .single()

          if (confError) throw new Error(confError.message)
          confirmationToken = newConf.token
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
        const confirmUrl = `${appUrl}/confirmar/${confirmationToken}?r=si`
        const declineUrl = `${appUrl}/confirmar/${confirmationToken}?r=no`

        const appointmentDate = format(
          new Date(apt.start_at),
          "EEEE d 'de' MMMM",
          { locale: es }
        )
        const appointmentDateFormatted = appointmentDate.charAt(0).toUpperCase() + appointmentDate.slice(1)
        const appointmentTime = format(new Date(apt.start_at), 'HH:mm')

        const professional = apt.professionals as unknown as { name: string; specialty: string } | null

        await sendReminderEmail({
          to: patient.email,
          patientName: patient.name,
          professionalName: professional?.name ?? 'Tu médico',
          specialty: professional?.specialty ?? '',
          appointmentDate: appointmentDateFormatted,
          appointmentTime,
          confirmUrl,
          declineUrl,
        })

        await supabase
          .from('appointment_confirmations')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('appointment_id', apt.id)

        await supabase
          .from('messages')
          .insert({
            appointment_id: apt.id,
            professional_id: null,
            type: 'reminder',
            channel: 'email',
            status: 'sent',
            recipient: patient.email,
            sent_at: new Date().toISOString(),
          })

        results.push({ id: apt.id, status: 'sent' })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        const patient = apt.patients as unknown as { name: string; email: string | null; phone: string } | null

        await supabase.from('messages').insert({
          appointment_id: apt.id,
          professional_id: null,
          type: 'reminder',
          channel: 'email',
          status: 'failed',
          recipient: patient?.email ?? 'unknown',
          error: message,
        })

        results.push({ id: apt.id, status: 'failed', error: message })
      }
    }

    return NextResponse.json({
      processed: results.length,
      results,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
