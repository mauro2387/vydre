'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { RefreshCw, Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  saveConsultationNotes,
  generateSummary,
  updateSummary,
  sendSummary,
} from '@/lib/actions/consultation'
import { parseActionError } from '@/lib/utils/error-messages'
import type { AppointmentWithRelations, GeneratedSummary } from '@/lib/types/database.types'

type NotesForm = {
  reason: string
  treatment: string
  observations: string
}

export function PostConsultationModal({
  appointment,
  open,
  onClose,
}: {
  appointment: AppointmentWithRelations
  open: boolean
  onClose: () => void
}) {
  const [vista, setVista] = useState<'notes' | 'summary'>('notes')
  const [savingNotes, setSavingNotes] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [summary, setSummary] = useState<GeneratedSummary | null>(null)

  const patientName = appointment.patients?.name ?? 'Paciente'
  const patientEmail = appointment.patients?.email ?? null
  const dateStr = format(new Date(appointment.start_at), "EEEE d 'de' MMMM", { locale: es })
  const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  const { register, handleSubmit, formState: { errors } } = useForm<NotesForm>({
    defaultValues: {
      reason: '',
      treatment: '',
      observations: '',
    },
  })

  const onSubmitNotes = async (data: NotesForm) => {
    try {
      setSavingNotes(true)
      const notes = await saveConsultationNotes({
        appointmentId: appointment.id,
        reason: data.reason,
        treatment: data.treatment,
        observations: data.observations,
      })
      toast.success('Notas guardadas')

      setGeneratingAI(true)
      const generatedSummary = await generateSummary(notes.id)
      setSummary(generatedSummary)
      setGeneratingAI(false)
      toast.success('Resumen generado')
      setVista('summary')
    } catch (error) {
      setSavingNotes(false)
      setGeneratingAI(false)
      toast.error(parseActionError(error))
    }
  }

  const handleRegenerate = async () => {
    if (!summary) return
    try {
      setGeneratingAI(true)
      const regenerated = await generateSummary(summary.consultation_note_id)
      setSummary(regenerated)
      setEditedContent(regenerated.content)
      setGeneratingAI(false)
    } catch (error) {
      setGeneratingAI(false)
      toast.error(parseActionError(error))
    }
  }

  const handleSend = async () => {
    if (!summary) return
    const confirmed = confirm(
      `¿Enviar el resumen a ${patientEmail}?`
    )
    if (!confirmed) return

    try {
      setSending(true)
      await sendSummary(summary.id)
      toast.success(`Resumen enviado a ${patientEmail}`)
      onClose()
    } catch (error) {
      setSending(false)
      toast.error(parseActionError(error))
    }
  }

  // Summary editing state
  const [editedContent, setEditedContent] = useState('')
  const [showSaved, setShowSaved] = useState(false)
  const [sending, setSending] = useState(false)
  const originalContent = summary?.content ?? ''

  // Set initial content when summary loads
  useEffect(() => {
    if (summary) {
      setEditedContent(summary.edited_content ?? summary.content)
    }
  }, [summary])

  // Auto-save debounce
  useEffect(() => {
    if (!summary) return
    if (editedContent === originalContent) return
    const timer = setTimeout(() => {
      updateSummary(summary.id, editedContent)
        .then(() => setShowSaved(true))
        .then(() => setTimeout(() => setShowSaved(false), 2000))
    }, 1000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only trigger on editedContent changes
  }, [editedContent])

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="max-w-lg">
        {vista === 'notes' ? (
          <>
            <DialogHeader>
              <DialogTitle>Registrar consulta — {patientName}</DialogTitle>
              <DialogDescription>{formattedDate}</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmitNotes)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo de consulta</Label>
                <Textarea
                  id="reason"
                  rows={3}
                  placeholder="¿Por qué vino el paciente?"
                  {...register('reason', { required: 'El motivo es requerido' })}
                />
                {errors.reason && (
                  <p className="text-sm text-destructive">{errors.reason.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="treatment">Tratamiento / procedimiento</Label>
                <Textarea
                  id="treatment"
                  rows={4}
                  placeholder="¿Qué se realizó durante la consulta?"
                  {...register('treatment', { required: 'El tratamiento es requerido' })}
                />
                {errors.treatment && (
                  <p className="text-sm text-destructive">{errors.treatment.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observaciones adicionales</Label>
                <Textarea
                  id="observations"
                  rows={3}
                  placeholder="Indicaciones, próximos pasos, notas internas..."
                  {...register('observations')}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={savingNotes || generatingAI}>
                  {savingNotes ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando notas...
                    </>
                  ) : generatingAI ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generando resumen con IA...
                    </>
                  ) : (
                    'Guardar y generar resumen →'
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Resumen para el paciente</DialogTitle>
              <DialogDescription>
                Generado con IA · Podés editarlo antes de enviar
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  rows={10}
                  disabled={generatingAI}
                />
                {showSaved && (
                  <p className="text-xs text-muted-foreground">Guardado</p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVista('notes')}
                >
                  ← Volver a las notas
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={generatingAI}
                  >
                    {generatingAI ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Regenerando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Regenerar resumen
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleSend}
                    disabled={!patientEmail || sending}
                    title={!patientEmail ? 'El paciente no tiene email registrado' : undefined}
                  >
                    {sending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Enviar al paciente
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
