import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfessional } from '@/lib/actions/professional'
import { ConfiguracionView } from '@/components/app/configuracion-view'

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const professional = await getProfessional()
  if (!professional) redirect('/onboarding')

  return (
    <ConfiguracionView
      professional={professional}
      userEmail={user?.email ?? ''}
    />
  )
}
