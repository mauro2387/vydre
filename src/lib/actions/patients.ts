'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getProfessional, checkActivationComplete } from './professional'
import type { Patient, PatientDetail } from '@/lib/types/database.types'

export async function getPatients(search?: string): Promise<Patient[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) return []

  let query = supabase
    .from('patients')
    .select('*')
    .eq('professional_id', professional.id)
    .order('name', { ascending: true })

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const { data, error } = await query

  if (error) return []
  return data
}

export async function getPatientDetail(patientId: string): Promise<PatientDetail | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) return null

  const { data, error } = await supabase
    .from('patients')
    .select(`
      *,
      appointments (
        id,
        start_at,
        end_at,
        status,
        notes,
        appointment_confirmations (response),
        consultation_notes (
          id,
          reason,
          treatment,
          observations,
          generated_summaries (id, content, edited_content, sent_at)
        )
      )
    `)
    .eq('id', patientId)
    .eq('professional_id', professional.id)
    .single()
    .returns<PatientDetail>()

  if (error) return null

  if (data.appointments) {
    data.appointments.sort((a, b) =>
      new Date(b.start_at).getTime() - new Date(a.start_at).getTime()
    )
  }

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

  // Track activation
  await supabase
    .from('professionals')
    .update({ first_patient_created: true })
    .eq('id', professional.id)
    .eq('first_patient_created', false)

  await checkActivationComplete()

  revalidatePath('/pacientes')
  revalidatePath('/agenda')
  revalidatePath('/bienvenida')
}

export async function updatePatient(
  patientId: string,
  formData: {
    name: string
    phone: string
    email?: string
    notes?: string
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) throw new Error('Profesional no encontrado')

  const { error } = await supabase
    .from('patients')
    .update({
      name: formData.name,
      phone: formData.phone,
      email: formData.email ?? null,
      notes: formData.notes ?? null,
    })
    .eq('id', patientId)
    .eq('professional_id', professional.id)

  if (error) throw new Error(error.message)

  revalidatePath('/pacientes')
}
