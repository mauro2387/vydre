'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getProfessional } from './professional'
import { generateConsultationSummary } from '@/lib/ai'
import { sendSummaryEmail } from '@/lib/email'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { MedicationEntry, ClinicalEntry, PatientMedication, Patient, Json } from '@/lib/types/database.types'

type ClinicalEntryWithAppointment = ClinicalEntry & {
  appointments: { start_at: string; status: string } | null
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
export async function getClinicalEntry(entryId: string) {
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
    .single() as unknown as {
      data: ClinicalEntry & {
        appointments: {
          start_at: string
          status: string
          patients: { name: string; email: string | null } | null
        } | null
      } | null
      error: { message: string } | null
    }

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

  // Verifica que el turno pertenece al profesional
  const { data: apt, error: aptError } = await supabase
    .from('appointments')
    .select('id, status, patient_id')
    .eq('id', params.appointmentId)
    .eq('professional_id', professional.id)
    .single()

  if (aptError || !apt) throw new Error('Turno no encontrado')
  if (apt.patient_id !== params.patientId) {
    throw new Error('El paciente no corresponde al turno')
  }

  const { data: entry, error } = await supabase
    .from('clinical_entries')
    .upsert({
      appointment_id: params.appointmentId,
      patient_id: params.patientId,
      professional_id: professional.id,
      template_type: params.templateType,
      chief_complaint: params.chiefComplaint ?? null,
      clinical_history: params.clinicalHistory ?? null,
      physical_exam: params.physicalExam ?? null,
      diagnosis: params.diagnosis ?? null,
      treatment_plan: params.treatmentPlan ?? null,
      medications: (params.medications ?? []) as unknown as Json,
      indications: params.indications ?? null,
      next_steps: params.nextSteps ?? null,
      specialty_data: (params.specialtyData ?? {}) as unknown as Json,
    }, { onConflict: 'appointment_id' })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Marca el turno como completado
  if (apt.status !== 'completed') {
    await supabase
      .from('appointments')
      .update({ status: 'completed' })
      .eq('id', params.appointmentId)
  }

  revalidatePath('/agenda')
  revalidatePath('/pacientes')
  revalidatePath('/dashboard')

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

  const { error } = await supabase
    .from('patients')
    .update(data)
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

  const { error } = await supabase
    .from('patient_medications')
    .insert({
      patient_id: patientId,
      professional_id: professional.id,
      name: data.name,
      dose: data.dose ?? null,
      frequency: data.frequency ?? null,
      start_date: data.start_date ?? null,
      notes: data.notes ?? null,
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

  const entry = await getClinicalEntry(entryId)
  if (!entry) throw new Error('Entrada clínica no encontrada')

  const apt = entry.appointments as unknown as {
    start_at: string
    status: string
    patients: { name: string; email: string | null } | null
  } | null

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
    .eq('id', entryId)
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

  const entry = await getClinicalEntry(entryId)
  if (!entry) throw new Error('Entrada clínica no encontrada')
  if (entry.ai_summary_sent_at) {
    throw new Error('El resumen ya fue enviado')
  }

  const apt = entry.appointments as unknown as {
    start_at: string
    patients: { name: string; email: string | null } | null
  } | null

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
    .eq('id', entryId)

  revalidatePath('/pacientes')
}
