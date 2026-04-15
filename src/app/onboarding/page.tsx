import { redirect } from 'next/navigation'
import { getProfessional } from '@/lib/actions/professional'
import { OnboardingForm } from '@/components/app/onboarding-form'

export default async function OnboardingPage() {
  const professional = await getProfessional()

  if (!professional) {
    redirect('/login')
  }

  if (professional.onboarding_complete) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <OnboardingForm
          initialName={professional.name}
        />
      </div>
    </div>
  )
}
