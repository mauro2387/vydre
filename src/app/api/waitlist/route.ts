import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { sendWaitlistWelcomeEmail } from '@/lib/email'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const waitlistSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  specialty: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = waitlistSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, email, specialty, phone } = parsed.data
    const supabase = getServiceClient()

    // Check if already on waitlist
    const { data: existingWaitlist } = await supabase
      .from('waitlist')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingWaitlist) {
      return NextResponse.json(
        { error: 'Ya estás en la lista. Te avisamos cuando tengamos lugar.' },
        { status: 409 }
      )
    }

    // Check if user already has an account via auth.users
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const existingUser = authUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    )

    if (existingUser) {
      return NextResponse.json(
        { error: 'Ya tenés una cuenta en Vydre. Iniciá sesión en https://vydre.com/login' },
        { status: 409 }
      )
    }

    // Insert into waitlist
    const { error: insertError } = await supabase
      .from('waitlist')
      .insert({
        name,
        email: email.toLowerCase(),
        specialty: specialty || null,
        phone: phone || null,
        source: 'landing',
      })

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Ya estás en la lista. Te avisamos cuando tengamos lugar.' },
          { status: 409 }
        )
      }
      throw new Error(insertError.message)
    }

    // Get position in list
    const { count } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true })

    // Send welcome email (best-effort)
    try {
      await sendWaitlistWelcomeEmail({
        to: email,
        name,
        position: count ?? 1,
      })
    } catch (emailErr) {
      console.error('Failed to send waitlist welcome email:', emailErr)
    }

    return NextResponse.json({
      success: true,
      message: '¡Listo! Ya estás en la lista. Te enviamos un email de confirmación.',
    })
  } catch (err) {
    console.error('Waitlist POST error:', err)
    return NextResponse.json(
      { error: 'Algo salió mal. Intentá de nuevo.' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = getServiceClient()
    const TOTAL_SPOTS = 10

    const [waitlistResult, professionalsResult] = await Promise.all([
      supabase
        .from('waitlist')
        .select('*', { count: 'exact', head: true })
        .in('status', ['invited', 'registered']),
      supabase
        .from('professionals')
        .select('*', { count: 'exact', head: true }),
    ])

    const occupied = (waitlistResult.count ?? 0) + (professionalsResult.count ?? 0)
    const available = Math.max(0, TOTAL_SPOTS - occupied)

    return NextResponse.json({ available, total: TOTAL_SPOTS })
  } catch {
    return NextResponse.json({ available: null, total: 10 })
  }
}
