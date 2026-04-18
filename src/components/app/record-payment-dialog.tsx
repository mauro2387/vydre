'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
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
  suggestedAmount,
  onRecorded,
}: {
  open: boolean
  onClose: () => void
  appointmentId?: string | null
  patientId?: string | null
  patientName?: string
  suggestedAmount?: number
  onRecorded?: () => void
}) {
  const [amount, setAmount] = useState<string>(suggestedAmount ? String(suggestedAmount) : '')
  const [method, setMethod] = useState<Method>('cash')
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = Number(amount)
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error('Ingresá un monto válido')
      return
    }

    startTransition(async () => {
      try {
        await recordPayment({
          appointment_id: appointmentId ?? null,
          patient_id: patientId ?? null,
          amount: parsed,
          currency: 'ARS',
          method,
          status: 'paid',
          notes: notes.trim() || null,
        })
        toast.success('Cobro registrado')
        onRecorded?.()
        onClose()
        setAmount('')
        setNotes('')
        setMethod('cash')
      } catch (err) {
        toast.error(parseActionError(err))
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar cobro</DialogTitle>
          <DialogDescription>
            {patientName ? `Paciente: ${patientName}` : 'Ingresá los datos del cobro.'}
          </DialogDescription>
        </DialogHeader>

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
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
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
      </DialogContent>
    </Dialog>
  )
}
