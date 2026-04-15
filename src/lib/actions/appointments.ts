'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { AppointmentWithRelations, AppointmentStatus } from '@/lib/types/database.types'

export async function getTodayAppointments(): Promise<AppointmentWithRelations[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { getProfessional } = await import('./professional')
  const professional = await getProfessional()
  if (!professional) redirect('/onboarding')

  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patients (id, name, phone, email),
      appointment_confirmations (response, responded_at)
    `)
    .eq('professional_id', professional.id)
    .gte('start_at', startOfDay.toISOString())
    .lte('start_at', endOfDay.toISOString())
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

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)

  const in7days = new Date()
  in7days.setDate(in7days.getDate() + 7)
  in7days.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patients (id, name, phone),
      appointment_confirmations (response, responded_at)
    `)
    .eq('professional_id', professional.id)
    .eq('status', 'scheduled')
    .gte('start_at', tomorrow.toISOString())
    .lte('start_at', in7days.toISOString())
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

  const start = new Date(weekStart)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patients (id, name, phone, email),
      appointment_confirmations (response, responded_at)
    `)
    .eq('professional_id', professional.id)
    .gte('start_at', start.toISOString())
    .lte('start_at', end.toISOString())
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

  const { error } = await supabase
    .from('appointments')
    .insert({
      professional_id: professional.id,
      patient_id: data.patient_id,
      start_at: data.start_at,
      end_at: data.end_at,
      notes: data.notes ?? null,
      status: 'scheduled',
    })

  if (error) {
    if (error.code === '23P01') {
      throw new Error('Ya tenés un turno en ese horario. Elegí otro momento.')
    }
    throw new Error(error.message)
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

  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', appointmentId)
    .eq('professional_id', professional.id)

  if (error) throw new Error(error.message)

  revalidatePath('/agenda')
  revalidatePath('/dashboard')
}

export async function cancelAppointment(appointmentId: string) {
  return updateAppointmentStatus(appointmentId, 'cancelled')
}
