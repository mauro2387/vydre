'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, FileText, Download, Send, CheckCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { recordPayment } from '@/lib/actions/payments'
import { generateReceipt, sendReceiptByEmail } from '@/lib/actions/receipts'
import { parseActionError } from '@/lib/utils/error-messages'

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  mercadopago: 'MercadoPago',
  other: 'Otro',
}

type Method = 'cash' | 'transfer' | 'card' | 'mercadopago' | 'other'

export function RecordPaymentDialog({
  open,
  onClose,
  appointmentId,
  patientId,
  patientName,
  patientEmail,
  suggestedAmount,
  onRecorded,
  existingPaymentId,
  existingReceiptNumber,
  existingReceiptGeneratedAt,
}: {
  open: boolean
  onClose: () => void
  appointmentId?: string | null
  patientId?: string | null
  patientName?: string
  patientEmail?: string | null
  suggestedAmount?: number
  onRecorded?: () => void
  existingPaymentId?: string | null
  existingReceiptNumber?: string | null
  existingReceiptGeneratedAt?: string | null
}) {
  const [amount, setAmount] = useState<string>(suggestedAmount ? String(suggestedAmount) : '')
  const [method, setMethod] = useState<Method>('cash')
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()

  // Receipt state
  const [paymentId, setPaymentId] = useState<string | null>(existingPaymentId ?? null)
  const [receiptGenerated, setReceiptGenerated] = useState(!!existingReceiptNumber)
  const [receiptNumber, setReceiptNumber] = useState<string | null>(existingReceiptNumber ?? null)
  const [generatingReceipt, setGeneratingReceipt] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [paymentRecorded, setPaymentRecorded] = useState(!!existingPaymentId)

  function resetState() {
    setAmount('')
    setNotes('')
    setMethod('cash')
    setPaymentId(null)
    setReceiptGenerated(false)
    setReceiptNumber(null)
    setGeneratingReceipt(false)
    setSendingEmail(false)
    setEmailSent(false)
    setPaymentRecorded(false)
  }

  function handleClose() {
    onClose()
    resetState()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = Number(amount)
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error('Ingresá un monto válido')
      return
    }

    startTransition(async () => {
      try {
        const result = await recordPayment({
          appointment_id: appointmentId ?? null,
          patient_id: patientId ?? null,
          amount: parsed,
          currency: 'ARS',
          method,
          status: 'paid',
          notes: notes.trim() || null,
        })
        toast.success('Cobro registrado')
        setPaymentId(result.id)
        setPaymentRecorded(true)
        onRecorded?.()
      } catch (err) {
        toast.error(parseActionError(err))
      }
    })
  }

  async function handleGenerateReceipt() {
    if (!paymentId) return
    setGeneratingReceipt(true)
    try {
      const result = await generateReceipt(paymentId)
      setReceiptGenerated(true)
      setReceiptNumber(result.receiptNumber)
      toast.success('Recibo generado')
    } catch (err) {
      toast.error(parseActionError(err))
    } finally {
      setGeneratingReceipt(false)
    }
  }

  function handleDownload() {
    if (!paymentId) return
    window.open(`/api/receipts/${paymentId}`, '_blank')
  }

  async function handleSendEmail() {
    if (!paymentId) return
    setSendingEmail(true)
    try {
      await sendReceiptByEmail(paymentId)
      setEmailSent(true)
      toast.success(`Recibo enviado a ${patientEmail}`)
    } catch (err) {
      toast.error(parseActionError(err))
    } finally {
      setSendingEmail(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {paymentRecorded ? 'Cobro registrado' : 'Registrar cobro'}
          </DialogTitle>
          <DialogDescription>
            {patientName ? `Paciente: ${patientName}` : 'Ingresá los datos del cobro.'}
          </DialogDescription>
        </DialogHeader>

        {!paymentRecorded ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Monto (ARS) *</Label>
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                autoFocus
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">Método de pago *</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as Method)}>
                <SelectTrigger id="method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(METHOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Opcional: referencia de transferencia, vuelto, etc."
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  'Registrar cobro'
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Success message */}
            <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              <CheckCircle className="h-4 w-4" />
              Pago registrado correctamente
            </div>

            {receiptNumber && (
              <p className="text-xs text-muted-foreground">
                Recibo: {receiptNumber}
                {existingReceiptGeneratedAt && (
                  <> · Generado el {new Date(existingReceiptGeneratedAt).toLocaleDateString('es-AR')}</>
                )}
              </p>
            )}

            {/* Receipt action buttons */}
            <div className="flex flex-wrap gap-2">
              {!receiptGenerated ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateReceipt}
                  disabled={generatingReceipt}
                >
                  {generatingReceipt ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generando PDF...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Generar recibo PDF
                    </>
                  )}
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Descargar
                  </Button>
                  {patientEmail ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSendEmail}
                      disabled={sendingEmail || emailSent}
                    >
                      {sendingEmail ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : emailSent ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                          Enviado
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Enviar al paciente
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      title="El paciente no tiene email registrado. Podés descargar el PDF y enviarlo manualmente."
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Enviar al paciente
                    </Button>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={handleClose}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
