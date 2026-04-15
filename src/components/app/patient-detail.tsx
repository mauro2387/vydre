'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Phone, Mail, Calendar, ChevronDown, ChevronUp, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { AppointmentStatusBadge } from '@/components/app/appointment-status-badge'
import { EditPatientModal } from '@/components/app/edit-patient-modal'
import { updatePatient } from '@/lib/actions/patients'
import type { PatientDetail, AppointmentStatus } from '@/lib/types/database.types'

const getInitials = (name: string) =>
  name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

export function PatientDetailView({ patient }: { patient: PatientDetail }) {
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
      setSavedMessage(true)
      setTimeout(() => setSavedMessage(false), 2000)
      router.refresh()
    } catch {
      // silently fail
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

      {/* SECCIÓN C — Appointment history */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-base font-semibold">Historial de turnos</h3>
          <Badge variant="secondary">{patient.appointments?.length ?? 0}</Badge>
        </div>

        {(!patient.appointments || patient.appointments.length === 0) ? (
          <p className="py-4 text-sm text-muted-foreground">
            Este paciente no tiene turnos registrados aún
          </p>
        ) : (
          <div className="space-y-2">
            {patient.appointments.map((apt) => {
              const dateStr = format(new Date(apt.start_at), "EEE d MMM · HH:mm", { locale: es })
              const capitalizedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)
              const status = apt.status as AppointmentStatus
              const confirmation = (apt.appointment_confirmations?.response as 'confirmed' | 'declined' | null) ?? null
              const hasNotes = apt.consultation_notes &&
                (apt.consultation_notes.reason || apt.consultation_notes.treatment || apt.consultation_notes.observations)
              const summary = apt.consultation_notes?.generated_summaries

              return (
                <Card key={apt.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{capitalizedDate}</span>
                      <AppointmentStatusBadge status={status} confirmation={confirmation} />
                    </div>

                    {hasNotes ? (
                      <ConsultationNotesCollapsible
                        reason={apt.consultation_notes!.reason}
                        treatment={apt.consultation_notes!.treatment}
                        observations={apt.consultation_notes!.observations}
                        summarySentAt={summary?.sent_at ?? null}
                        hasSummary={!!summary}
                      />
                    ) : (
                      status === 'completed' && (
                        <p className="mt-2 text-sm italic text-muted-foreground">
                          Sin notas registradas
                        </p>
                      )
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

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

// Collapsible subcomponent for consultation notes
function ConsultationNotesCollapsible({
  reason,
  treatment,
  observations,
  summarySentAt,
  hasSummary,
}: {
  reason: string | null
  treatment: string | null
  observations: string | null
  summarySentAt: string | null
  hasSummary: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline">
        {open ? (
          <>Ocultar notas <ChevronUp className="h-3 w-3" /></>
        ) : (
          <>Ver notas de consulta <ChevronDown className="h-3 w-3" /></>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-1.5 rounded-md bg-muted/50 p-3 text-sm">
          {reason && <p><span className="font-medium">Motivo:</span> {reason}</p>}
          {treatment && <p><span className="font-medium">Tratamiento:</span> {treatment}</p>}
          {observations && <p><span className="font-medium">Observaciones:</span> {observations}</p>}
          {hasSummary && (
            <div className="mt-2">
              {summarySentAt ? (
                <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                  Resumen enviado
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
                  Resumen pendiente de envío
                </Badge>
              )}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
