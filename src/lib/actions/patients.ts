'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getProfessional } from './professional'
import type { Patient } from '@/lib/types/database.types'

export async function getPatients(): Promise<Patient[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) return []

  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('professional_id', professional.id)
    .order('name', { ascending: true })

  if (error) return []
  return data
}

export async function createPatient(formData: {
  name: string
  phone: string
  email?: string
  notes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) throw new Error('Profesional no encontrado')

  const { error } = await supabase
    .from('patients')
    .insert({
      professional_id: professional.id,
      name: formData.name,
      phone: formData.phone,
      email: formData.email ?? null,
      notes: formData.notes ?? null,
    })

  if (error) throw new Error(error.message)

  revalidatePath('/pacientes')
  revalidatePath('/agenda')
}
