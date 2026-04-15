'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { createPatient } from '@/lib/actions/patients'
import { parseActionError } from '@/lib/utils/error-messages'
import type { Patient } from '@/lib/types/database.types'

const getInitials = (name: string) =>
  name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

const patientSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  phone: z.string().min(1, 'El teléfono es requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
})

type PatientFormData = z.infer<typeof patientSchema>

export function PatientList({
  patients,
  selectedId,
  searchQuery,
}: {
  patients: Patient[]
  selectedId: string | undefined
  searchQuery: string | undefined
}) {
  const router = useRouter()
  const [value, setValue] = useState(searchQuery ?? '')
  const [openNewPatient, setOpenNewPatient] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
  })

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (value !== (searchQuery ?? '')) {
        if (value) {
          router.push(`/pacientes?q=${encodeURIComponent(value)}`)
        } else {
          router.push('/pacientes')
        }
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectPatient = (patientId: string) => {
    const q = value || searchQuery
    if (q) {
      router.push(`/pacientes?q=${encodeURIComponent(q)}&id=${patientId}`)
    } else {
      router.push(`/pacientes?id=${patientId}`)
    }
  }

  const onSubmitNewPatient = async (data: PatientFormData) => {
    setServerError(null)
    setLoading(true)
    try {
      await createPatient({
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
      })
      toast.success(`Paciente ${data.name} agregado`)
      reset()
      setOpenNewPatient(false)
      router.refresh()
    } catch (error) {
      setServerError(parseActionError(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pacientes</h1>
          <p className="text-sm text-muted-foreground">{patients.length} pacientes</p>
        </div>
        <Button size="sm" onClick={() => setOpenNewPatient(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Nuevo
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar paciente..."
          className="pl-9"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>

      {/* Patient list */}
      {patients.length === 0 && !value ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UserPlus className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">Todavía no tenés pacientes</h3>
          <p className="mt-1 text-sm text-muted-foreground">Agregá tu primer paciente para empezar</p>
          <Button className="mt-4" size="sm" onClick={() => setOpenNewPatient(true)}>
            Agregar paciente
          </Button>
        </div>
      ) : patients.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No encontramos pacientes con ese nombre
        </p>
      ) : (
        <div className="space-y-1">
          {patients.map((patient) => (
            <button
              key={patient.id}
              onClick={() => handleSelectPatient(patient.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent ${
                selectedId === patient.id ? 'bg-accent' : ''
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                {getInitials(patient.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{patient.name}</p>
                <p className="truncate text-xs text-muted-foreground">{patient.phone}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* New patient dialog */}
      <Dialog open={openNewPatient} onOpenChange={(o) => { if (!o) { reset(); setServerError(null) }; setOpenNewPatient(o) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nuevo paciente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmitNewPatient)} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input placeholder="Nombre completo" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input placeholder="099 123 456" {...register('phone')} />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Email (opcional)</Label>
              <Input type="email" placeholder="email@ejemplo.com" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            {serverError && <p className="text-sm text-destructive">{serverError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenNewPatient(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear paciente'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
