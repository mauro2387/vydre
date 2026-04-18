'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getProfessional } from './professional'
import { parseOrThrow } from '@/lib/validation/schemas'

export type Payment = {
  id: string
  professional_id: string
  appointment_id: string | null
  patient_id: string | null
  amount: number
  currency: string
  method: 'cash' | 'transfer' | 'card' | 'mercadopago' | 'other'
  status: 'paid' | 'pending' | 'refunded'
  notes: string | null
  paid_at: string
  created_at: string
}

export type PaymentWithPatient = Payment & {
  patients: { id: string; name: string } | null
  appointments: { start_at: string } | null
}

const recordPaymentSchema = z.object({
  appointment_id: z.string().uuid().optional().nullable(),
  patient_id: z.string().uuid().optional().nullable(),
  amount: z.coerce.number().min(0, 'El monto no puede ser negativo'),
  currency: z.string().min(1).max(8).default('ARS'),
  method: z.enum(['cash', 'transfer', 'card', 'mercadopago', 'other']),
  status: z.enum(['paid', 'pending', 'refunded']).default('paid'),
  notes: z.string().max(500).optional().nullable(),
  paid_at: z.string().datetime().optional(),
})

export type RecordPaymentInput = z.input<typeof recordPaymentSchema>

export async function recordPayment(input: RecordPaymentInput) {
  const data = parseOrThrow(recordPaymentSchema, input)
  const supabase = await createClient()
  const professional = await getProfessional()
  if (!professional) throw new Error('Profesional no encontrado')

  const { error } = await supabase.from('payments').insert({
    professional_id: professional.id,
    appointment_id: data.appointment_id ?? null,
    patient_id: data.patient_id ?? null,
    amount: data.amount,
    currency: data.currency,
    method: data.method,
    status: data.status,
    notes: data.notes ?? null,
    paid_at: data.paid_at ?? new Date().toISOString(),
  })

  if (error) throw new Error(`Error al registrar cobro: ${error.message}`)

  revalidatePath('/agenda')
  revalidatePath('/consultas')
  revalidatePath('/configuracion')
  if (data.patient_id) revalidatePath('/pacientes')
}

export async function deletePayment(id: string) {
  const supabase = await createClient()
  const professional = await getProfessional()
  if (!professional) throw new Error('Profesional no encontrado')

  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', id)
    .eq('professional_id', professional.id)

  if (error) throw new Error(`Error al eliminar cobro: ${error.message}`)

  revalidatePath('/agenda')
  revalidatePath('/consultas')
  revalidatePath('/configuracion')
}

export async function getPaymentsForAppointment(appointmentId: string): Promise<Payment[]> {
  const supabase = await createClient()
  const professional = await getProfessional()
  if (!professional) return []

  const { data } = await supabase
    .from('payments')
    .select('*')
    .eq('professional_id', professional.id)
    .eq('appointment_id', appointmentId)
    .order('paid_at', { ascending: false })

  return (data ?? []) as Payment[]
}

export async function getPaymentsForPatient(patientId: string): Promise<Payment[]> {
  const supabase = await createClient()
  const professional = await getProfessional()
  if (!professional) return []

  const { data } = await supabase
    .from('payments')
    .select('*')
    .eq('professional_id', professional.id)
    .eq('patient_id', patientId)
    .order('paid_at', { ascending: false })

  return (data ?? []) as Payment[]
}

export type PaymentPeriodSummary = {
  total: number
  count: number
  byMethod: Record<string, { amount: number; count: number }>
  currency: string
}

/**
 * Summary for the configuración → ingresos card.
 * from/to are ISO date strings. Defaults to current month.
 */
export async function getPaymentsSummary(from?: string, to?: string): Promise<PaymentPeriodSummary> {
  const supabase = await createClient()
  const professional = await getProfessional()
  if (!professional) return { total: 0, count: 0, byMethod: {}, currency: 'ARS' }

  const now = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

  const { data } = await supabase
    .from('payments')
    .select('amount, method, currency, status')
    .eq('professional_id', professional.id)
    .eq('status', 'paid')
    .gte('paid_at', from ?? defaultFrom)
    .lte('paid_at', to ?? defaultTo)

  const payments = (data ?? []) as Pick<Payment, 'amount' | 'method' | 'currency' | 'status'>[]
  let total = 0
  const byMethod: Record<string, { amount: number; count: number }> = {}
  for (const p of payments) {
    total += Number(p.amount)
    const b = byMethod[p.method] ?? { amount: 0, count: 0 }
    b.amount += Number(p.amount)
    b.count += 1
    byMethod[p.method] = b
  }

  return {
    total,
    count: payments.length,
    byMethod,
    currency: payments[0]?.currency ?? 'ARS',
  }
}

const updateFeesSchema = z.record(z.string(), z.coerce.number().min(0))

export async function updateDefaultFees(fees: Record<string, number>) {
  const data = parseOrThrow(updateFeesSchema, fees)
  const supabase = await createClient()
  const professional = await getProfessional()
  if (!professional) throw new Error('Profesional no encontrado')

  const { error } = await supabase
    .from('professionals')
    .update({ default_fees: data })
    .eq('id', professional.id)

  if (error) throw new Error(`Error al actualizar aranceles: ${error.message}`)

  revalidatePath('/configuracion')
  revalidatePath('/agenda')
}
