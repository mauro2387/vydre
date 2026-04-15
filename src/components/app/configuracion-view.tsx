'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { User, Clock, Timer, Globe, Shield, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScheduleEditor, hasScheduleErrors } from '@/components/app/schedule-editor'
import type { ScheduleValue } from '@/components/app/schedule-editor'
import {
  updateProfile,
  updateSchedule,
  updateTimezone,
} from '@/lib/actions/professional'
import type { Professional } from '@/lib/types/database.types'

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
  { label: '15 minutos', value: 15 },
  { label: '20 minutos', value: 20 },
  { label: '30 minutos', value: 30 },
  { label: '45 minutos', value: 45 },
  { label: '60 minutos', value: 60 },
]

const timezones = [
  { value: 'America/Montevideo', label: 'América/Montevideo' },
  { value: 'America/Buenos_Aires', label: 'América/Buenos Aires' },
  { value: 'America/Sao_Paulo', label: 'América/São Paulo' },
  { value: 'America/Santiago', label: 'América/Santiago' },
  { value: 'America/Bogota', label: 'América/Bogotá' },
]

const profileSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  specialty: z.string().min(1, 'Seleccioná una especialidad'),
  phone: z.string().min(1, 'El teléfono es requerido'),
})

type ProfileData = z.infer<typeof profileSchema>

export function ConfiguracionView({
  professional,
  userEmail,
}: {
  professional: Professional
  userEmail: string
}) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">Gestioná tu perfil y preferencias</p>
      </div>

      <ProfileSection professional={professional} />
      <Separator />
      <ScheduleSection professional={professional} />
      <Separator />
      <DurationSection professional={professional} />
      <Separator />
      <TimezoneSection professional={professional} />
      <Separator />
      <AccountSection
        userEmail={userEmail}
        createdAt={professional.created_at}
      />
    </div>
  )
}

// SECTION 1 — Profile
function ProfileSection({ professional }: { professional: Professional }) {
  const [saving, setSaving] = useState(false)
  const initialRef = useRef(JSON.stringify({
    name: professional.name,
    specialty: professional.specialty,
    phone: professional.phone ?? '',
  }))

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: professional.name,
      specialty: professional.specialty,
      phone: professional.phone ?? '',
    },
  })

  const currentValues = watch()
  const hasChanges = JSON.stringify(currentValues) !== initialRef.current

  const onSubmit = async (data: ProfileData) => {
    try {
      setSaving(true)
      await updateProfile(data)
      initialRef.current = JSON.stringify(data)
      toast.success('Perfil actualizado')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const specialtyValue = watch('specialty')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Perfil profesional
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="config-name">Nombre completo</Label>
            <Input id="config-name" {...register('name')} />
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
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {specialties.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.specialty && (
              <p className="text-sm text-destructive">{errors.specialty.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="config-phone">Teléfono profesional</Label>
            <Input id="config-phone" {...register('phone')} />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={!hasChanges || saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : hasChanges ? (
                'Guardar cambios'
              ) : (
                'Sin cambios'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// SECTION 2 — Schedule
function ScheduleSection({ professional }: { professional: Professional }) {
  const [saving, setSaving] = useState(false)
  const parsedSchedule = professional.schedule as unknown as ScheduleValue
  const [schedule, setSchedule] = useState<ScheduleValue>(parsedSchedule)
  const initialRef = useRef(JSON.stringify(parsedSchedule))

  const hasChanges = JSON.stringify(schedule) !== initialRef.current
  const hasErrors = hasScheduleErrors(schedule)

  const handleSave = async () => {
    try {
      setSaving(true)
      await updateSchedule({
        appointment_duration: professional.appointment_duration,
        schedule,
      })
      initialRef.current = JSON.stringify(schedule)
      toast.success('Horarios actualizados')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Horarios de atención
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScheduleEditor value={schedule} onChange={setSchedule} />
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || hasErrors || saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : hasChanges ? (
              'Guardar horarios'
            ) : (
              'Sin cambios'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// SECTION 3 — Duration
function DurationSection({ professional }: { professional: Professional }) {
  const [saving, setSaving] = useState(false)
  const [duration, setDuration] = useState(professional.appointment_duration)
  const initialRef = useRef(professional.appointment_duration)

  const hasChanges = duration !== initialRef.current

  const handleSave = async () => {
    try {
      setSaving(true)
      await updateSchedule({
        appointment_duration: duration,
        schedule: professional.schedule as unknown as ScheduleValue,
      })
      initialRef.current = duration
      toast.success('Duración actualizada')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5" />
          Duración de turnos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Select
            value={String(duration)}
            onValueChange={(val) => { if (val) setDuration(Number(val)) }}
          >
            <SelectTrigger className="w-48">
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
          <p className="text-sm text-muted-foreground">
            Cambiar la duración afecta los slots disponibles para nuevos turnos.
            Los turnos ya agendados no se modifican.
          </p>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : hasChanges ? (
              'Guardar preferencias'
            ) : (
              'Sin cambios'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// SECTION 4 — Timezone
function TimezoneSection({ professional }: { professional: Professional }) {
  const [saving, setSaving] = useState(false)
  const [tz, setTz] = useState(professional.timezone)
  const initialRef = useRef(professional.timezone)
  const [currentTime, setCurrentTime] = useState('')

  const hasChanges = tz !== initialRef.current

  useEffect(() => {
    function updateTime() {
      const now = new Date()
      const formatted = now.toLocaleTimeString('es-UY', { timeZone: tz })
      setCurrentTime(formatted)
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [tz])

  const handleSave = async () => {
    try {
      setSaving(true)
      await updateTimezone(tz)
      initialRef.current = tz
      toast.success('Zona horaria actualizada')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const tzLabel = timezones.find(t => t.value === tz)?.label ?? tz

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Zona horaria
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Select
            value={tz}
            onValueChange={(val) => { if (val) setTz(val) }}
          >
            <SelectTrigger className="w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timezones.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {currentTime && (
            <p className="text-sm text-muted-foreground">
              {tzLabel} — {currentTime}
            </p>
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : hasChanges ? (
              'Guardar zona horaria'
            ) : (
              'Sin cambios'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// SECTION 5 — Account
function AccountSection({
  userEmail,
  createdAt,
}: {
  userEmail: string
  createdAt: string
}) {
  const dateStr = format(new Date(createdAt), "d 'de' MMMM 'de' yyyy", { locale: es })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Cuenta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Email</span>
          <span className="text-sm font-medium">{userEmail}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Cuenta creada</span>
          <span className="text-sm font-medium">{dateStr}</span>
        </div>
        <div className="pt-2">
          <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
            Plan gratuito · Médico fundador
          </Badge>
          <p className="mt-2 text-sm text-muted-foreground">
            Como médico fundador tenés acceso de por vida sin costo.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
