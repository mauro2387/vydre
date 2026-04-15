'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { AppointmentWithRelations } from '@/lib/types/database.types'

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
