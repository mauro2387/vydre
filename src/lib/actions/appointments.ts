'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { todayInTimezone, dayBoundsUTC, DEFAULT_TZ } from '@/lib/utils'
import {
  createAppointmentSchema,
  appointmentStatusSchema,
  uuidSchema,
  parseOrThrow,
} from '@/lib/validation/schemas'
import type { AppointmentWithRelations, AppointmentStatus } from '@/lib/types/database.types'

export async function getTodayAppointments(): Promise<AppointmentWithRelations[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { getProfessional } = await import('./professional')
  const professional = await getProfessional()
  if (!professional) redirect('/onboarding')

  const tz = professional.timezone ?? DEFAULT_TZ
  const today = todayInTimezone(tz)
  const { startUTC, endUTC } = dayBoundsUTC(today, tz)

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patients (id, name, phone, email),
      appointment_confirmations (response, responded_at, reminder_sent_at),
      clinical_entries (id)
    `)
    .eq('professional_id', professional.id)
    .gte('start_at', startUTC)
    .lte('start_at', endUTC)
    .neq('status', 'cancelled')
    .order('start_at', { ascending: true })
    .returns<AppointmentWithRelations[]>()

  if (error) return []
  return data ?? []
}

export async function getUpcomingUnconfirmed(): Promise<AppointmentWithRelations[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { getProfessional } = await import('./professional')
  const professional = await getProfessional()
  if (!professional) return []

  const tz = professional.timezone ?? DEFAULT_TZ
  const todayStr = todayInTimezone(tz)
  const todayDate = new Date(todayStr + 'T00:00:00')
  const tomorrowDate = new Date(todayDate)
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const in7daysDate = new Date(todayDate)
  in7daysDate.setDate(in7daysDate.getDate() + 7)

  const tomorrowStr = tomorrowDate.toISOString().split('T')[0]
  const in7daysStr = in7daysDate.toISOString().split('T')[0]
  const { startUTC: tomorrowStart } = dayBoundsUTC(tomorrowStr, tz)
  const { endUTC: in7daysEnd } = dayBoundsUTC(in7daysStr, tz)

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patients (id, name, phone),
      appointment_confirmations (response, responded_at)
    `)
    .eq('professional_id', professional.id)
    .eq('status', 'scheduled')
    .gte('start_at', tomorrowStart)
    .lte('start_at', in7daysEnd)
    .order('start_at', { ascending: true })
    .returns<AppointmentWithRelations[]>()

  if (error) return []

  return (data ?? []).filter(apt => {
    const conf = apt.appointment_confirmations
    return !conf || conf.response === null
  })
}

export async function getWeekAppointments(weekStart: string): Promise<AppointmentWithRelations[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { getProfessional } = await import('./professional')
  const professional = await getProfessional()
  if (!professional) redirect('/onboarding')

  const tz = professional.timezone ?? DEFAULT_TZ
  const startDate = new Date(weekStart + 'T00:00:00')
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 6)
  const endStr = endDate.toISOString().split('T')[0]
  const { startUTC: start } = dayBoundsUTC(weekStart, tz)
  const { endUTC: end } = dayBoundsUTC(endStr, tz)

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patients (id, name, phone, email),
      appointment_confirmations (response, responded_at, reminder_sent_at),
      clinical_entries (id)
    `)
    .eq('professional_id', professional.id)
    .gte('start_at', start)
    .lte('start_at', end)
    .neq('status', 'cancelled')
    .order('start_at', { ascending: true })
    .returns<AppointmentWithRelations[]>()

  if (error) return []
  return data ?? []
}

export async function createAppointment(data: {
  patient_id: string
  start_at: string
  end_at: string
  notes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { getProfessional } = await import('./professional')
  const professional = await getProfessional()
  if (!professional) throw new Error('Profesional no encontrado')

  const parsed = parseOrThrow(createAppointmentSchema, data)

  const { data: inserted, error } = await supabase
    .from('appointments')
    .insert({
      professional_id: professional.id,
      patient_id: parsed.patient_id,
      start_at: parsed.start_at,
      end_at: parsed.end_at,
      notes: parsed.notes ?? null,
      status: 'scheduled',
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23P01') {
      throw new Error('Ya tenés un turno en ese horario. Elegí otro momento.')
    }
    throw new Error(error.message)
  }

  // Track activation
  await supabase
    .from('professionals')
    .update({ first_appointment_created: true })
    .eq('id', professional.id)
    .eq('first_appointment_created', false)

  const { checkActivationComplete } = await import('./professional')
  await checkActivationComplete()

  // Auto-send reminder email to patient
  try {
    const { data: patient } = await supabase
      .from('patients')
      .select('name, email')
      .eq('id', parsed.patient_id)
      .single()

    if (patient?.email) {
      // Create confirmation token (upsert to survive retries)
      const { data: conf } = await supabase
        .from('appointment_confirmations')
        .upsert(
          { appointment_id: inserted.id },
          { onConflict: 'appointment_id', ignoreDuplicates: false },
        )
        .select('token')
        .single()

      if (conf) {
        const { sendReminderEmail } = await import('@/lib/email')
        const { formatInTimezone } = await import('@/lib/utils')
        const tz = professional.timezone ?? DEFAULT_TZ
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

        const dateFormatted = formatInTimezone(
          new Date(parsed.start_at), tz,
          { weekday: 'long', day: 'numeric', month: 'long' }
        )
        const timeFormatted = formatInTimezone(
          new Date(parsed.start_at), tz,
          { hour: '2-digit', minute: '2-digit', hour12: false }
        )

        // Log message as pending (audit trail)
        const { data: msg } = await supabase
          .from('messages')
          .insert({
            appointment_id: inserted.id,
            professional_id: professional.id,
            type: 'reminder',
            channel: 'email',
            status: 'pending',
            recipient: patient.email,
          })
          .select('id')
          .single()

        try {
          await sendReminderEmail({
            to: patient.email,
            patientName: patient.name,
            professionalName: professional.name,
            specialty: professional.specialty,
            appointmentDate: dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1),
            appointmentTime: timeFormatted,
            confirmUrl: `${appUrl}/confirmar/${conf.token}?r=si`,
            declineUrl: `${appUrl}/confirmar/${conf.token}?r=no`,
          })

          await supabase
            .from('appointment_confirmations')
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq('appointment_id', inserted.id)

          if (msg?.id) {
            await supabase
              .from('messages')
              .update({ status: 'sent', sent_at: new Date().toISOString() })
              .eq('id', msg.id)
          }

          // Track first reminder
          await supabase
            .from('professionals')
            .update({ first_reminder_sent: true })
            .eq('id', professional.id)
            .eq('first_reminder_sent', false)
        } catch (sendErr) {
          if (msg?.id) {
            const errMsg = sendErr instanceof Error ? sendErr.message : 'unknown'
            await supabase
              .from('messages')
              .update({ status: 'failed', error: errMsg })
              .eq('id', msg.id)
          }
          throw sendErr
        }
      }
    }
  } catch (emailError) {
    // Non-blocking: appointment was created successfully even if email failed.
    console.error('[auto-reminder] send failed for appointment', inserted.id, emailError)
  }

  revalidatePath('/agenda')
  revalidatePath('/dashboard')
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { getProfessional } = await import('./professional')
  const professional = await getProfessional()
  if (!professional) throw new Error('Profesional no encontrado')

  const id = parseOrThrow(uuidSchema, appointmentId)
  const s = parseOrThrow(appointmentStatusSchema, status)

  const { error } = await supabase
    .from('appointments')
    .update({ status: s })
    .eq('id', id)
    .eq('professional_id', professional.id)

  if (error) throw new Error(error.message)

  revalidatePath('/agenda')
  revalidatePath('/dashboard')
}

export async function cancelAppointment(appointmentId: string) {
  return updateAppointmentStatus(appointmentId, 'cancelled')
}

export type ActivityItem = {
  id: string
  type: 'appointment' | 'confirmation' | 'summary'
  description: string
  timestamp: string
}

export async function getRecentActivity(): Promise<ActivityItem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { getProfessional } = await import('./professional')
  const professional = await getProfessional()
  if (!professional) return []

  const sinceISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const tz = professional.timezone ?? DEFAULT_TZ

  const items: ActivityItem[] = []

  // Turnos creados en las últimas 24hs
  const { data: recentApts } = await supabase
    .from('appointments')
    .select('id, created_at, start_at, patients (name)')
    .eq('professional_id', professional.id)
    .gte('created_at', sinceISO)
    .order('created_at', { ascending: false })
    .limit(10)

  for (const apt of recentApts ?? []) {
    const patient = apt.patients as unknown as { name: string } | null
    const time = new Date(apt.start_at).toLocaleTimeString('es-UY', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: tz,
    })
    items.push({
      id: `apt-${apt.id}`,
      type: 'appointment',
      description: `Turno con ${patient?.name ?? 'paciente'} — ${time}`,
      timestamp: apt.created_at,
    })
  }

  // Confirmaciones recibidas en las últimas 24hs
  const { data: recentConfs } = await supabase
    .from('appointment_confirmations')
    .select('id, responded_at, response, appointments (id, professional_id, patients (name))')
    .not('responded_at', 'is', null)
    .gte('responded_at', sinceISO)
    .order('responded_at', { ascending: false })
    .limit(10)

  for (const conf of recentConfs ?? []) {
    const apt = conf.appointments as unknown as {
      id: string
      professional_id: string
      patients: { name: string } | null
    } | null
    if (apt?.professional_id !== professional.id) continue
    const responseText = conf.response === 'confirmed' ? 'confirmó' : 'declinó'
    items.push({
      id: `conf-${conf.id}`,
      type: 'confirmation',
      description: `${apt?.patients?.name ?? 'Paciente'} ${responseText} su turno`,
      timestamp: conf.responded_at!,
    })
  }

  // Resúmenes enviados en las últimas 24hs
  const { data: recentMsgs } = await supabase
    .from('messages')
    .select('id, sent_at, recipient, type')
    .eq('professional_id', professional.id)
    .eq('type', 'summary')
    .eq('status', 'sent')
    .gte('sent_at', sinceISO)
    .order('sent_at', { ascending: false })
    .limit(10)

  for (const msg of recentMsgs ?? []) {
    items.push({
      id: `msg-${msg.id}`,
      type: 'summary',
      description: `Resumen enviado a ${msg.recipient}`,
      timestamp: msg.sent_at!,
    })
  }

  // Sort by timestamp desc, take top 10
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  return items.slice(0, 10)
}
