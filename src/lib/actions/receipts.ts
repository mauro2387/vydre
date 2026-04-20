'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getProfessional } from './professional'
import { generateReceiptHTML } from '@/lib/receipt-template'
import { generatePDF } from '@/lib/pdf'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia bancaria',
  card: 'Tarjeta',
  mercadopago: 'MercadoPago',
  other: 'Otro',
}

export async function generateReceipt(paymentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) throw new Error('Profesional no encontrado')

  // Get payment with appointment and patient data
  const { data: payment, error } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .eq('professional_id', professional.id)
    .single()

  if (error || !payment) throw new Error('Pago no encontrado')
  if (payment.status !== 'paid') throw new Error('Solo se pueden generar recibos de pagos confirmados')

  // Get patient data if available
  let patientName = 'Paciente'
  let patientEmail: string | undefined
  if (payment.patient_id) {
    const { data: patient } = await supabase
      .from('patients')
      .select('name, email')
      .eq('id', payment.patient_id)
      .single()
    if (patient) {
      patientName = patient.name
      patientEmail = patient.email ?? undefined
    }
  }

  // Get appointment data if available
  let appointmentDate = format(new Date(payment.paid_at), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })
  let appointmentTime = format(new Date(payment.paid_at), 'HH:mm')
  if (payment.appointment_id) {
    const { data: apt } = await supabase
      .from('appointments')
      .select('start_at')
      .eq('id', payment.appointment_id)
      .single()
    if (apt) {
      appointmentDate = format(new Date(apt.start_at), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })
      appointmentTime = format(new Date(apt.start_at), 'HH:mm')
    }
  }
  appointmentDate = appointmentDate.charAt(0).toUpperCase() + appointmentDate.slice(1)

  // Generate receipt number via SQL sequence
  let receiptNumber = payment.receipt_number
  if (!receiptNumber) {
    const { data: numData } = await supabase.rpc('generate_receipt_number')
    receiptNumber = numData as string
  }

  const generatedAt = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })

  const html = generateReceiptHTML({
    receiptNumber,
    professionalName: professional.name,
    specialty: professional.specialty,
    professionalPhone: professional.phone ?? undefined,
    patientName,
    patientEmail,
    appointmentDate,
    appointmentTime,
    amount: Number(payment.amount),
    currency: payment.currency,
    paymentMethod: payment.method,
    paymentMethodLabel: PAYMENT_METHOD_LABELS[payment.method] ?? 'Efectivo',
    notes: payment.notes ?? undefined,
    generatedAt,
  })

  const pdfBuffer = await generatePDF(html)

  // Upload PDF to Supabase Storage
  const storagePath = `${professional.id}/receipts/${receiptNumber}.pdf`

  const serviceClient = getServiceClient()
  const { error: uploadError } = await serviceClient
    .storage
    .from('patient-files')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) throw new Error(`Error guardando el PDF: ${uploadError.message}`)

  // Update payment record
  await supabase
    .from('payments')
    .update({
      receipt_number: receiptNumber,
      receipt_storage_path: storagePath,
      receipt_generated_at: new Date().toISOString(),
    })
    .eq('id', paymentId)

  revalidatePath('/agenda')
  revalidatePath('/pacientes')

  return { receiptNumber, storagePath }
}

export async function getReceiptUrl(paymentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const professional = await getProfessional()
  if (!professional) return null

  const { data: payment } = await supabase
    .from('payments')
    .select('receipt_storage_path')
    .eq('id', paymentId)
    .eq('professional_id', professional.id)
    .single()

  if (!payment?.receipt_storage_path) return null

  const serviceClient = getServiceClient()
  const { data } = await serviceClient
    .storage
    .from('patient-files')
    .createSignedUrl(payment.receipt_storage_path, 3600)

  return data?.signedUrl ?? null
}

export async function sendReceiptByEmail(paymentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) throw new Error('Profesional no encontrado')

  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .eq('professional_id', professional.id)
    .single()

  if (!payment) throw new Error('Pago no encontrado')

  // Get patient email
  let patientName = 'Paciente'
  let patientEmail: string | null = null
  if (payment.patient_id) {
    const { data: patient } = await supabase
      .from('patients')
      .select('name, email')
      .eq('id', payment.patient_id)
      .single()
    if (patient) {
      patientName = patient.name
      patientEmail = patient.email
    }
  }

  if (!patientEmail) throw new Error('El paciente no tiene email registrado')

  // Generate receipt if not yet generated
  if (!payment.receipt_storage_path) {
    await generateReceipt(paymentId)
  }

  // Re-fetch updated payment to get storage path
  const { data: updatedPayment } = await supabase
    .from('payments')
    .select('receipt_storage_path, receipt_number')
    .eq('id', paymentId)
    .single()

  if (!updatedPayment?.receipt_storage_path) throw new Error('Error obteniendo el recibo')

  // Download PDF from storage
  const serviceClient = getServiceClient()
  const { data: pdfData, error: downloadError } = await serviceClient
    .storage
    .from('patient-files')
    .download(updatedPayment.receipt_storage_path)

  if (downloadError || !pdfData) throw new Error('Error obteniendo el PDF del recibo')

  const pdfBuffer = Buffer.from(await pdfData.arrayBuffer())

  // Send email via Resend
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const appointmentDate = payment.appointment_id
    ? await (async () => {
        const { data: apt } = await supabase
          .from('appointments')
          .select('start_at')
          .eq('id', payment.appointment_id!)
          .single()
        return apt
          ? format(new Date(apt.start_at), "d 'de' MMMM 'de' yyyy", { locale: es })
          : format(new Date(payment.paid_at), "d 'de' MMMM 'de' yyyy", { locale: es })
      })()
    : format(new Date(payment.paid_at), "d 'de' MMMM 'de' yyyy", { locale: es })

  await resend.emails.send({
    from: process.env.NODE_ENV === 'production'
      ? 'Vydre <recibos@vydre.com>'
      : 'onboarding@resend.dev',
    to: patientEmail,
    subject: `Recibo de consulta — ${appointmentDate}`,
    html: `
      <p>Hola ${patientName},</p>
      <p>Adjunto encontrás el comprobante de tu consulta
         del ${appointmentDate} con ${professional.name}.</p>
      <p>Cualquier consulta, respondé este email.</p>
      <br>
      <p>Vydre · vydre.com</p>
    `,
    attachments: [
      {
        filename: `recibo-${updatedPayment.receipt_number}.pdf`,
        content: pdfBuffer.toString('base64'),
      },
    ],
  })

  // Mark receipt as sent
  await supabase
    .from('payments')
    .update({ receipt_sent_at: new Date().toISOString() })
    .eq('id', paymentId)

  revalidatePath('/agenda')
  revalidatePath('/pacientes')
}

export async function getReceipts(params?: {
  patientId?: string
  limit?: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) return []

  let query = supabase
    .from('payments')
    .select('*')
    .eq('professional_id', professional.id)
    .eq('status', 'paid')
    .not('receipt_number', 'is', null)
    .order('receipt_generated_at', { ascending: false })
    .limit(params?.limit ?? 50)

  if (params?.patientId) {
    query = query.eq('patient_id', params.patientId)
  }

  const { data, error } = await query
  if (error) return []

  // Fetch patient + appointment data for each receipt
  const patientIds = [...new Set(data.map(p => p.patient_id).filter(Boolean))] as string[]
  const appointmentIds = [...new Set(data.map(p => p.appointment_id).filter(Boolean))] as string[]

  const [patientsResult, appointmentsResult] = await Promise.all([
    patientIds.length > 0
      ? supabase.from('patients').select('id, name, email').in('id', patientIds)
      : { data: [] },
    appointmentIds.length > 0
      ? supabase.from('appointments').select('id, start_at').in('id', appointmentIds)
      : { data: [] },
  ])

  const patientMap = new Map((patientsResult.data ?? []).map(p => [p.id, p]))
  const aptMap = new Map((appointmentsResult.data ?? []).map(a => [a.id, a]))

  return data.map(payment => ({
    ...payment,
    patient: payment.patient_id ? patientMap.get(payment.patient_id) ?? null : null,
    appointment: payment.appointment_id ? aptMap.get(payment.appointment_id) ?? null : null,
  }))
}

export async function getReceiptStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { total: 0, totalAmount: 0, sentCount: 0, currency: 'ARS' }

  const professional = await getProfessional()
  if (!professional) return { total: 0, totalAmount: 0, sentCount: 0, currency: 'ARS' }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

  const { data } = await supabase
    .from('payments')
    .select('amount, currency, receipt_sent_at')
    .eq('professional_id', professional.id)
    .eq('status', 'paid')
    .not('receipt_number', 'is', null)
    .gte('receipt_generated_at', monthStart)
    .lte('receipt_generated_at', monthEnd)

  const receipts = data ?? []
  const totalAmount = receipts.reduce((sum, r) => sum + Number(r.amount), 0)
  const sentCount = receipts.filter(r => r.receipt_sent_at).length

  return {
    total: receipts.length,
    totalAmount,
    sentCount,
    currency: receipts[0]?.currency ?? 'ARS',
  }
}
