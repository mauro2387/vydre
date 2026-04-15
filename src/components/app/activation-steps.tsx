'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, CalendarPlus, Bell, Lock, Check, Star, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NewAppointmentModal } from '@/components/app/new-appointment-modal'
import { createPatient } from '@/lib/actions/patients'
import { parseActionError } from '@/lib/utils/error-messages'
import type { Patient, Professional } from '@/lib/types/database.types'

const patientSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  phone: z.string().min(1, 'El teléfono es requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
})

type PatientFormData = z.infer<typeof patientSchema>

type StepStatus = 'locked' | 'pending' | 'completed'

export function ActivationSteps({
  professional,
  initialPatients,
}: {
  professional: Professional
  initialPatients: Patient[]
}) {
  const router = useRouter()
  const [step1Done, setStep1Done] = useState(professional.first_patient_created)
  const [step2Done, setStep2Done] = useState(professional.first_appointment_created)
  const [step3Done, setStep3Done] = useState(professional.first_reminder_sent)
  const [allComplete, setAllComplete] = useState(
    professional.first_patient_created &&
    professional.first_appointment_created &&
    professional.first_reminder_sent
  )

  const [patients, setPatients] = useState<Patient[]>(initialPatients)
  const [openPatientDialog, setOpenPatientDialog] = useState(false)
  const [openAppointmentDialog, setOpenAppointmentDialog] = useState(false)
  const [patientLoading, setPatientLoading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
  })

  const step1Status: StepStatus = step1Done ? 'completed' : 'pending'
  const step2Status: StepStatus = step2Done ? 'completed' : step1Done ? 'pending' : 'locked'
  const step3Status: StepStatus = step3Done ? 'completed' : step2Done ? 'pending' : 'locked'

  async function onCreatePatient(data: PatientFormData) {
    setPatientLoading(true)
    try {
      await createPatient({
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
      })
      setStep1Done(true)
      setOpenPatientDialog(false)
      reset()
      // Add to local patients for the appointment modal
      const newPatient: Patient = {
        id: crypto.randomUUID(),
        professional_id: professional.id,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        dob: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setPatients((prev) => [...prev, newPatient])
      toast.success('¡Primer paciente agregado! Ahora creá un turno.')
    } catch (e) {
      toast.error(parseActionError(e))
    } finally {
      setPatientLoading(false)
    }
  }

  function handleAppointmentCreated() {
    setStep2Done(true)
    setOpenAppointmentDialog(false)
    toast.success('¡Turno creado! Ahora enviá un recordatorio desde la agenda.')
    // Check if all complete
    if (step1Done && step3Done) {
      setAllComplete(true)
    }
  }

  function handleGoToAgenda() {
    router.push('/agenda')
  }

  const steps = [
    {
      number: 1,
      icon: UserPlus,
      title: 'Agregá un paciente',
      description: 'Cargá los datos de uno de tus pacientes actuales para empezar a gestionar su agenda.',
      status: step1Status,
      onAction: () => setOpenPatientDialog(true),
      actionLabel: 'Agregar paciente',
      completedLink: '/pacientes',
    },
    {
      number: 2,
      icon: CalendarPlus,
      title: 'Creá un turno',
      description: 'Agendá un turno para ese paciente. El sistema va a recordárselo automáticamente.',
      status: step2Status,
      onAction: () => setOpenAppointmentDialog(true),
      actionLabel: 'Crear turno',
      completedLink: '/agenda',
    },
    {
      number: 3,
      icon: Bell,
      title: 'Enviá un recordatorio',
      description: 'Mandá el recordatorio del turno al paciente. Así reduce las ausencias sin hacer nada manualmente.',
      status: step3Status,
      onAction: handleGoToAgenda,
      actionLabel: 'Ir a la agenda',
      completedLink: '/agenda',
    },
  ]

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        {steps.map((step) => (
          <Card
            key={step.number}
            className={`relative transition-all ${
              step.status === 'completed'
                ? 'border-green-300'
                : step.status === 'locked'
                  ? 'opacity-50'
                  : ''
            }`}
          >
            {step.status === 'completed' && (
              <Badge className="absolute right-3 top-3 bg-green-100 text-green-800 hover:bg-green-100">
                Completado
              </Badge>
            )}
            {step.status === 'locked' && (
              <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            )}
            <CardContent className="flex flex-col gap-3 pt-6">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    step.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : step.status === 'pending'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step.status === 'completed' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    step.number
                  )}
                </div>
                <step.icon
                  className={`h-5 w-5 ${
                    step.status === 'completed'
                      ? 'text-green-600'
                      : step.status === 'pending'
                        ? 'text-primary'
                        : 'text-muted-foreground'
                  }`}
                />
              </div>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
              <div className="mt-auto pt-2">
                {step.status === 'completed' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-green-300 text-green-700 hover:bg-green-50"
                    onClick={() => router.push(step.completedLink)}
                  >
                    Ver
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={step.status === 'locked'}
                    onClick={step.onAction}
                  >
                    {step.actionLabel}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* All complete celebration */}
      {allComplete && (
        <div className="mt-10 flex flex-col items-center text-center animate-pop-in">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Star className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold">
            ¡Todo listo! Ya sos parte de los médicos que le sacan el tiempo al papeleo.
          </h2>
          <Button className="mt-6" size="lg" onClick={() => router.push('/dashboard')}>
            Ir a mi dashboard →
          </Button>
        </div>
      )}

      {/* New patient dialog */}
      <Dialog open={openPatientDialog} onOpenChange={setOpenPatientDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar paciente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onCreatePatient)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="act-name">Nombre completo</Label>
              <Input id="act-name" {...register('name')} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="act-phone">Teléfono</Label>
              <Input id="act-phone" placeholder="+598 99 000 000" {...register('phone')} />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="act-email">Email (opcional)</Label>
              <Input id="act-email" type="email" {...register('email')} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={patientLoading}>
                {patientLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar paciente'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New appointment modal — reusing existing component */}
      <NewAppointmentModal
        open={openAppointmentDialog}
        onOpenChange={setOpenAppointmentDialog}
        patients={patients}
        professional={professional}
        onSuccess={() => {
          setStep2Done(true)
          if (step1Done && step3Done) {
            setAllComplete(true)
          }
        }}
      />
    </>
  )
}
