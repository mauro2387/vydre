'use client'

import { useState } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { submitIntakeForm } from '@/lib/actions/intake'

type Field = {
  id: string
  type: string
  label: string
  required: boolean
  options?: string[]
}

export function IntakeFormClient({
  token,
  fields,
}: {
  token: string
  fields: Field[]
}) {
  const [responses, setResponses] = useState<Record<string, unknown>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const updateField = (id: string, value: unknown) => {
    setResponses((prev) => ({ ...prev, [id]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await submitIntakeForm(token, responses)
      setSubmitted(true)
    } catch {
      setError('Error al enviar el formulario. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="py-12 text-center">
        <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
        <h2 className="text-xl font-bold">¡Formulario enviado!</h2>
        <p className="text-muted-foreground mt-2">
          Tus respuestas fueron registradas. Gracias.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-center text-sm text-red-600">{error}</div>
      )}

      {fields.map((field) => (
        <div key={field.id}>
          <Label htmlFor={field.id}>
            {field.label}
            {field.required && <span className="ml-1 text-red-500">*</span>}
          </Label>

          {field.type === 'text' && (
            <Input
              id={field.id}
              required={field.required}
              className="mt-1"
              value={(responses[field.id] as string) ?? ''}
              onChange={(e) => updateField(field.id, e.target.value)}
            />
          )}

          {field.type === 'textarea' && (
            <Textarea
              id={field.id}
              required={field.required}
              className="mt-1"
              rows={3}
              value={(responses[field.id] as string) ?? ''}
              onChange={(e) => updateField(field.id, e.target.value)}
            />
          )}

          {field.type === 'boolean' && (
            <div className="mt-1 flex gap-4">
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name={field.id}
                  required={field.required}
                  checked={responses[field.id] === true}
                  onChange={() => updateField(field.id, true)}
                />
                Sí
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name={field.id}
                  checked={responses[field.id] === false}
                  onChange={() => updateField(field.id, false)}
                />
                No
              </label>
            </div>
          )}

          {field.type === 'date' && (
            <Input
              id={field.id}
              type="date"
              required={field.required}
              className="mt-1"
              value={(responses[field.id] as string) ?? ''}
              onChange={(e) => updateField(field.id, e.target.value)}
            />
          )}

          {field.type === 'select' && field.options && (
            <select
              id={field.id}
              required={field.required}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={(responses[field.id] as string) ?? ''}
              onChange={(e) => updateField(field.id, e.target.value)}
            >
              <option value="">Seleccionar...</option>
              {field.options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}

          {field.type === 'multiselect' && field.options && (
            <div className="mt-1 space-y-1">
              {field.options.map((opt) => {
                const current = (responses[field.id] as string[]) ?? []
                return (
                  <label key={opt} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={current.includes(opt)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...current, opt]
                          : current.filter((v) => v !== opt)
                        updateField(field.id, next)
                      }}
                    />
                    {opt}
                  </label>
                )
              })}
            </div>
          )}
        </div>
      ))}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          'Enviar formulario'
        )}
      </Button>
    </form>
  )
}
