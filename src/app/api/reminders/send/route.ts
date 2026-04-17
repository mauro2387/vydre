import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendReminderEmail } from '@/lib/email'
import { todayInTimezone, dayBoundsUTC, formatInTimezone } from '@/lib/utils'

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

    // Use Argentina/Uruguay timezone for date boundaries
    const DEFAULT_TZ = 'America/Argentina/Buenos_Aires'
    const todayStr = todayInTimezone(DEFAULT_TZ)
    const tomorrowDate = new Date(todayStr + 'T12:00:00')
    tomorrowDate.setDate(tomorrowDate.getDate() + 1)
    const tomorrowStr = tomorrowDate.toISOString().split('T')[0]
    const { startUTC: tomorrowStart, endUTC: tomorrowEnd } = dayBoundsUTC(tomorrowStr, DEFAULT_TZ)

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
      .gte('start_at', tomorrowStart)
      .lte('start_at', tomorrowEnd)
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

        const appointmentDateFormatted = formatInTimezone(
          new Date(apt.start_at),
          DEFAULT_TZ,
          { weekday: 'long', day: 'numeric', month: 'long' }
        )
        const capitalizedDate = appointmentDateFormatted.charAt(0).toUpperCase() + appointmentDateFormatted.slice(1)
        const appointmentTime = formatInTimezone(
          new Date(apt.start_at),
          DEFAULT_TZ,
          { hour: '2-digit', minute: '2-digit', hour12: false }
        )

        const professional = apt.professionals as unknown as { name: string; specialty: string } | null

        await sendReminderEmail({
          to: patient.email,
          patientName: patient.name,
          professionalName: professional?.name ?? 'Tu médico',
          specialty: professional?.specialty ?? '',
          appointmentDate: capitalizedDate,
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
