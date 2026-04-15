'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getProfessional } from './professional'
import { createNotification } from './notifications'
import { generateConsultationSummary } from '@/lib/ai'
import { sendSummaryEmail } from '@/lib/email'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export async function saveConsultationNotes(params: {
  appointmentId: string
  reason: string
  treatment: string
  observations: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) throw new Error('Profesional no encontrado')

  // Verifica que el turno pertenece al profesional
  const { data: apt, error: aptError } = await supabase
    .from('appointments')
    .select('id, status')
    .eq('id', params.appointmentId)
    .eq('professional_id', professional.id)
    .single()

  if (aptError || !apt) throw new Error('Turno no encontrado')

  // Upsert de las notas (puede editarse)
  const { data: notes, error } = await supabase
    .from('consultation_notes')
    .upsert({
      appointment_id: params.appointmentId,
      reason: params.reason || null,
      treatment: params.treatment || null,
      observations: params.observations || null,
    }, {
      onConflict: 'appointment_id'
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Marca el turno como completado si no lo estaba
  if (apt.status !== 'completed') {
    await supabase
      .from('appointments')
      .update({ status: 'completed' })
      .eq('id', params.appointmentId)
  }

  revalidatePath('/agenda')
  revalidatePath('/pacientes')
  revalidatePath('/dashboard')

  return notes
}

export async function generateSummary(consultationNoteId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) throw new Error('Profesional no encontrado')

  // Obtiene las notas con datos del paciente y turno
  const { data: note, error } = await supabase
    .from('consultation_notes')
    .select(`
      id, reason, treatment, observations,
      appointments (
        id, start_at,
        patients (id, name, email)
      )
    `)
    .eq('id', consultationNoteId)
    .single()

  if (error || !note) throw new Error('Notas no encontradas')

  const apt = note.appointments as unknown as {
    id: string
    start_at: string
    patients: { id: string; name: string; email: string | null } | null
  } | null

  if (!apt?.patients) throw new Error('Datos del paciente no encontrados')

  // Genera el resumen con IA
  const summaryContent = await generateConsultationSummary({
    specialty: professional.specialty,
    reason: note.reason,
    treatment: note.treatment,
    observations: note.observations,
    patientName: apt.patients.name.split(' ')[0], // Solo el primer nombre
  })

  // Guarda o actualiza el resumen generado
  const { data: summary, error: summaryError } = await supabase
    .from('generated_summaries')
    .upsert({
      consultation_note_id: consultationNoteId,
      content: summaryContent,
      edited_content: null, // reset si se regenera
      sent_at: null,
    }, {
      onConflict: 'consultation_note_id'
    })
    .select()
    .single()

  if (summaryError) throw new Error(summaryError.message)

  revalidatePath('/pacientes')
  return summary
}

export async function updateSummary(summaryId: string, editedContent: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('generated_summaries')
    .update({ edited_content: editedContent })
    .eq('id', summaryId)

  if (error) throw new Error(error.message)

  revalidatePath('/pacientes')
}

export async function sendSummary(summaryId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) throw new Error('Profesional no encontrado')

  // Obtiene el resumen con todos los datos necesarios
  const { data: summary, error } = await supabase
    .from('generated_summaries')
    .select(`
      id, content, edited_content, sent_at,
      consultation_notes (
        appointment_id,
        appointments (
          start_at,
          patients (name, email)
        )
      )
    `)
    .eq('id', summaryId)
    .single()

  if (error || !summary) throw new Error('Resumen no encontrado')

  if (summary.sent_at) throw new Error('Este resumen ya fue enviado')

  const note = summary.consultation_notes as unknown as {
    appointment_id: string
    appointments: {
      start_at: string
      patients: { name: string; email: string | null } | null
    } | null
  } | null

  if (!note?.appointments?.patients?.email) {
    throw new Error('El paciente no tiene email registrado')
  }

  const contentToSend = summary.edited_content ?? summary.content
  const appointmentDate = format(
    new Date(note.appointments.start_at),
    "d 'de' MMMM 'de' yyyy",
    { locale: es }
  )

  await sendSummaryEmail({
    to: note.appointments.patients.email,
    patientName: note.appointments.patients.name,
    professionalName: professional.name,
    specialty: professional.specialty,
    appointmentDate,
    summaryContent: contentToSend,
  })

  // Marca como enviado
  await supabase
    .from('generated_summaries')
    .update({ sent_at: new Date().toISOString() })
    .eq('id', summaryId)

  // Registra en messages
  await supabase.from('messages').insert({
    appointment_id: note.appointment_id,
    professional_id: professional.id,
    type: 'summary',
    channel: 'email',
    status: 'sent',
    recipient: note.appointments.patients.email,
    sent_at: new Date().toISOString(),
  })

  // Notify professional (best-effort)
  try {
    await createNotification({
      professionalId: professional.id,
      type: 'summary_sent',
      title: `Resumen enviado a ${note.appointments.patients.name}`,
      actionUrl: '/pacientes',
    })
  } catch {
    // best-effort
  }

  revalidatePath('/pacientes')
  revalidatePath('/agenda')
}
