'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { updateOnboarding } from '@/lib/actions/professional'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScheduleEditor, defaultSchedule } from '@/components/app/schedule-editor'
import type { ScheduleValue } from '@/components/app/schedule-editor'

const specialties = [
  'Odontología',
  'Medicina Estética',
  'Psicología',
  'Ginecología',
  'Traumatología',
  'Pediatría',
  'Dermatología',
  'Otra',
]

const durations = [
  { label: '15 min', value: 15 },
  { label: '20 min', value: 20 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
]

const step1Schema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  specialty: z.string().min(1, 'Seleccioná una especialidad'),
  phone: z.string().min(1, 'El teléfono es requerido'),
  appointment_duration: z.number().min(15).max(60),
})

type Step1Data = z.infer<typeof step1Schema>

export function OnboardingForm({ initialName }: { initialName: string }) {
  const [step, setStep] = useState(1)
  const [schedule, setSchedule] = useState<ScheduleValue>(defaultSchedule)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      name: initialName,
      specialty: '',
      phone: '',
      appointment_duration: 30,
    },
  })

  async function goToStep2() {
    const valid = await trigger()
    if (valid) setStep(2)
  }

  async function onSubmit(data: Step1Data) {
    setSubmitting(true)
    setError(null)
    try {
      await updateOnboarding({
        name: data.name,
        specialty: data.specialty,
        phone: data.phone,
        appointment_duration: data.appointment_duration,
        schedule,
      })
    } catch (e) {
      if (e instanceof Error && !e.message.includes('NEXT_REDIRECT')) {
        setError(e.message)
      }
      setSubmitting(false)
    }
  }

  const specialtyValue = watch('specialty')
  const durationValue = watch('appointment_duration')

  return (
    <>
      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
            step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}
        >
          1
        </div>
        <div className={`h-0.5 w-12 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
            step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}
        >
          2
        </div>
      </div>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Paso {step} de 2
      </p>

      <Card>
        {step === 1 && (
          <>
            <CardHeader>
              <CardTitle>Completá tu perfil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input id="name" {...register('name')} />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Especialidad</Label>
                <Select
                  value={specialtyValue}
                  onValueChange={(val) => { if (val) setValue('specialty', val, { shouldValidate: true }) }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccioná tu especialidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialties.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.specialty && (
                  <p className="text-sm text-destructive">{errors.specialty.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono profesional</Label>
                <Input
                  id="phone"
                  placeholder="+598 99 000 000"
                  {...register('phone')}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Duración de turno</Label>
                <Select
                  value={String(durationValue)}
                  onValueChange={(val) => {
                    if (val) setValue('appointment_duration', Number(val), { shouldValidate: true })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {durations.map((d) => (
                      <SelectItem key={d.value} value={String(d.value)}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="button" className="w-full" onClick={goToStep2}>
                Siguiente →
              </Button>
            </CardContent>
          </>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>¿Qué días y horarios atendés?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ScheduleEditor value={schedule} onChange={setSchedule} />

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(1)}
                >
                  ← Volver
                </Button>
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Empezar a usar Vydre'
                  )}
                </Button>
              </div>
            </CardContent>
          </form>
        )}
      </Card>
    </>
  )
}
