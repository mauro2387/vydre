import { notFound } from 'next/navigation'
import { getIntakeFormByToken } from '@/lib/actions/intake'
import { IntakeFormClient } from './intake-form-client'

export default async function IntakeFormPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const response = await getIntakeFormByToken(token)

  if (!response) notFound()

  if (response.completed_at) {
    return (
      <div className="mx-auto min-h-screen max-w-lg bg-white px-4 py-10 text-center">
        <h1 className="text-2xl font-bold">Formulario completado</h1>
        <p className="text-muted-foreground mt-2">
          Ya completaste este formulario. ¡Gracias!
        </p>
      </div>
    )
  }

  const template = response.intake_form_templates as unknown as {
    name: string
    fields: { id: string; type: string; label: string; required: boolean; options?: string[] }[]
  } | null

  if (!template) notFound()

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-white px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">{template.name}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Por favor completá este formulario antes de tu consulta.
        </p>
      </div>

      <IntakeFormClient
        token={token}
        fields={template.fields}
      />
    </div>
  )
}
