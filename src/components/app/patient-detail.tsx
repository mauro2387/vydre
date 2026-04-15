'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Phone, Mail, Calendar, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { EditPatientModal } from '@/components/app/edit-patient-modal'
import { PatientClinicalRecord } from '@/components/app/patient-clinical-record'
import { updatePatient } from '@/lib/actions/patients'
import type { PatientDetail, ClinicalEntry, PatientMedication } from '@/lib/types/database.types'

const getInitials = (name: string) =>
  name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

export function PatientDetailView({
  patient,
  clinicalEntries,
  medications,
}: {
  patient: PatientDetail
  clinicalEntries: (ClinicalEntry & { appointments: { start_at: string; status: string } | null })[]
  medications: PatientMedication[]
}) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [notes, setNotes] = useState(patient.notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [savedMessage, setSavedMessage] = useState(false)

  const memberSince = format(new Date(patient.created_at), "MMMM yyyy", { locale: es })

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    try {
      await updatePatient(patient.id, {
        name: patient.name,
        phone: patient.phone,
        email: patient.email ?? undefined,
        notes: notes || undefined,
      })
      toast.success('Notas guardadas')
      setSavedMessage(true)
      setTimeout(() => setSavedMessage(false), 2000)
      router.refresh()
    } catch {
      toast.error('No se pudieron guardar las notas. Intentá de nuevo.')
    } finally {
      setSavingNotes(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* SECCIÓN A — Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
            {getInitials(patient.name)}
          </div>
          <div>
            <h2 className="text-xl font-bold">{patient.name}</h2>
            {patient.notes && (
              <p className="text-sm text-muted-foreground line-clamp-1">{patient.notes}</p>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="mr-1 h-3.5 w-3.5" />
          Editar
        </Button>
      </div>

      {/* SECCIÓN B — Contact info */}
      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a
              href={`tel:${patient.phone.replace(/\s/g, '')}`}
              className="text-sm text-primary hover:underline"
            >
              {patient.phone}
            </a>
          </div>
          {patient.email && (
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a
                href={`mailto:${patient.email}`}
                className="text-sm text-primary hover:underline"
              >
                {patient.email}
              </a>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Paciente desde {memberSince}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* SECCIÓN C — Clinical record tabs */}
      <PatientClinicalRecord
        patient={patient}
        entries={clinicalEntries}
        medications={medications}
      />

      <Separator />

      {/* SECCIÓN D — Professional notes */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold">Notas del profesional</h3>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas internas sobre el paciente..."
          rows={4}
        />
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={handleSaveNotes}
            disabled={savingNotes}
          >
            {savingNotes ? 'Guardando...' : 'Guardar notas'}
          </Button>
          {savedMessage && (
            <span className="text-sm text-green-600">Guardado</span>
          )}
        </div>
      </div>

      {/* Edit modal */}
      <EditPatientModal
        patient={patient}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />
    </div>
  )
}
