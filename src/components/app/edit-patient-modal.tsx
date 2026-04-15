'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { toast } from 'sonner'
import { updatePatient } from '@/lib/actions/patients'
import { parseActionError } from '@/lib/utils/error-messages'
import type { Patient } from '@/lib/types/database.types'

const editSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  phone: z.string().min(1, 'El teléfono es requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  notes: z.string().optional(),
})

type EditForm = z.infer<typeof editSchema>

export function EditPatientModal({
  patient,
  open,
  onClose,
}: {
  patient: Patient
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: patient.name,
      phone: patient.phone,
      email: patient.email ?? '',
      notes: patient.notes ?? '',
    },
  })

  const onSubmit = async (data: EditForm) => {
    setServerError(null)
    setLoading(true)
    try {
      await updatePatient(patient.id, {
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        notes: data.notes || undefined,
      })
      toast.success(`Datos de ${data.name} actualizados`)
      onClose()
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
      reset({
        name: patient.name,
        phone: patient.phone,
        email: patient.email ?? '',
        notes: patient.notes ?? '',
      })
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar paciente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Teléfono</Label>
            <Input {...register('phone')} />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Email (opcional)</Label>
            <Input type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea rows={3} {...register('notes')} />
          </div>

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
