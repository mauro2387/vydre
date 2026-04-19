import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SecurityView } from '@/components/app/security-view'
import { getAuditLog } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export default async function SeguridadPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: prof } = await supabase
    .from('professionals')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!prof) redirect('/login')

  const { data: factors } = await supabase.auth.mfa.listFactors()
  const has2FA = factors?.totp?.some((f) => f.status === 'verified') ?? false

  const auditEntries = await getAuditLog({
    professionalId: prof.id,
    limit: 50,
  })

  return (
    <SecurityView
      has2FA={has2FA}
      auditEntries={auditEntries}
    />
  )
}
