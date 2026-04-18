'use server'

import { createClient } from '@/lib/supabase/server'
import { getProfessional } from '@/lib/actions/professional'
import { revalidatePath } from 'next/cache'
import type { IntakeFormField } from '@/lib/types/database.types'

const DEFAULT_TEMPLATES: { name: string; specialty: string | null; fields: IntakeFormField[] }[] = [
  {
    name: 'General',
    specialty: null,
    fields: [
      { id: 'f1', type: 'textarea', label: '¿Tiene algún antecedente médico relevante?', required: false },
      { id: 'f2', type: 'textarea', label: '¿Está tomando algún medicamento actualmente?', required: false },
      { id: 'f3', type: 'text', label: '¿Tiene alguna alergia conocida?', required: false },
      { id: 'f4', type: 'textarea', label: '¿Cuál es el motivo de su consulta?', required: true },
      { id: 'f5', type: 'text', label: '¿Tiene obra social? ¿Cuál?', required: false },
    ],
  },
  {
    name: 'Odontología',
    specialty: 'Odontología',
    fields: [
      { id: 'f1', type: 'text', label: '¿Cuándo fue su última visita al dentista?', required: false },
      { id: 'f2', type: 'boolean', label: '¿Tiene sensibilidad dental?', required: false },
      { id: 'f3', type: 'boolean', label: '¿Aprieta o rechina los dientes?', required: false },
      { id: 'f4', type: 'boolean', label: '¿Tiene algún problema de encías?', required: false },
      { id: 'f5', type: 'boolean', label: '¿Está tomando anticoagulantes?', required: false },
    ],
  },
  {
    name: 'Psicología',
    specialty: 'Psicología',
    fields: [
      { id: 'f1', type: 'boolean', label: '¿Ha recibido atención psicológica anteriormente?', required: false },
      { id: 'f2', type: 'text', label: '¿Tiene algún diagnóstico previo?', required: false },
      { id: 'f3', type: 'boolean', label: '¿Está tomando medicación psiquiátrica?', required: false },
      { id: 'f4', type: 'textarea', label: '¿Cuál es el motivo principal por el que buscó consulta?', required: true },
      { id: 'f5', type: 'text', label: '¿Cómo se enteró de este profesional?', required: false },
    ],
  },
]

export async function getIntakeTemplates() {
  const supabase = await createClient()
  const professional = await getProfessional()
  if (!professional) return []

  const { data } = await supabase
    .from('intake_form_templates')
    .select('*')
    .eq('professional_id', professional.id)
    .order('created_at')

  return data ?? []
}

export async function ensureDefaultTemplates() {
  const supabase = await createClient()
  const professional = await getProfessional()
  if (!professional) return

  const { count } = await supabase
    .from('intake_form_templates')
    .select('id', { count: 'exact', head: true })
    .eq('professional_id', professional.id)

  if ((count ?? 0) > 0) return

  for (const t of DEFAULT_TEMPLATES) {
    await supabase.from('intake_form_templates').insert({
      professional_id: professional.id,
      name: t.name,
      specialty: t.specialty,
      fields: t.fields as unknown as IntakeFormField[],
    })
  }
}

export async function sendIntakeForm(input: {
  templateId: string
  patientId: string
  appointmentId?: string
}) {
  const supabase = await createClient()
  const professional = await getProfessional()
  if (!professional) throw new Error('No autorizado')

  const { data: response, error } = await supabase
    .from('intake_form_responses')
    .insert({
      template_id: input.templateId,
      patient_id: input.patientId,
      appointment_id: input.appointmentId ?? null,
    })
    .select('token')
    .single()

  if (error) throw new Error(error.message)

  // Get patient email for sending
  const { data: patient } = await supabase
    .from('patients')
    .select('email, name')
    .eq('id', input.patientId)
    .single()

  if (patient?.email) {
    // TODO: Send email with form link
    // For now, return the token/URL
  }

  revalidatePath('/agenda')
  return {
    token: response.token,
    url: `/formulario/${response.token}`,
  }
}

export async function getIntakeFormByToken(token: string) {
  const supabase = await createClient()

  const { data: response } = await supabase
    .from('intake_form_responses')
    .select('*, intake_form_templates(name, fields)')
    .eq('token', token)
    .single()

  return response
}

export async function submitIntakeForm(token: string, responses: Record<string, unknown>) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('intake_form_responses')
    .update({
      responses,
      completed_at: new Date().toISOString(),
    })
    .eq('token', token)
    .is('completed_at', null)

  if (error) throw new Error(error.message)
  return { success: true }
}

export async function getPatientIntakeResponses(patientId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('intake_form_responses')
    .select('*, intake_form_templates(name)')
    .eq('patient_id', patientId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })

  return data ?? []
}
