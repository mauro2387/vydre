'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

const STORAGE_KEY = 'vydre_waitlist_submitted'

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

export function WaitlistForm() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [specialty, setSpecialty] = useState<string>('')

  // Check localStorage on mount
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) {
      setSuccess(true)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = new FormData(e.currentTarget)
    const name = (form.get('name') as string).trim()
    const email = (form.get('email') as string).trim()
    const phone = (form.get('phone') as string).trim()

    if (!name || !email) {
      setError('Completá tu nombre y email.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          specialty: specialty || undefined,
          phone: phone || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Algo salió mal. Intentá de nuevo.')
        return
      }

      localStorage.setItem(STORAGE_KEY, '1')
      setSuccess(true)
    } catch {
      setError('Error de conexión. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-600" />
        <p className="text-lg font-semibold text-green-900">
          ¡Listo! Ya estás en la lista
        </p>
        <p className="mt-1 text-sm text-green-700">
          Te enviamos un email de confirmación. Revisá tu bandeja (y el spam por las dudas).
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="wl-name">Nombre completo</Label>
        <Input
          id="wl-name"
          name="name"
          placeholder="Dr. Juan Pérez"
          required
          minLength={2}
          autoComplete="name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="wl-email">Email profesional</Label>
        <Input
          id="wl-email"
          name="email"
          type="email"
          placeholder="juan@clinica.com"
          required
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <Label>Especialidad (opcional)</Label>
        <Select value={specialty} onValueChange={(val) => { if (val) setSpecialty(val) }}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccioná tu especialidad" />
          </SelectTrigger>
          <SelectContent>
            {specialties.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="wl-phone">Teléfono (opcional)</Label>
        <Input
          id="wl-phone"
          name="phone"
          type="tel"
          placeholder="+598 99 123 456"
          autoComplete="tel"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          'Quiero ser médico fundador'
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Sin compromiso. Te avisamos cuando tengamos lugar.
      </p>
    </form>
  )
}
