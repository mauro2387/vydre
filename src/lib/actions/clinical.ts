'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getProfessional } from './professional'
import { generateConsultationSummary } from '@/lib/ai'
import { sendSummaryEmail } from '@/lib/email'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  saveClinicalEntrySchema,
  updatePatientClinicalDataSchema,
  addMedicationSchema,
  uuidSchema,
  parseOrThrow,
} from '@/lib/validation/schemas'
import type { MedicationEntry, ClinicalEntry, PatientMedication, Patient, Json } from '@/lib/types/database.types'

type ClinicalEntryWithAppointment = ClinicalEntry & {
  appointments: { start_at: string; status: string } | null
}

type ClinicalEntryWithPatient = ClinicalEntry & {
  appointments: { start_at: string; end_at: string } | null
  patients: { id: string; name: string; email: string | null; phone: string } | null
}

type ClinicalEntryWithAppointmentPatient = ClinicalEntry & {
  appointments:
    | {
        start_at: string
        status: string
        patients: { name: string; email: string | null } | null
      }
    | null
}

// Obtiene todas las consultas del profesional (para la vista de consultas)
export async function getAllConsultations(search?: string): Promise<ClinicalEntryWithPatient[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) return []

  const { data, error } = await supabase
    .from('clinical_entries')
    .select(`
      *,
      appointments (start_at, end_at),
      patients (id, name, email, phone)
    `)
    .eq('professional_id', professional.id)
    .order('created_at', { ascending: false })
    .returns<ClinicalEntryWithPatient[]>()

  if (error) return []

  if (!search) return data ?? []

  const term = search.toLowerCase()
  return (data ?? []).filter(entry => {
    const patientName = entry.patients?.name?.toLowerCase() ?? ''
    const complaint = entry.chief_complaint?.toLowerCase() ?? ''
    const diagnosis = entry.diagnosis?.toLowerCase() ?? ''
    const dateStr = entry.appointments?.start_at
      ? format(new Date(entry.appointments.start_at), "d 'de' MMMM yyyy", { locale: es }).toLowerCase()
      : ''
    return patientName.includes(term) || complaint.includes(term) || diagnosis.includes(term) || dateStr.includes(term)
  })
}

// Re-envía el resumen de una consulta
export async function resendClinicalSummary(entryId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) throw new Error('Profesional no encontrado')

  const id = parseOrThrow(uuidSchema, entryId)
  const entry = await getClinicalEntry(id)
  if (!entry) throw new Error('Entrada clínica no encontrada')

  const apt = entry.appointments

  if (!apt?.patients?.email) {
    throw new Error('El paciente no tiene email registrado')
  }

  const contentToSend = entry.ai_summary
  if (!contentToSend) {
    throw new Error('No hay resumen generado para enviar')
  }

  const appointmentDate = format(
    new Date(apt.start_at),
    "d 'de' MMMM 'de' yyyy",
    { locale: es }
  )

  // Log as pending in messages
  const { data: msg } = await supabase
    .from('messages')
    .insert({
      appointment_id: entry.appointment_id,
      professional_id: professional.id,
      type: 'summary',
      channel: 'email',
      status: 'pending',
      recipient: apt.patients.email,
    })
    .select('id')
    .single()

  try {
    await sendSummaryEmail({
      to: apt.patients.email,
      patientName: apt.patients.name,
      professionalName: professional.name,
      specialty: professional.specialty,
      appointmentDate,
      summaryContent: contentToSend,
    })

    await supabase
      .from('clinical_entries')
      .update({ ai_summary_sent_at: new Date().toISOString() })
      .eq('id', id)

    if (msg?.id) {
      await supabase
        .from('messages')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', msg.id)
    }
  } catch (err) {
    if (msg?.id) {
      const errMsg = err instanceof Error ? err.message : 'unknown'
      await supabase
        .from('messages')
        .update({ status: 'failed', error: errMsg })
        .eq('id', msg.id)
    }
    throw err
  }

  revalidatePath('/consultas')
  revalidatePath('/pacientes')
}

// Obtiene la ficha clínica completa del paciente
export async function getPatientClinicalRecord(patientId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) return null

  const [patientResult, entriesResult, medicationsResult] =
    await Promise.all([
      supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .eq('professional_id', professional.id)
        .single(),
      supabase
        .from('clinical_entries')
        .select(`
          *,
          appointments (start_at, status)
        `)
        .eq('patient_id', patientId)
        .eq('professional_id', professional.id)
        .order('created_at', { ascending: false })
        .returns<ClinicalEntryWithAppointment[]>(),
      supabase
        .from('patient_medications')
        .select('*')
        .eq('patient_id', patientId)
        .eq('professional_id', professional.id)
        .order('active', { ascending: false })
        .order('created_at', { ascending: false })
    ])

  if (patientResult.error) return null

  return {
    patient: patientResult.data as Patient,
    entries: (entriesResult.data ?? []) as ClinicalEntryWithAppointment[],
    medications: (medicationsResult.data ?? []) as PatientMedication[],
  }
}

// Obtiene una entrada clínica específica
export async function getClinicalEntry(
  entryId: string,
): Promise<ClinicalEntryWithAppointmentPatient | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) return null

  const { data, error } = await supabase
    .from('clinical_entries')
    .select('*, appointments(start_at, status, patients(name, email))')
    .eq('id', entryId)
    .eq('professional_id', professional.id)
    .single()
    .returns<ClinicalEntryWithAppointmentPatient>()

  if (error) return null
  return data
}

// Crea o actualiza una entrada clínica
export async function saveClinicalEntry(params: {
  appointmentId: string
  patientId: string
  templateType: string
  chiefComplaint?: string
  clinicalHistory?: string
  physicalExam?: string
  diagnosis?: string
  treatmentPlan?: string
  medications?: MedicationEntry[]
  indications?: string
  nextSteps?: string
  specialtyData?: Record<string, unknown>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) throw new Error('Profesional no encontrado')

  const parsed = parseOrThrow(saveClinicalEntrySchema, params)

  // Verifica que el turno pertenece al profesional
  const { data: apt, error: aptError } = await supabase
    .from('appointments')
    .select('id, status, patient_id')
    .eq('id', parsed.appointmentId)
    .eq('professional_id', professional.id)
    .single()

  if (aptError || !apt) throw new Error('Turno no encontrado')
  if (apt.patient_id !== parsed.patientId) {
    throw new Error('El paciente no corresponde al turno')
  }

  const { data: entry, error } = await supabase
    .from('clinical_entries')
    .upsert({
      appointment_id: parsed.appointmentId,
      patient_id: parsed.patientId,
      professional_id: professional.id,
      template_type: parsed.templateType,
      chief_complaint: parsed.chiefComplaint ?? null,
      clinical_history: parsed.clinicalHistory ?? null,
      physical_exam: parsed.physicalExam ?? null,
      diagnosis: parsed.diagnosis ?? null,
      treatment_plan: parsed.treatmentPlan ?? null,
      medications: (parsed.medications ?? []) as unknown as Json,
      indications: parsed.indications ?? null,
      next_steps: parsed.nextSteps ?? null,
      specialty_data: (parsed.specialtyData ?? {}) as unknown as Json,
    }, { onConflict: 'appointment_id' })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Marca el turno como completado
  if (apt.status !== 'completed') {
    await supabase
      .from('appointments')
      .update({ status: 'completed' })
      .eq('id', parsed.appointmentId)
  }

  // Auto-generate AI summary if not present yet (audit finding A1).
  // Best-effort: failures are logged but do not fail the save.
  if (entry && !entry.ai_summary) {
    try {
      const { data: patientRow } = await supabase
        .from('patients')
        .select('name')
        .eq('id', parsed.patientId)
        .single()

      const summary = await generateConsultationSummary({
        specialty: professional.specialty,
        reason: parsed.chiefComplaint ?? null,
        treatment: parsed.treatmentPlan ?? null,
        observations: [parsed.diagnosis, parsed.indications, parsed.nextSteps]
          .filter(Boolean).join(' | '),
        patientName: patientRow?.name?.split(' ')[0] ?? 'paciente',
        diagnosis: parsed.diagnosis ?? null,
        indications: parsed.indications ?? null,
      })

      await supabase
        .from('clinical_entries')
        .update({ ai_summary: summary })
        .eq('id', entry.id)
    } catch (aiErr) {
      console.error('[ai-summary] generation failed for entry', entry.id, aiErr)
    }
  }

  revalidatePath('/agenda')
  revalidatePath('/pacientes')
  revalidatePath('/dashboard')
  revalidatePath('/consultas')

  return entry
}

// Actualiza la ficha del paciente (datos clínicos base)
export async function updatePatientClinicalData(
  patientId: string,
  data: {
    blood_type?: string | null
    allergies?: string[]
    chronic_conditions?: string[]
    current_medications?: string[]
    emergency_contact_name?: string
    emergency_contact_phone?: string
    insurance_provider?: string
    insurance_number?: string
    occupation?: string
    clinical_notes?: string
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) throw new Error('Profesional no encontrado')

  const parsed = parseOrThrow(updatePatientClinicalDataSchema, data)

  const { error } = await supabase
    .from('patients')
    .update(parsed)
    .eq('id', patientId)
    .eq('professional_id', professional.id)

  if (error) throw new Error(error.message)

  revalidatePath('/pacientes')
}

// Agrega medicamento activo al paciente
export async function addPatientMedication(
  patientId: string,
  data: {
    name: string
    dose?: string
    frequency?: string
    start_date?: string
    notes?: string
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) throw new Error('Profesional no encontrado')

  const parsed = parseOrThrow(addMedicationSchema, data)

  const { error } = await supabase
    .from('patient_medications')
    .insert({
      patient_id: patientId,
      professional_id: professional.id,
      name: parsed.name,
      dose: parsed.dose ?? null,
      frequency: parsed.frequency ?? null,
      start_date: parsed.start_date ?? null,
      notes: parsed.notes ?? null,
      active: true,
    })

  if (error) throw new Error(error.message)
  revalidatePath('/pacientes')
}

// Desactiva un medicamento
export async function deactivatePatientMedication(medicationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) throw new Error('Profesional no encontrado')

  const { error } = await supabase
    .from('patient_medications')
    .update({ active: false, end_date: new Date().toISOString().split('T')[0] })
    .eq('id', medicationId)
    .eq('professional_id', professional.id)

  if (error) throw new Error(error.message)
  revalidatePath('/pacientes')
}

// Genera resumen con IA desde una entrada clínica
export async function generateClinicalSummary(entryId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) throw new Error('Profesional no encontrado')

  const id = parseOrThrow(uuidSchema, entryId)
  const entry = await getClinicalEntry(id)
  if (!entry) throw new Error('Entrada clínica no encontrada')

  const apt = entry.appointments

  if (!apt?.patients) throw new Error('Datos del paciente no encontrados')

  const summaryContent = await generateConsultationSummary({
    specialty: professional.specialty,
    reason: entry.chief_complaint,
    treatment: entry.treatment_plan,
    observations: [
      entry.diagnosis,
      entry.indications,
      entry.next_steps,
    ].filter(Boolean).join(' | '),
    patientName: apt.patients.name.split(' ')[0],
    diagnosis: entry.diagnosis,
    indications: entry.indications,
  })

  const { error } = await supabase
    .from('clinical_entries')
    .update({
      ai_summary: summaryContent,
      ai_summary_sent_at: null,
    })
    .eq('id', id)
    .eq('professional_id', professional.id)

  if (error) throw new Error(error.message)

  revalidatePath('/pacientes')
  return summaryContent
}

// Envía el resumen al paciente
export async function sendClinicalSummary(
  entryId: string,
  customContent?: string,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) throw new Error('Profesional no encontrado')

  const id = parseOrThrow(uuidSchema, entryId)
  const entry = await getClinicalEntry(id)
  if (!entry) throw new Error('Entrada clínica no encontrada')

  const apt = entry.appointments

  if (!apt?.patients?.email) {
    throw new Error('El paciente no tiene email registrado')
  }

  const contentToSend = customContent ?? entry.ai_summary
  if (!contentToSend) {
    throw new Error('No hay resumen generado para enviar')
  }

  const appointmentDate = format(
    new Date(apt.start_at),
    "d 'de' MMMM 'de' yyyy",
    { locale: es }
  )

  // Audit log in messages
  const { data: msg } = await supabase
    .from('messages')
    .insert({
      appointment_id: entry.appointment_id,
      professional_id: professional.id,
      type: 'summary',
      channel: 'email',
      status: 'pending',
      recipient: apt.patients.email,
    })
    .select('id')
    .single()

  try {
    await sendSummaryEmail({
      to: apt.patients.email,
      patientName: apt.patients.name,
      professionalName: professional.name,
      specialty: professional.specialty,
      appointmentDate,
      summaryContent: contentToSend,
    })

    await supabase
      .from('clinical_entries')
      .update({ ai_summary_sent_at: new Date().toISOString() })
      .eq('id', id)

    if (msg?.id) {
      await supabase
        .from('messages')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', msg.id)
    }
  } catch (err) {
    if (msg?.id) {
      const errMsg = err instanceof Error ? err.message : 'unknown'
      await supabase
        .from('messages')
        .update({ status: 'failed', error: errMsg })
        .eq('id', msg.id)
    }
    throw err
  }

  revalidatePath('/pacientes')
  revalidatePath('/consultas')
}
