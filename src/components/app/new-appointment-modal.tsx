'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, addMinutes } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { createAppointment } from '@/lib/actions/appointments'
import { createPatient } from '@/lib/actions/patients'
import { parseActionError } from '@/lib/utils/error-messages'
import type { Patient, Professional } from '@/lib/types/database.types'

// Schemas
const appointmentSchema = z.object({
  patient_id: z.string().min(1, 'Seleccioná un paciente'),
  date: z.string().min(1, 'La fecha es requerida'),
  start_time: z.string().min(1, 'La hora es requerida'),
  notes: z.string().max(500, 'Máximo 500 caracteres').optional(),
})

type AppointmentForm = z.infer<typeof appointmentSchema>

const patientSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  phone: z.string().min(1, 'El teléfono es requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
})

type PatientForm = z.infer<typeof patientSchema>

// Day name map for schedule lookup
const dayNames: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
}

export function NewAppointmentModal({
  open,
  onOpenChange,
  patients,
  professional,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  patients: Patient[]
  professional: Professional
  onSuccess?: () => void
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [openNewPatient, setOpenNewPatient] = useState(false)
  const [localPatients, setLocalPatients] = useState<Patient[]>(patients)
  const [patientPopoverOpen, setPatientPopoverOpen] = useState(false)

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AppointmentForm>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patient_id: '',
      date: todayStr,
      start_time: '',
      notes: '',
    },
  })

  const selectedDate = watch('date')

  // Get schedule for selected date
  const getScheduleForDate = (dateStr: string) => {
    if (!dateStr) return null
    const date = new Date(dateStr + 'T12:00:00')
    const dayOfWeek = date.getDay()
    const dayName = dayNames[dayOfWeek]
    const schedule = professional.schedule as Record<
      string,
      { start: string; end: string; active: boolean }
    > | null
    if (!schedule || !schedule[dayName]) return null
    return schedule[dayName]
  }

  const daySchedule = getScheduleForDate(selectedDate)
  const isDayActive = daySchedule?.active ?? false

  // Generate time slots based on schedule
  const generateTimeSlots = () => {
    if (!daySchedule || !daySchedule.active) return []

    const slots: string[] = []
    const duration = professional.appointment_duration || 30
    const startParts = daySchedule.start.split(':')
    const endParts = daySchedule.end.split(':')

    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1])
    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1])

    for (let m = startMinutes; m <= endMinutes - duration; m += duration) {
      const hours = Math.floor(m / 60)
      const mins = m % 60
      slots.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`)
    }

    return slots
  }

  const timeSlots = generateTimeSlots()

  const onSubmit = async (data: AppointmentForm) => {
    setServerError(null)
    setLoading(true)

    try {
      const duration = professional.appointment_duration || 30
      const startDateTime = new Date(`${data.date}T${data.start_time}:00`)
      const endDateTime = addMinutes(startDateTime, duration)

      const selectedPatient = localPatients.find(p => p.id === data.patient_id)
      await createAppointment({
        patient_id: data.patient_id,
        start_at: startDateTime.toISOString(),
        end_at: endDateTime.toISOString(),
        notes: data.notes || undefined,
      })

      toast.success(`Turno creado para ${selectedPatient?.name ?? 'el paciente'}`)
      reset()
      onOpenChange(false)
      onSuccess?.()
      router.refresh()
    } catch (error) {
      setServerError(parseActionError(error))
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setServerError(null)
      reset()
    }
    onOpenChange(newOpen)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo turno</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Patient select */}
            <div className="space-y-2">
              <Label>Paciente</Label>
              {localPatients.length > 20 ? (
                <Popover open={patientPopoverOpen} onOpenChange={setPatientPopoverOpen}>
                  <PopoverTrigger
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
                  >
                    <span className={watch('patient_id') ? 'text-foreground' : ''}>
                      {watch('patient_id')
                        ? localPatients.find(p => p.id === watch('patient_id'))?.name ?? 'Seleccionar paciente...'
                        : 'Seleccionar paciente...'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar paciente..." />
                      <CommandList>
                        <CommandEmpty>Sin resultados</CommandEmpty>
                        <CommandGroup>
                          {localPatients.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={p.name}
                              data-checked={watch('patient_id') === p.id}
                              onSelect={() => {
                                setValue('patient_id', p.id, { shouldValidate: true })
                                setPatientPopoverOpen(false)
                              }}
                            >
                              {p.name}
                            </CommandItem>
                          ))}
                          <CommandItem
                            value="__nuevo_paciente__"
                            onSelect={() => {
                              setOpenNewPatient(true)
                              setPatientPopoverOpen(false)
                            }}
                            className="text-primary font-medium"
                          >
                            + Nuevo paciente
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : (
                <Select
                  value={watch('patient_id') || undefined}
                  onValueChange={(val) => {
                    if (val === '__new__') {
                      setOpenNewPatient(true)
                    } else if (val) {
                      setValue('patient_id', val as string, { shouldValidate: true })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar paciente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {localPatients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="__new__" className="text-primary font-medium">
                      + Nuevo paciente
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
              {errors.patient_id && (
                <p className="text-sm text-destructive">{errors.patient_id.message}</p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                min={todayStr}
                {...register('date')}
              />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>

            {/* Time slot */}
            <div className="space-y-2">
              <Label>Hora de inicio</Label>
              {!isDayActive ? (
                <p className="text-sm text-muted-foreground">No atendés este día</p>
              ) : (
                <Select
                  value={watch('start_time') || undefined}
                  onValueChange={(val) => {
                    if (val) setValue('start_time', val as string, { shouldValidate: true })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar hora..." />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.start_time && (
                <p className="text-sm text-destructive">{errors.start_time.message}</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                maxLength={500}
                placeholder="Notas del turno..."
                {...register('notes')}
              />
              {errors.notes && (
                <p className="text-sm text-destructive">{errors.notes.message}</p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !isDayActive}>
                {loading ? 'Creando...' : 'Crear turno'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Nested: New patient dialog */}
      <NewPatientDialog
        open={openNewPatient}
        onOpenChange={setOpenNewPatient}
        onCreated={(newPatient) => {
          setLocalPatients((prev) => [...prev, newPatient].sort((a, b) => a.name.localeCompare(b.name)))
          setValue('patient_id', newPatient.id, { shouldValidate: true })
          setOpenNewPatient(false)
          router.refresh()
        }}
      />
    </>
  )
}

// Nested New Patient Dialog
function NewPatientDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (patient: Patient) => void
}) {
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PatientForm>({
    resolver: zodResolver(patientSchema),
  })

  const onSubmit = async (data: PatientForm) => {
    setServerError(null)
    setLoading(true)

    try {
      await createPatient({
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
      })

      // Create a temporary patient object for the local state
      // The actual ID will come from the server on next refresh
      const tempPatient: Patient = {
        id: crypto.randomUUID(),
        professional_id: '',
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        dob: null,
        notes: null,
        blood_type: null,
        allergies: null,
        chronic_conditions: null,
        current_medications: null,
        emergency_contact_name: null,
        emergency_contact_phone: null,
        insurance_provider: null,
        insurance_number: null,
        occupation: null,
        clinical_notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      toast.success(`Paciente ${data.name} agregado`)
      reset()
      onCreated(tempPatient)
    } catch (error) {
      setServerError(parseActionError(error))
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setServerError(null)
      reset()
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nuevo paciente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input placeholder="Nombre completo" {...register('name')} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Teléfono</Label>
            <Input placeholder="099 123 456" {...register('phone')} />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Email (opcional)</Label>
            <Input type="email" placeholder="email@ejemplo.com" {...register('email')} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear paciente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
