'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function getProfessional() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('professionals')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error) return null
  return data
}

export async function updateOnboarding(formData: {
  name: string
  specialty: string
  phone: string
  appointment_duration: number
  schedule: Record<string, { start: string; end: string; active: boolean }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('professionals')
    .upsert({
      user_id: user.id,
      name: formData.name,
      specialty: formData.specialty,
      phone: formData.phone,
      appointment_duration: formData.appointment_duration,
      schedule: formData.schedule,
      onboarding_complete: true,
    }, { onConflict: 'user_id' })

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

export async function updateProfile(data: {
  name: string
  specialty: string
  phone: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) throw new Error('Profesional no encontrado')

  const { error } = await supabase
    .from('professionals')
    .update({
      name: data.name,
      specialty: data.specialty,
      phone: data.phone,
    })
    .eq('user_id', user.id)

  if (error) throw new Error(`Error al actualizar perfil: ${error.message}`)

  revalidatePath('/configuracion')
  revalidatePath('/(dashboard)')
}

export async function updateSchedule(data: {
  appointment_duration: number
  schedule: Record<string, { start: string; end: string; active: boolean }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) throw new Error('Profesional no encontrado')

  const { error } = await supabase
    .from('professionals')
    .update({
      appointment_duration: data.appointment_duration,
      schedule: data.schedule,
    })
    .eq('user_id', user.id)

  if (error) throw new Error(`Error al actualizar horarios: ${error.message}`)

  revalidatePath('/configuracion')
  revalidatePath('/agenda')
}

export async function updateTimezone(timezone: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) throw new Error('Profesional no encontrado')

  const { error } = await supabase
    .from('professionals')
    .update({ timezone })
    .eq('user_id', user.id)

  if (error) throw new Error(`Error al actualizar zona horaria: ${error.message}`)

  revalidatePath('/configuracion')
}
