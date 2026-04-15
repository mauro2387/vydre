'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { RefreshCw, Send, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  saveClinicalEntry,
  generateClinicalSummary,
  sendClinicalSummary,
} from '@/lib/actions/clinical'
import { parseActionError } from '@/lib/utils/error-messages'
import type { AppointmentWithRelations, MedicationEntry } from '@/lib/types/database.types'

type ClinicalForm = {
  chiefComplaint: string
  clinicalHistory: string
  physicalExam: string
  diagnosis: string
  treatmentPlan: string
  medications: MedicationEntry[]
  indications: string
  nextSteps: string
}

export function ClinicalEntryModal({
  appointment,
  open,
  onClose,
}: {
  appointment: AppointmentWithRelations
  open: boolean
  onClose: () => void
}) {
  const [vista, setVista] = useState<'form' | 'summary'>('form')
  const [saving, setSaving] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [summaryContent, setSummaryContent] = useState('')
  const [editedSummary, setEditedSummary] = useState('')
  const [entryId, setEntryId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const patientName = appointment.patients?.name ?? 'Paciente'
  const patientEmail = appointment.patients?.email ?? null
  const patientId = appointment.patients?.id ?? ''
  const dateStr = format(new Date(appointment.start_at), "EEEE d 'de' MMMM", { locale: es })
  const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ClinicalForm>({
    defaultValues: {
      chiefComplaint: '',
      clinicalHistory: '',
      physicalExam: '',
      diagnosis: '',
      treatmentPlan: '',
      medications: [],
      indications: '',
      nextSteps: '',
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'medications',
  })

  const onSubmit = async (data: ClinicalForm) => {
    try {
      setSaving(true)
      const entry = await saveClinicalEntry({
        appointmentId: appointment.id,
        patientId,
        templateType: 'general',
        chiefComplaint: data.chiefComplaint,
        clinicalHistory: data.clinicalHistory || undefined,
        physicalExam: data.physicalExam || undefined,
        diagnosis: data.diagnosis || undefined,
        treatmentPlan: data.treatmentPlan || undefined,
        medications: data.medications.filter((m) => m.name.trim()),
        indications: data.indications || undefined,
        nextSteps: data.nextSteps || undefined,
      })
      setEntryId(entry.id)
      toast.success('Entrada clínica guardada')

      // Generate AI summary
      setGeneratingAI(true)
      const summary = await generateClinicalSummary(entry.id)
      setSummaryContent(summary)
      setEditedSummary(summary)
      setGeneratingAI(false)
      toast.success('Resumen generado')
      setVista('summary')
    } catch (error) {
      toast.error(parseActionError(error))
    } finally {
      setSaving(false)
      setGeneratingAI(false)
    }
  }

  const handleRegenerate = async () => {
    if (!entryId) return
    try {
      setGeneratingAI(true)
      const summary = await generateClinicalSummary(entryId)
      setSummaryContent(summary)
      setEditedSummary(summary)
      toast.success('Resumen regenerado')
    } catch (error) {
      toast.error(parseActionError(error))
    } finally {
      setGeneratingAI(false)
    }
  }

  const handleSend = async () => {
    if (!entryId) return
    const confirmed = confirm(`¿Enviar el resumen a ${patientEmail}?`)
    if (!confirmed) return

    try {
      setSending(true)
      await sendClinicalSummary(
        entryId,
        editedSummary !== summaryContent ? editedSummary : undefined,
      )
      toast.success(`Resumen enviado a ${patientEmail}`)
      setSent(true)
      onClose()
    } catch (error) {
      toast.error(parseActionError(error))
    } finally {
      setSending(false)
    }
  }

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setVista('form')
      setSummaryContent('')
      setEditedSummary('')
      setEntryId(null)
      setSent(false)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        {vista === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle>Registrar consulta — {patientName}</DialogTitle>
              <DialogDescription>{formattedDate}</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* 1. Chief complaint */}
              <div className="space-y-2">
                <Label htmlFor="chiefComplaint">Motivo de consulta *</Label>
                <Textarea
                  id="chiefComplaint"
                  rows={2}
                  placeholder="¿Por qué vino el paciente?"
                  {...register('chiefComplaint', { required: 'El motivo es requerido' })}
                />
                {errors.chiefComplaint && (
                  <p className="text-sm text-destructive">{errors.chiefComplaint.message}</p>
                )}
              </div>

              {/* 2. Clinical history */}
              <div className="space-y-2">
                <Label htmlFor="clinicalHistory">Antecedentes relevantes</Label>
                <Textarea
                  id="clinicalHistory"
                  rows={2}
                  placeholder="Antecedentes que aplican a esta consulta..."
                  {...register('clinicalHistory')}
                />
              </div>

              {/* 3. Physical exam */}
              <div className="space-y-2">
                <Label htmlFor="physicalExam">Examen físico</Label>
                <Textarea
                  id="physicalExam"
                  rows={2}
                  placeholder="Hallazgos del examen físico..."
                  {...register('physicalExam')}
                />
              </div>

              {/* 4. Diagnosis */}
              <div className="space-y-2">
                <Label htmlFor="diagnosis">Diagnóstico</Label>
                <Textarea
                  id="diagnosis"
                  rows={2}
                  placeholder="Diagnóstico presuntivo o confirmado..."
                  {...register('diagnosis')}
                />
              </div>

              {/* 5. Treatment plan */}
              <div className="space-y-2">
                <Label htmlFor="treatmentPlan">Plan de tratamiento</Label>
                <Textarea
                  id="treatmentPlan"
                  rows={3}
                  placeholder="¿Qué se realizó y qué se indica?"
                  {...register('treatmentPlan')}
                />
              </div>

              {/* 6. Medications (dynamic) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Medicación indicada</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ name: '', dose: '', frequency: '' })}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Agregar
                  </Button>
                </div>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-2">
                    <div className="grid flex-1 gap-2 sm:grid-cols-3">
                      <Input
                        placeholder="Medicamento"
                        {...register(`medications.${index}.name`)}
                      />
                      <Input
                        placeholder="Dosis"
                        {...register(`medications.${index}.dose`)}
                      />
                      <Input
                        placeholder="Frecuencia"
                        {...register(`medications.${index}.frequency`)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="mt-0 shrink-0"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* 7. Indications */}
              <div className="space-y-2">
                <Label htmlFor="indications">Indicaciones para el paciente</Label>
                <Textarea
                  id="indications"
                  rows={2}
                  placeholder="Cuidados, restricciones, recomendaciones..."
                  {...register('indications')}
                />
              </div>

              {/* 8. Next steps */}
              <div className="space-y-2">
                <Label htmlFor="nextSteps">Próximos pasos</Label>
                <Textarea
                  id="nextSteps"
                  rows={2}
                  placeholder="Estudios a solicitar, próximo control..."
                  {...register('nextSteps')}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving || generatingAI}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
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
              <Textarea
                value={editedSummary}
                onChange={(e) => setEditedSummary(e.target.value)}
                rows={10}
                disabled={generatingAI}
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVista('form')}
                >
                  ← Volver al formulario
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
                        Regenerar
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleSend}
                    disabled={!patientEmail || sending || sent}
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
