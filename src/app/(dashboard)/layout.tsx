import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from './dashboard-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

  return (
    <DashboardShell
      professionalName={professional.name}
      professionalSpecialty={professional.specialty}
    >
      {children}
    </DashboardShell>
  )
}
