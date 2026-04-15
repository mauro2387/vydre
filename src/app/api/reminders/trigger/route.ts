import { NextResponse } from 'next/server'

// Solo para desarrollo y testing local — no existe en producción
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const cronSecret = process.env.CRON_SECRET

  const res = await fetch(`${baseUrl}/api/reminders/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
    },
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
