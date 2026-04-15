import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPatients } from '@/lib/actions/patients'
import { ActivationSteps } from '@/components/app/activation-steps'
import type { Professional } from '@/lib/types/database.types'

export default async function BienvenidaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: professional } = await supabase
    .from('professionals')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!professional) {
    redirect('/onboarding')
  }

  if (professional.activation_complete) {
    redirect('/dashboard')
  }

  const patients = await getPatients()

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        {/* Celebration section */}
        <div className="mb-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <svg
              viewBox="0 0 48 48"
              fill="none"
              className="h-10 w-10 text-primary"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="6" y="10" width="36" height="28" rx="4" stroke="currentColor" strokeWidth="2.5" />
              <path d="M6 18h36" stroke="currentColor" strokeWidth="2.5" />
              <circle cx="16" cy="28" r="2.5" fill="currentColor" />
              <circle cx="24" cy="28" r="2.5" fill="currentColor" />
              <circle cx="32" cy="28" r="2.5" fill="currentColor" />
              <path d="M16 6v4M32 6v4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            ¡Bienvenido a Vydre, {professional.name.split(' ')[0]}!
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Tu consultorio está listo. Estos son los 3 pasos para empezar.
          </p>
        </div>

        {/* Activation steps */}
        <ActivationSteps
          professional={professional as Professional}
          initialPatients={patients}
        />

        {/* Bottom link */}
        <div className="mt-10 text-center">
          <a
            href="/dashboard"
            className="text-sm text-muted-foreground hover:underline"
          >
            Saltar por ahora, ir al dashboard →
          </a>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Podés completar esto cuando quieras desde el dashboard
          </p>
        </div>
      </div>
    </div>
  )
}
