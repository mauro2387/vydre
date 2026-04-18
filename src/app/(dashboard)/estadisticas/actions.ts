'use server'

import { createClient } from '@/lib/supabase/server'
import { getProfessional } from '@/lib/actions/professional'
import { revalidatePath } from 'next/cache'

export async function markPaymentPaid(paymentId: string) {
  const supabase = await createClient()
  const professional = await getProfessional()
  if (!professional) throw new Error('No autorizado')

  const { error } = await supabase
    .from('payments')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', paymentId)
    .eq('professional_id', professional.id)

  if (error) throw new Error(error.message)
  revalidatePath('/estadisticas')
}
