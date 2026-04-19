import { createClient as createServiceClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export type AuditAction =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.login_failed'
  | 'auth.2fa_enabled'
  | 'auth.2fa_disabled'
  | 'auth.2fa_verified'
  | 'auth.password_changed'
  | 'auth.session_revoked'
  | 'patient.created'
  | 'patient.updated'
  | 'appointment.created'
  | 'appointment.cancelled'
  | 'clinical_entry.created'
  | 'clinical_entry.updated'
  | 'file.uploaded'
  | 'file.deleted'
  | 'summary.sent'
  | 'reminder.sent'

export async function logAuditEvent(params: {
  professionalId?: string
  userId?: string
  action: AuditAction
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, unknown>
}) {
  try {
    let ipAddress: string | undefined
    let userAgent: string | undefined

    try {
      const headersList = await headers()
      ipAddress =
        headersList.get('x-forwarded-for') ??
        headersList.get('x-real-ip') ??
        'unknown'
      userAgent = headersList.get('user-agent') ?? undefined
      if (userAgent && userAgent.length > 200) {
        userAgent = userAgent.substring(0, 200)
      }
    } catch {
      // headers() can fail outside a request context
    }

    const serviceClient = getServiceClient()
    await serviceClient.from('audit_log').insert({
      professional_id: params.professionalId ?? null,
      user_id: params.userId ?? null,
      action: params.action,
      resource_type: params.resourceType ?? null,
      resource_id: params.resourceId ?? null,
      metadata: params.metadata ?? {},
      ip_address: ipAddress ?? null,
      user_agent: userAgent ?? null,
    })
  } catch (err) {
    // Audit log is best-effort — never blocks the main operation
    console.error('Audit log error:', err)
  }
}

export async function getAuditLog(params: {
  professionalId: string
  limit?: number
  offset?: number
  action?: string
}) {
  const serviceClient = getServiceClient()

  let query = serviceClient
    .from('audit_log')
    .select('*')
    .eq('professional_id', params.professionalId)
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 50)

  if (params.offset) {
    query = query.range(
      params.offset,
      params.offset + (params.limit ?? 50) - 1
    )
  }

  if (params.action) {
    query = query.eq('action', params.action)
  }

  const { data, error } = await query
  if (error) return []
  return data
}
