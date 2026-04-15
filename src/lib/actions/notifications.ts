'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// FIX: added auth check — validates professionalId matches logged-in user
export async function createNotification(params: {
  professionalId: string
  type: 'appointment_confirmed' | 'appointment_declined' | 'appointment_reminder_sent' | 'summary_sent' | 'system'
  title: string
  body?: string
  actionUrl?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Verify the professionalId belongs to the authenticated user
  const { data: professional } = await supabase
    .from('professionals')
    .select('id')
    .eq('user_id', user.id)
    .eq('id', params.professionalId)
    .single()

  if (!professional) return

  const { error } = await supabase.from('notifications').insert({
    professional_id: params.professionalId,
    type: params.type,
    title: params.title,
    body: params.body,
    action_url: params.actionUrl ?? null,
  })

  if (error) {
    console.error('Failed to create notification:', error)
  }
}

export async function getUnreadNotifications() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: professional } = await supabase
    .from('professionals')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!professional) return []

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('professional_id', professional.id)
    .eq('read', false)
    .order('created_at', { ascending: false })
    .limit(20)

  return data ?? []
}

export async function getUnreadCount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { data: professional } = await supabase
    .from('professionals')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!professional) return 0

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('professional_id', professional.id)
    .eq('read', false)

  return count ?? 0
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // FIX: added professional_id filter — ensures user can only mark own notifications
  const { data: professional } = await supabase
    .from('professionals')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!professional) return

  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('professional_id', professional.id)

  revalidatePath('/(dashboard)')
}

export async function markAllNotificationsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: professional } = await supabase
    .from('professionals')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!professional) return

  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('professional_id', professional.id)
    .eq('read', false)

  revalidatePath('/', 'layout')
}
