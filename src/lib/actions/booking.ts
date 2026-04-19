'use server'

import { createClient } from '@/lib/supabase/server'
import { getProfessional } from '@/lib/actions/professional'
import { revalidatePath } from 'next/cache'
import { sendBookingConfirmationEmail } from '@/lib/email'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim()
}

export async function getBookingPage() {
  const supabase = await createClient()
  const professional = await getProfessional()
  if (!professional) return null

  const { data } = await supabase
    .from('booking_pages')
    .select('*')
    .eq('professional_id', professional.id)
    .single()

  return data
}

export async function upsertBookingPage(input: {
  active: boolean
  slug: string
  title?: string
  description?: string
  min_advance_hours: number
  max_advance_days: number
}) {
  const supabase = await createClient()
  const professional = await getProfessional()
  if (!professional) throw new Error('No autorizado')

  const { error } = await supabase.from('booking_pages').upsert(
    {
      professional_id: professional.id,
      slug: input.slug,
      active: input.active,
      title: input.title ?? null,
      description: input.description ?? null,
      min_advance_hours: input.min_advance_hours,
      max_advance_days: input.max_advance_days,
    },
    { onConflict: 'professional_id' }
  )

  if (error) throw new Error(error.message)
  revalidatePath('/configuracion')
}

export async function getPublicBookingPage(slug: string) {
  const supabase = await createClient()

  const { data: page } = await supabase
    .from('booking_pages')
    .select('*, professionals(id, name, specialty, timezone, schedule)')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  return page
}

export async function getAvailableSlots(professionalId: string, date: string, timezone: string) {
  const supabase = await createClient()

  // Get professional's schedule
  const { data: professional } = await supabase
    .from('professionals')
    .select('schedule, appointment_duration')
    .eq('id', professionalId)
    .single()

  if (!professional?.schedule) return []

  const schedule = professional.schedule as Record<string, { start: string; end: string } | null>
  const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
  const daySchedule = schedule[dayOfWeek]
  if (!daySchedule) return []

  const duration = professional.appointment_duration ?? 30

  // Get existing appointments for the date
  const dayStart = `${date}T00:00:00`
  const dayEnd = `${date}T23:59:59`

  const { data: existingApts } = await supabase
    .from('appointments')
    .select('start_at, end_at')
    .eq('professional_id', professionalId)
    .gte('start_at', dayStart)
    .lte('start_at', dayEnd)
    .neq('status', 'cancelled')

  const occupied = (existingApts ?? []).map((a) => ({
    start: new Date(a.start_at).getTime(),
    end: new Date(a.end_at).getTime(),
  }))

  // Generate slots
  const slots: string[] = []
  const [startH, startM] = daySchedule.start.split(':').map(Number)
  const [endH, endM] = daySchedule.end.split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  for (let m = startMinutes; m + duration <= endMinutes; m += duration) {
    const h = Math.floor(m / 60)
    const min = m % 60
    const slotTime = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
    const slotStart = new Date(`${date}T${slotTime}:00`).getTime()
    const slotEnd = slotStart + duration * 60 * 1000

    const hasConflict = occupied.some(
      (o) => slotStart < o.end && slotEnd > o.start
    )

    if (!hasConflict) {
      slots.push(slotTime)
    }
  }

  return slots
}

export async function createPublicBooking(input: {
  slug: string
  date: string
  time: string
  name: string
  email: string
  phone: string
  reason?: string
}) {
  const supabase = await createClient()

  // Get booking page + professional
  const { data: page } = await supabase
    .from('booking_pages')
    .select('professional_id, min_advance_hours, max_advance_days')
    .eq('slug', input.slug)
    .eq('active', true)
    .single()

  if (!page) throw new Error('Página de reservas no encontrada')

  const { data: professional } = await supabase
    .from('professionals')
    .select('id, name, specialty, appointment_duration')
    .eq('id', page.professional_id)
    .single()

  if (!professional) throw new Error('Profesional no encontrado')

  const duration = professional.appointment_duration ?? 30
  const startAt = new Date(`${input.date}T${input.time}:00`)
  const endAt = new Date(startAt.getTime() + duration * 60 * 1000)

  // Validate advance time
  const now = new Date()
  const hoursUntil = (startAt.getTime() - now.getTime()) / (1000 * 60 * 60)
  if (hoursUntil < page.min_advance_hours) {
    throw new Error(`Debe reservar con al menos ${page.min_advance_hours} horas de anticipación`)
  }

  // Find or create patient
  let patientId: string

  const { data: existingPatient } = await supabase
    .from('patients')
    .select('id')
    .eq('professional_id', professional.id)
    .eq('email', input.email)
    .single()

  if (existingPatient) {
    patientId = existingPatient.id
  } else {
    const { data: newPatient, error: patientError } = await supabase
      .from('patients')
      .insert({
        professional_id: professional.id,
        name: input.name,
        email: input.email,
        phone: input.phone,
      })
      .select('id')
      .single()

    if (patientError || !newPatient) throw new Error('Error al crear paciente')
    patientId = newPatient.id
  }

  // Create appointment
  const { data: appointment, error: aptError } = await supabase
    .from('appointments')
    .insert({
      professional_id: professional.id,
      patient_id: patientId,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: 'scheduled',
      notes: input.reason ?? null,
    })
    .select('id')
    .single()

  if (aptError) {
    if (aptError.message.includes('overlap')) {
      throw new Error('Ese horario ya no está disponible. Por favor elegí otro.')
    }
    throw new Error('Error al crear el turno')
  }

  // Send confirmation email (fire-and-forget)
  if (input.email) {
    const dateStr = startAt.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    const timeStr = input.time
    sendBookingConfirmationEmail({
      to: input.email,
      patientName: input.name,
      professionalName: professional.name,
      specialty: professional.specialty ?? '',
      appointmentDate: dateStr,
      appointmentTime: timeStr,
    }).catch((err) => console.error('[BookingEmail] error:', err))
  }

  return { appointmentId: appointment.id }
}

export async function generateUniqueSlug(name: string) {
  const supabase = await createClient()
  let slug = generateSlug(name)

  const { data } = await supabase
    .from('booking_pages')
    .select('slug')
    .like('slug', `${slug}%`)

  const existing = new Set((data ?? []).map((d) => d.slug))
  if (!existing.has(slug)) return slug

  let counter = 2
  while (existing.has(`${slug}-${counter}`)) counter++
  return `${slug}-${counter}`
}
