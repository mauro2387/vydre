import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const { paymentId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Get professional
  const { data: prof } = await supabase
    .from('professionals')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!prof) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Get payment and verify ownership
  const { data: payment } = await supabase
    .from('payments')
    .select('receipt_storage_path, receipt_number')
    .eq('id', paymentId)
    .eq('professional_id', prof.id)
    .single()

  if (!payment) {
    return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
  }

  if (!payment.receipt_storage_path) {
    // Generate receipt first
    const { generateReceipt } = await import('@/lib/actions/receipts')
    await generateReceipt(paymentId)

    // Re-fetch
    const { data: updated } = await supabase
      .from('payments')
      .select('receipt_storage_path, receipt_number')
      .eq('id', paymentId)
      .single()

    if (!updated?.receipt_storage_path) {
      return NextResponse.json({ error: 'Error generando recibo' }, { status: 500 })
    }

    payment.receipt_storage_path = updated.receipt_storage_path
    payment.receipt_number = updated.receipt_number
  }

  // Download PDF from storage
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: pdfData, error } = await serviceClient
    .storage
    .from('patient-files')
    .download(payment.receipt_storage_path)

  if (error || !pdfData) {
    return NextResponse.json({ error: 'Error descargando el recibo' }, { status: 500 })
  }

  const buffer = await pdfData.arrayBuffer()
  const filename = `recibo-${payment.receipt_number ?? paymentId}.pdf`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
