'use client'

import { useState, useCallback, type KeyboardEvent, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Pill,
  AlertCircle,
  FileText,
  FolderOpen,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import {
  updatePatientClinicalData,
  addPatientMedication,
  deactivatePatientMedication,
} from '@/lib/actions/clinical'
import { parseActionError } from '@/lib/utils/error-messages'
import type {
  Patient,
  ClinicalEntry,
  PatientMedication,
  MedicationEntry,
} from '@/lib/types/database.types'

type Tab = 'ficha' | 'medicacion' | 'evolucion' | 'archivos'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

// ─── Main component ────────────────────────────────────────────
export function PatientClinicalRecord({
  patient,
  entries,
  medications,
}: {
  patient: Patient
  entries: (ClinicalEntry & { appointments: { start_at: string; status: string } | null })[]
  medications: PatientMedication[]
}) {
  const [tab, setTab] = useState<Tab>('ficha')

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'ficha', label: 'Ficha', icon: <FileText className="h-4 w-4" /> },
    { key: 'medicacion', label: 'Medicación', icon: <Pill className="h-4 w-4" /> },
    { key: 'evolucion', label: 'Evolución', icon: <AlertCircle className="h-4 w-4" /> },
    { key: 'archivos', label: 'Archivos', icon: <FolderOpen className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'ficha' && <TabFicha patient={patient} />}
      {tab === 'medicacion' && (
        <TabMedicacion patient={patient} medications={medications} />
      )}
      {tab === 'evolucion' && <TabEvolucion entries={entries} />}
      {tab === 'archivos' && <TabArchivos />}
    </div>
  )
}

// ─── Tag input component ───────────────────────────────────────
function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')

  const addTag = useCallback(
    (raw: string) => {
      const tag = raw.trim()
      if (tag && !value.includes(tag)) {
        onChange([...value, tag])
      }
      setInput('')
    },
    [value, onChange]
  )

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const removeTag = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx))
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-3 py-2 text-sm">
      {value.map((tag, i) => (
        <Badge key={i} variant="secondary" className="gap-1 pr-1">
          {tag}
          <button
            type="button"
            onClick={() => removeTag(i)}
            className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <input
        value={input}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input.trim()) addTag(input) }}
        placeholder={value.length === 0 ? placeholder : ''}
        className="min-w-[100px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}

// ─── Tab Ficha ─────────────────────────────────────────────────
function TabFicha({ patient }: { patient: Patient }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const [bloodType, setBloodType] = useState(patient.blood_type ?? undefined)
  const [allergies, setAllergies] = useState<string[]>(patient.allergies ?? [])
  const [conditions, setConditions] = useState<string[]>(patient.chronic_conditions ?? [])
  const [currentMeds, setCurrentMeds] = useState<string[]>(patient.current_medications ?? [])
  const [emergencyName, setEmergencyName] = useState(patient.emergency_contact_name ?? '')
  const [emergencyPhone, setEmergencyPhone] = useState(patient.emergency_contact_phone ?? '')
  const [insuranceProvider, setInsuranceProvider] = useState(patient.insurance_provider ?? '')
  const [insuranceNumber, setInsuranceNumber] = useState(patient.insurance_number ?? '')
  const [occupation, setOccupation] = useState(patient.occupation ?? '')
  const [clinicalNotes, setClinicalNotes] = useState(patient.clinical_notes ?? '')

  const handleSave = async () => {
    setSaving(true)
    try {
      await updatePatientClinicalData(patient.id, {
        blood_type: bloodType || null,
        allergies,
        chronic_conditions: conditions,
        current_medications: currentMeds,
        emergency_contact_name: emergencyName || undefined,
        emergency_contact_phone: emergencyPhone || undefined,
        insurance_provider: insuranceProvider || undefined,
        insurance_number: insuranceNumber || undefined,
        occupation: occupation || undefined,
        clinical_notes: clinicalNotes || undefined,
      })
      toast.success('Ficha actualizada')
      router.refresh()
    } catch (error) {
      toast.error(parseActionError(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Blood type + occupation */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Grupo sanguíneo</Label>
          <Select value={bloodType} onValueChange={(val) => setBloodType(val ?? undefined)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              {BLOOD_TYPES.map((bt) => (
                <SelectItem key={bt} value={bt}>{bt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Ocupación</Label>
          <Input
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            placeholder="Ej: Docente, Empleada, etc."
          />
        </div>
      </div>

      {/* Allergies */}
      <div className="space-y-2">
        <Label>Alergias</Label>
        <TagInput
          value={allergies}
          onChange={setAllergies}
          placeholder="Escribí una alergia y presioná Enter"
        />
      </div>

      {/* Chronic conditions */}
      <div className="space-y-2">
        <Label>Condiciones crónicas</Label>
        <TagInput
          value={conditions}
          onChange={setConditions}
          placeholder="Escribí una condición y presioná Enter"
        />
      </div>

      {/* Current medications */}
      <div className="space-y-2">
        <Label>Medicación actual (quick reference)</Label>
        <TagInput
          value={currentMeds}
          onChange={setCurrentMeds}
          placeholder="Escribí un medicamento y presioná Enter"
        />
      </div>

      <Separator />

      {/* Emergency contact */}
      <div>
        <h4 className="mb-3 text-sm font-semibold">Contacto de emergencia</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              placeholder="Nombre del contacto"
            />
          </div>
          <div className="space-y-2">
            <Label>Teléfono</Label>
            <Input
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              placeholder="Teléfono del contacto"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Insurance */}
      <div>
        <h4 className="mb-3 text-sm font-semibold">Obra social / Prepaga</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Prestador</Label>
            <Input
              value={insuranceProvider}
              onChange={(e) => setInsuranceProvider(e.target.value)}
              placeholder="Ej: OSDE, Swiss Medical"
            />
          </div>
          <div className="space-y-2">
            <Label>Nº de afiliado</Label>
            <Input
              value={insuranceNumber}
              onChange={(e) => setInsuranceNumber(e.target.value)}
              placeholder="Número de afiliado"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Clinical notes */}
      <div className="space-y-2">
        <Label>Notas clínicas generales</Label>
        <Textarea
          value={clinicalNotes}
          onChange={(e) => setClinicalNotes(e.target.value)}
          rows={4}
          placeholder="Antecedentes, observaciones generales del paciente..."
        />
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Guardando...
          </>
        ) : (
          'Guardar ficha'
        )}
      </Button>
    </div>
  )
}

// ─── Tab Medicación ────────────────────────────────────────────
function TabMedicacion({
  patient,
  medications,
}: {
  patient: Patient
  medications: PatientMedication[]
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deactivating, setDeactivating] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [frequency, setFrequency] = useState('')
  const [startDate, setStartDate] = useState('')
  const [notes, setNotes] = useState('')

  const activeMeds = medications.filter((m) => m.active)
  const inactiveMeds = medications.filter((m) => !m.active)

  const resetForm = () => {
    setName('')
    setDose('')
    setFrequency('')
    setStartDate('')
    setNotes('')
    setShowForm(false)
  }

  const handleAdd = async () => {
    if (!name.trim()) {
      toast.error('El nombre del medicamento es requerido')
      return
    }
    setSaving(true)
    try {
      await addPatientMedication(patient.id, {
        name: name.trim(),
        dose: dose || undefined,
        frequency: frequency || undefined,
        start_date: startDate || undefined,
        notes: notes || undefined,
      })
      toast.success('Medicamento agregado')
      resetForm()
      router.refresh()
    } catch (error) {
      toast.error(parseActionError(error))
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (medId: string, medName: string) => {
    const confirmed = confirm(`¿Desactivar "${medName}"?`)
    if (!confirmed) return

    setDeactivating(medId)
    try {
      await deactivatePatientMedication(medId)
      toast.success('Medicamento desactivado')
      router.refresh()
    } catch (error) {
      toast.error(parseActionError(error))
    } finally {
      setDeactivating(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Medicación activa <Badge variant="secondary">{activeMeds.length}</Badge>
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Agregar
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Ibuprofeno"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Dosis</Label>
                <Input
                  value={dose}
                  onChange={(e) => setDose(e.target.value)}
                  placeholder="Ej: 400mg"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Frecuencia</Label>
                <Input
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  placeholder="Ej: Cada 8 horas"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha inicio</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones..."
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar medicamento'
                )}
              </Button>
              <Button size="sm" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active medications */}
      {activeMeds.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Sin medicación activa registrada
        </p>
      ) : (
        <div className="space-y-2">
          {activeMeds.map((med) => (
            <Card key={med.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{med.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[med.dose, med.frequency].filter(Boolean).join(' · ') || 'Sin dosis especificada'}
                    {med.start_date && ` · Desde ${format(new Date(med.start_date + 'T00:00:00'), 'd MMM yyyy', { locale: es })}`}
                  </p>
                  {med.notes && (
                    <p className="mt-0.5 text-xs text-muted-foreground italic">{med.notes}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeactivate(med.id, med.name)}
                  disabled={deactivating === med.id}
                >
                  {deactivating === med.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    'Desactivar'
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Inactive medications */}
      {inactiveMeds.length > 0 && (
        <>
          <Separator />
          <h4 className="text-sm font-semibold text-muted-foreground">
            Historial de medicación
          </h4>
          <div className="space-y-2">
            {inactiveMeds.map((med) => (
              <Card key={med.id} className="opacity-60">
                <CardContent className="py-3">
                  <p className="text-sm font-medium line-through">{med.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[med.dose, med.frequency].filter(Boolean).join(' · ')}
                    {med.end_date && ` · Hasta ${format(new Date(med.end_date + 'T00:00:00'), 'd MMM yyyy', { locale: es })}`}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Tab Evolución ─────────────────────────────────────────────
function TabEvolucion({
  entries,
}: {
  entries: (ClinicalEntry & { appointments: { start_at: string; status: string } | null })[]
}) {
  // Most recent entry starts open
  const [openIds, setOpenIds] = useState<Set<string>>(() => {
    if (entries.length > 0) return new Set([entries[0].id])
    return new Set()
  })

  const toggleEntry = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No hay entradas clínicas registradas aún.
        </p>
        <p className="text-xs text-muted-foreground">
          Se crean al registrar una consulta desde la agenda.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const isOpen = openIds.has(entry.id)
        const dateStr = entry.appointments
          ? format(new Date(entry.appointments.start_at), "EEE d MMM yyyy · HH:mm", { locale: es })
          : format(new Date(entry.created_at), "EEE d MMM yyyy · HH:mm", { locale: es })
        const capitalDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)
        const medications = (entry.medications ?? []) as MedicationEntry[]

        return (
          <Card key={entry.id}>
            <Collapsible open={isOpen} onOpenChange={() => toggleEntry(entry.id)}>
              <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left">
                <div>
                  <p className="text-sm font-medium">{capitalDate}</p>
                  {entry.chief_complaint && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {entry.chief_complaint}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {entry.ai_summary && (
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-2 border-t pt-3">
                  {entry.chief_complaint && (
                    <Field label="Motivo de consulta" value={entry.chief_complaint} />
                  )}
                  {entry.clinical_history && (
                    <Field label="Antecedentes" value={entry.clinical_history} />
                  )}
                  {entry.physical_exam && (
                    <Field label="Examen físico" value={entry.physical_exam} />
                  )}
                  {entry.diagnosis && (
                    <Field label="Diagnóstico" value={entry.diagnosis} />
                  )}
                  {entry.treatment_plan && (
                    <Field label="Plan de tratamiento" value={entry.treatment_plan} />
                  )}
                  {medications.length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">Medicación indicada:</span>
                      <ul className="ml-4 mt-1 list-disc space-y-0.5">
                        {medications.map((m, i) => (
                          <li key={i} className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{m.name}</span>
                            {m.dose && ` – ${m.dose}`}
                            {m.frequency && ` – ${m.frequency}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {entry.indications && (
                    <Field label="Indicaciones" value={entry.indications} />
                  )}
                  {entry.next_steps && (
                    <Field label="Próximos pasos" value={entry.next_steps} />
                  )}
                  {entry.ai_summary && (
                    <div className="mt-2 rounded-md bg-amber-50 p-3 dark:bg-amber-950/20">
                      <p className="mb-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                        Resumen IA {entry.ai_summary_sent_at ? '· Enviado' : ''}
                      </p>
                      <p className="text-xs text-amber-900 whitespace-pre-line dark:text-amber-200">
                        {entry.ai_summary}
                      </p>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )
      })}
    </div>
  )
}

// ─── Tab Archivos (placeholder) ────────────────────────────────
function TabArchivos() {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <FolderOpen className="mb-3 h-10 w-10 text-muted-foreground" />
      <p className="text-sm font-medium">Archivos y documentos</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Próximamente: subí estudios, imágenes y documentos del paciente.
      </p>
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────
function Field({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm">
      <span className="font-medium">{label}:</span>{' '}
      <span className="text-muted-foreground">{value}</span>
    </p>
  )
}
