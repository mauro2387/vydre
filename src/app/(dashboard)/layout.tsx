import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SidebarNav } from './sidebar-nav'
import { Toaster } from 'sonner'

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
    <div className="flex min-h-screen">
      <SidebarNav professionalName={professional.name} />
      <main className="flex-1 p-8">
        {children}
      </main>
      <Toaster richColors position="bottom-right" />
    </div>
  )
}
