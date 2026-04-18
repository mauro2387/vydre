'use client'

import { useState } from 'react'
import { format, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getAvailableSlots, createPublicBooking } from '@/lib/actions/booking'

export function BookingClient({
  slug,
  professionalId,
  timezone,
  maxAdvanceDays,
}: {
  slug: string
  professionalId: string
  timezone: string
  maxAdvanceDays: number
}) {
  const [step, setStep] = useState<'date' | 'time' | 'form' | 'success'>('date')
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedTime, setSelectedTime] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [reason, setReason] = useState('')

  const today = format(new Date(), 'yyyy-MM-dd')
  const maxDate = format(addDays(new Date(), maxAdvanceDays), 'yyyy-MM-dd')

  const handleDateSelect = async (date: string) => {
    setSelectedDate(date)
    setLoadingSlots(true)
    setError('')
    try {
      const available = await getAvailableSlots(professionalId, date, timezone)
      setSlots(available)
      setStep('time')
    } catch {
      setError('Error al cargar horarios')
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    setStep('form')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await createPublicBooking({
        slug,
        date: selectedDate,
        time: selectedTime,
        name,
        email,
        phone,
        reason: reason || undefined,
      })
      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el turno')
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'success') {
    return (
      <div className="py-12 text-center">
        <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
        <h2 className="text-xl font-bold">¡Turno confirmado!</h2>
        <p className="text-muted-foreground mt-2">
          {format(new Date(`${selectedDate}T${selectedTime}`), "EEEE d 'de' MMMM, HH:mm", {
            locale: es,
          })}
          hs
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          Recibirás un recordatorio por email antes de tu turno.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-center text-sm text-red-600">{error}</div>
      )}

      {/* Step 1: Date */}
      {step === 'date' && (
        <div>
          <Label>Elegí una fecha</Label>
          <Input
            type="date"
            min={today}
            max={maxDate}
            className="mt-2"
            onChange={(e) => handleDateSelect(e.target.value)}
          />
          {loadingSlots && (
            <div className="mt-4 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Step 2: Time */}
      {step === 'time' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium">
              {format(new Date(selectedDate + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}
            </p>
            <Button variant="ghost" size="sm" onClick={() => setStep('date')}>
              Cambiar fecha
            </Button>
          </div>
          {slots.length === 0 ? (
            <p className="text-muted-foreground text-center text-sm">
              No hay horarios disponibles para esta fecha.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((time) => (
                <Button
                  key={time}
                  variant="outline"
                  size="sm"
                  onClick={() => handleTimeSelect(time)}
                >
                  {time}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Form */}
      {step === 'form' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium">
              {format(new Date(`${selectedDate}T${selectedTime}`), "EEEE d 'de' MMMM, HH:mm", {
                locale: es,
              })}
              hs
            </p>
            <Button variant="ghost" size="sm" onClick={() => setStep('time')}>
              Cambiar hora
            </Button>
          </div>

          <div>
            <Label htmlFor="name">Nombre completo *</Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
            />
          </div>
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <Label htmlFor="phone">Teléfono *</Label>
            <Input
              id="phone"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="099 123 456"
            />
          </div>
          <div>
            <Label htmlFor="reason">Motivo de consulta (opcional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="Describí brevemente el motivo..."
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirmando turno...
              </>
            ) : (
              'Confirmar turno'
            )}
          </Button>
        </form>
      )}
    </div>
  )
}
