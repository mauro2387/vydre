import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * OAuth / password-recovery callback.
 * Supabase redirects here with ?code=... after the user clicks the email link.
 * We exchange the code for a session and then redirect to `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=invalid_code`)
  }

  // Only allow same-origin relative paths for `next`.
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
  return NextResponse.redirect(`${origin}${safeNext}`)
}
