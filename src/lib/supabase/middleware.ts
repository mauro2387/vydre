import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/lib/types/database.types'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl

  const isPublicRoute =
    url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/registro') ||
    url.pathname.startsWith('/recuperar') ||
    url.pathname.startsWith('/api/auth/callback') ||
    url.pathname.startsWith('/confirmar') ||
    url.pathname.startsWith('/privacidad') ||
    url.pathname.startsWith('/api/waitlist') ||
    url.pathname.startsWith('/reservar') ||
    url.pathname.startsWith('/formulario') ||
    url.pathname === '/'

  if (!user && !isPublicRoute) {
    // Allow /verificar-2fa only for authenticated users
    if (url.pathname.startsWith('/verificar-2fa')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && (url.pathname === '/login' || url.pathname === '/registro' || url.pathname === '/recuperar')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Check MFA assurance level for authenticated users on protected routes
  if (user && !isPublicRoute && !url.pathname.startsWith('/verificar-2fa')) {
    try {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (data && data.nextLevel === 'aal2' && data.currentLevel !== 'aal2') {
        return NextResponse.redirect(new URL('/verificar-2fa', request.url))
      }
    } catch {
      // If MFA check fails, continue normally
    }
  }

  // If user is on /verificar-2fa but already at aal2, redirect to dashboard
  if (user && url.pathname.startsWith('/verificar-2fa')) {
    try {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (data && data.currentLevel === 'aal2') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } catch {
      // Continue
    }
  }

  return supabaseResponse
}
