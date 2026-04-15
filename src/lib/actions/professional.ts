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
    .update({
      name: formData.name,
      specialty: formData.specialty,
      phone: formData.phone,
      appointment_duration: formData.appointment_duration,
      schedule: formData.schedule,
      onboarding_complete: true,
    })
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
