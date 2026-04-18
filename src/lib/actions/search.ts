'use server'

import { createClient } from '@/lib/supabase/server'
import { getProfessional } from './professional'
import type { Patient } from '@/lib/types/database.types'

export type GlobalSearchAppointment = {
  id: string
  start_at: string
  status: string
  patients: { id: string; name: string } | null
}

export type GlobalSearchResult = {
  patients: Patient[]
  appointments: GlobalSearchAppointment[]
}

/**
 * Global search across patients and upcoming appointments.
 * Used by the Cmd+K dialog. Returns at most 5 patients and 3 appointments.
 */
export async function globalSearch(query: string): Promise<GlobalSearchResult> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return { patients: [], appointments: [] }

  const supabase = await createClient()
  const professional = await getProfessional()
  if (!professional) return { patients: [], appointments: [] }

  const nowIso = new Date().toISOString()

  const [patientsResult, upcomingResult] = await Promise.all([
    supabase
      .rpc('search_patients', { prof_id: professional.id, search_term: trimmed })
      .limit(5),
    supabase
      .from('appointments')
      .select('id, start_at, status, patients!inner(id, name)')
      .eq('professional_id', professional.id)
      .gte('start_at', nowIso)
      .ilike('patients.name', `%${trimmed}%`)
      .order('start_at', { ascending: true })
      .limit(3)
      .returns<GlobalSearchAppointment[]>(),
  ])

  return {
    patients: patientsResult.data ?? [],
    appointments: upcomingResult.data ?? [],
  }
}
