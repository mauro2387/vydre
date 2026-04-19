'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getProfessional, checkActivationComplete } from './professional'
import { createPatientSchema, updatePatientSchema, parseOrThrow } from '@/lib/validation/schemas'
import { logAuditEvent } from '@/lib/audit'
import type { Patient, PatientDetail } from '@/lib/types/database.types'

async function getProfessionalSafe() {
  try { return await getProfessional() } catch { return null }
}

export async function getPatients(search?: string): Promise<Patient[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) return []

  // FIX: use unaccent RPC for accent-insensitive search (García, Pérez, etc.)
  if (search) {
    const { data, error } = await supabase.rpc('search_patients', {
      prof_id: professional.id,
      search_term: search,
    })
    if (error) return []
    return data
  }

  const query = supabase
    .from('patients')
    .select('*')
    .eq('professional_id', professional.id)
    .order('name', { ascending: true })
    .limit(1000)

  const { data, error } = await query

  if (error) return []
  return data
}

/**
 * Paginated variant of getPatients for the patient-list sidebar.
 * Returns a slice of `pageSize` starting at `page` (1-based) plus a
 * `hasMore` flag derived from an over-fetch-by-one pattern.
 */
export async function getPatientsPaginated(options: {
  search?: string
  page?: number
  pageSize?: number
}): Promise<{ patients: Patient[]; hasMore: boolean; page: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) return { patients: [], hasMore: false, page: 1 }

  const page = Math.max(1, options.page ?? 1)
  const pageSize = Math.min(200, Math.max(10, options.pageSize ?? 50))

  // For searches we still use the RPC (small result sets, no pagination yet).
  if (options.search) {
    const { data, error } = await supabase.rpc('search_patients', {
      prof_id: professional.id,
      search_term: options.search,
    })
    if (error) return { patients: [], hasMore: false, page }
    return { patients: data, hasMore: false, page }
  }

  // Over-fetch by 1 to detect whether a next page exists without a COUNT(*).
  const from = (page - 1) * pageSize
  const to = from + pageSize // inclusive → fetches pageSize + 1 rows

  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('professional_id', professional.id)
    .order('name', { ascending: true })
    .range(from, to)

  if (error) return { patients: [], hasMore: false, page }

  const hasMore = data.length > pageSize
  return { patients: hasMore ? data.slice(0, pageSize) : data, hasMore, page }
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
        clinical_entries (
          id,
          chief_complaint,
          treatment_plan,
          indications,
          diagnosis,
          ai_summary,
          ai_summary_sent_at
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

  const parsed = parseOrThrow(createPatientSchema, formData)

  const { data, error } = await supabase
    .from('patients')
    .insert({
      professional_id: professional.id,
      name: parsed.name,
      phone: parsed.phone,
      email: parsed.email ?? null,
      notes: parsed.notes ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  void logAuditEvent({
    professionalId: professional.id,
    userId: user.id,
    action: 'patient.created',
    resourceType: 'patient',
    resourceId: data.id,
    metadata: { name: parsed.name },
  })

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

  return data as Patient
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

  const parsed = parseOrThrow(updatePatientSchema, formData)

  const { error } = await supabase
    .from('patients')
    .update({
      name: parsed.name,
      phone: parsed.phone,
      email: parsed.email ?? null,
      notes: parsed.notes ?? null,
    })
    .eq('id', patientId)
    .eq('professional_id', professional.id)

  if (error) throw new Error(error.message)

  revalidatePath('/pacientes')
}

/**
 * Patients without any appointment in the last N days.
 * Max 10.
 */
export async function getInactivePatients(daysSinceLastVisit = 60): Promise<{ id: string; name: string; lastVisit: string | null }[]> {
  const supabase = await createClient()
  const professional = await getProfessionalSafe()
  if (!professional) return []

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysSinceLastVisit)

  // Fetch all patients and their latest completed appointment
  const { data: patients } = await supabase
    .from('patients')
    .select('id, name')
    .eq('professional_id', professional.id)

  if (!patients || patients.length === 0) return []

  const { data: appointments } = await supabase
    .from('appointments')
    .select('patient_id, start_at')
    .eq('professional_id', professional.id)
    .eq('status', 'completed')
    .order('start_at', { ascending: false })

  const lastVisitMap = new Map<string, string>()
  for (const apt of appointments ?? []) {
    if (apt.patient_id && !lastVisitMap.has(apt.patient_id)) {
      lastVisitMap.set(apt.patient_id, apt.start_at)
    }
  }

  return patients
    .map((p) => ({
      id: p.id,
      name: p.name,
      lastVisit: lastVisitMap.get(p.id) ?? null,
    }))
    .filter((p) => {
      if (!p.lastVisit) return true // never visited
      return new Date(p.lastVisit) < cutoff
    })
    .sort((a, b) => {
      if (!a.lastVisit) return -1
      if (!b.lastVisit) return 1
      return new Date(a.lastVisit).getTime() - new Date(b.lastVisit).getTime()
    })
    .slice(0, 10)
}
