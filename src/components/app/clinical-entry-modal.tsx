'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { RefreshCw, Send, Loader2, Plus, Trash2, MessageCircle, AlertTriangle, Paperclip } from 'lucide-react'
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
import { useAutoSave } from '@/lib/hooks/use-auto-save'
import { AutoSaveIndicator } from '@/components/app/auto-save-indicator'
import { findTemplateForSpecialty } from '@/lib/utils/clinical-templates'
import { FileUploadZone } from '@/components/app/file-upload-zone'
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

const EMPTY_FORM: ClinicalForm = {
  chiefComplaint: '',
  clinicalHistory: '',
  physicalExam: '',
  diagnosis: '',
  treatmentPlan: '',
  medications: [],
  indications: '',
  nextSteps: '',
}

export function ClinicalEntryModal({
  appointment,
  open,
  onClose,
  specialty,
}: {
  appointment: AppointmentWithRelations
  open: boolean
  onClose: () => void
  specialty?: string
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
  const patientPhone = appointment.patients?.phone ?? null
  const patientId = appointment.patients?.id ?? ''
  const template = findTemplateForSpecialty(specialty ?? '')
  const ph = template.placeholders
  const dateStr = format(new Date(appointment.start_at), "EEEE d 'de' MMMM", { locale: es })
  const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ClinicalForm>({
    defaultValues: EMPTY_FORM,
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'medications',
  })

  // Live form snapshot for auto-save. Using useWatch instead of watch() to
  // avoid the known react-compiler incompatibility.
  // eslint-disable-next-line react-hooks/incompatible-library
  const watched = useWatch({ control }) as Partial<ClinicalForm>
  const formSnapshot = useMemo<ClinicalForm>(
    () => ({
      chiefComplaint: watched.chiefComplaint ?? '',
      clinicalHistory: watched.clinicalHistory ?? '',
      physicalExam: watched.physicalExam ?? '',
      diagnosis: watched.diagnosis ?? '',
      treatmentPlan: watched.treatmentPlan ?? '',
      medications: watched.medications ?? [],
      indications: watched.indications ?? '',
      nextSteps: watched.nextSteps ?? '',
    }),
    [watched],
  )

  // Auto-save: localStorage backup is always on. Server save only fires once
  // the required field is present (avoids validation failures on partial data).
  const canServerSave = formSnapshot.chiefComplaint.trim().length > 0
  const { status: autoSaveStatus, lastSaved, hasDraft, draft, clearDraft } = useAutoSave<ClinicalForm>({
    key: `clinical:${appointment.id}`,
    data: formSnapshot,
    enabled: open && vista === 'form' && canServerSave,
    onSave: async (data) => {
      await saveClinicalEntry({
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
    },
  })

  const [draftDismissed, setDraftDismissed] = useState(false)
  const showDraftBanner = hasDraft && !draftDismissed && vista === 'form'

  const handleRecoverDraft = () => {
    if (draft) {
      reset(draft)
      toast.success('Borrador recuperado')
    }
    setDraftDismissed(true)
  }

  const handleDiscardDraft = () => {
    clearDraft()
    setDraftDismissed(true)
  }

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
      clearDraft()

      // Generate AI summary
      setGeneratingAI(true)
      const summary = await generateClinicalSummary(entry.id)
      setSummaryContent(summary)
      setEditedSummary(summary)
      setGeneratingAI(false)
      toast.success('Resumen generado')

      // Auto-send email if patient has email
      if (patientEmail) {
        try {
          await sendClinicalSummary(entry.id)
          setSent(true)
          toast.success(`Resumen enviado automáticamente a ${patientEmail}`)
        } catch {
          // Non-blocking — user can still send manually
          toast.info('No se pudo enviar automáticamente. Podés enviarlo manualmente.')
        }
      }

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
      setDraftDismissed(false)
    }
  }, [open])

  // Confirm-before-close if the form has unsaved dirty changes.
  const handleRequestClose = () => {
    if (vista === 'form' && isDirty && autoSaveStatus !== 'saved') {
      const confirmed = confirm(
        '¿Cerrar sin guardar?\nTenés cambios sin guardar. Si los guardaste recientemente, pueden quedar en el borrador local.',
      )
      if (!confirmed) return
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleRequestClose() }}>
      <DialogContent className="max-h-[calc(100dvh-32px)] max-w-lg overflow-y-auto">
        {vista === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle>Registrar consulta — {patientName}</DialogTitle>
              <DialogDescription>{formattedDate}</DialogDescription>
            </DialogHeader>

            {showDraftBanner && (
              <div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
                <div className="flex-1">
                  <p className="font-medium text-yellow-900">Tenés un borrador sin guardar</p>
                  <p className="text-xs text-yellow-800">
                    Guardado localmente antes de cerrar el modal. ¿Querés recuperarlo?
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button type="button" size="sm" variant="default" onClick={handleRecoverDraft}>
                      Recuperar borrador
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={handleDiscardDraft}>
                      Empezar de nuevo
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* 1. Chief complaint */}
              <div className="space-y-2">
                <Label htmlFor="chiefComplaint">Motivo de consulta *</Label>
                <Textarea
                  id="chiefComplaint"
                  rows={2}
                  placeholder={ph.chiefComplaint ?? '¿Por qué vino el paciente?'}
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
                  placeholder={ph.clinicalHistory ?? 'Antecedentes que aplican a esta consulta...'}
                  {...register('clinicalHistory')}
                />
              </div>

              {/* 3. Physical exam */}
              <div className="space-y-2">
                <Label htmlFor="physicalExam">Examen físico</Label>
                <Textarea
                  id="physicalExam"
                  rows={2}
                  placeholder={ph.physicalExam ?? 'Hallazgos del examen físico...'}
                  {...register('physicalExam')}
                />
              </div>

              {/* 4. Diagnosis */}
              <div className="space-y-2">
                <Label htmlFor="diagnosis">Diagnóstico</Label>
                <Textarea
                  id="diagnosis"
                  rows={2}
                  placeholder={ph.diagnosis ?? 'Diagnóstico presuntivo o confirmado...'}
                  {...register('diagnosis')}
                />
              </div>

              {/* 5. Treatment plan */}
              <div className="space-y-2">
                <Label htmlFor="treatmentPlan">Plan de tratamiento</Label>
                <Textarea
                  id="treatmentPlan"
                  rows={3}
                  placeholder={ph.treatmentPlan ?? '¿Qué se realizó y qué se indica?'}
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
                  placeholder={ph.indications ?? 'Cuidados, restricciones, recomendaciones...'}
                  {...register('indications')}
                />
              </div>

              {/* 8. Next steps */}
              <div className="space-y-2">
                <Label htmlFor="nextSteps">Próximos pasos</Label>
                <Textarea
                  id="nextSteps"
                  rows={2}
                  placeholder={ph.nextSteps ?? 'Estudios a solicitar, próximo control...'}
                  {...register('nextSteps')}
                />
              </div>

              {/* 9. File attachments */}
              {patientId && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Paperclip className="h-4 w-4" />
                    Archivos adjuntos
                  </Label>
                  <FileUploadZone
                    patientId={patientId}
                    professionalId={appointment.professional_id}
                    clinicalEntryId={entryId ?? undefined}
                    compact
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <AutoSaveIndicator status={autoSaveStatus} lastSaved={lastSaved} />
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={handleRequestClose}>
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
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Resumen para el paciente</DialogTitle>
              <DialogDescription>
                {sent
                  ? `Resumen enviado a ${patientEmail} · Podés reenviarlo o editarlo`
                  : 'Generado con IA · Podés editarlo antes de enviar'}
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
                    variant={sent ? 'outline' : 'default'}
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
                        {sent ? 'Volver a notificar' : 'Enviar al paciente'}
                      </>
                    )}
                  </Button>

                  {patientPhone && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const cleanPhone = patientPhone.replace(/\D/g, '')
                        const phoneWithCountry = cleanPhone.startsWith('598') ? cleanPhone : `598${cleanPhone}`
                        const message = editedSummary
                          ? `Hola ${patientName.split(' ')[0]}, te envío el resumen de tu consulta:\n\n${editedSummary}`
                          : `Hola ${patientName.split(' ')[0]}, te contacto respecto a tu última consulta.`
                        window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`, '_blank')
                      }}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      WhatsApp
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
