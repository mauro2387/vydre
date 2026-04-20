'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Bell, Brain } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'

const RATE_KEY = 'vydre_login_attempts'
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 min
const LOCKOUT_MS = 5 * 60 * 1000 // 5 min

function getAttempts(): { count: number; firstAttemptAt: number } {
  try {
    const raw = sessionStorage.getItem(RATE_KEY)
    if (!raw) return { count: 0, firstAttemptAt: 0 }
    return JSON.parse(raw)
  } catch {
    return { count: 0, firstAttemptAt: 0 }
  }
}

function recordAttempt() {
  const data = getAttempts()
  const now = Date.now()
  if (now - data.firstAttemptAt > WINDOW_MS) {
    sessionStorage.setItem(RATE_KEY, JSON.stringify({ count: 1, firstAttemptAt: now }))
  } else {
    sessionStorage.setItem(RATE_KEY, JSON.stringify({ count: data.count + 1, firstAttemptAt: data.firstAttemptAt }))
  }
}

function isLocked(): { locked: boolean; remainingMs: number } {
  const data = getAttempts()
  const now = Date.now()
  if (now - data.firstAttemptAt > WINDOW_MS) return { locked: false, remainingMs: 0 }
  if (data.count >= MAX_ATTEMPTS) {
    const lockEnd = data.firstAttemptAt + WINDOW_MS
    const remaining = lockEnd - now
    if (remaining > 0) return { locked: true, remainingMs: remaining }
    sessionStorage.removeItem(RATE_KEY)
    return { locked: false, remainingMs: 0 }
  }
  return { locked: false, remainingMs: 0 }
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [lockCountdown, setLockCountdown] = useState(0)

  useEffect(() => {
    const check = isLocked()
    if (check.locked) setLockCountdown(Math.ceil(check.remainingMs / 1000))
  }, [])

  useEffect(() => {
    if (lockCountdown <= 0) return
    const t = setInterval(() => {
      setLockCountdown((prev) => {
        if (prev <= 1) {
          sessionStorage.removeItem(RATE_KEY)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [lockCountdown])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const check = isLocked()
    if (check.locked) {
      setLockCountdown(Math.ceil(check.remainingMs / 1000))
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      recordAttempt()
      const afterRecord = isLocked()
      if (afterRecord.locked) {
        setLockCountdown(Math.ceil(afterRecord.remainingMs / 1000))
        setError(null)
      } else {
        setError(error.message)
      }
      setLoading(false)
      return
    }

    // Clear on success
    sessionStorage.removeItem(RATE_KEY)
    router.push('/dashboard')
  }

  const lockMinutes = Math.ceil(lockCountdown / 60)
  const lockSeconds = lockCountdown % 60

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[40%_60%]">
      {/* Branding panel — hidden on mobile */}
      <div
        className="hidden flex-col justify-between p-10 text-white md:flex"
        style={{ background: '#0F172A' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--brand)',
              color: 'white',
              fontSize: '16px',
              fontWeight: 700,
            }}
          >
            V
          </div>
          <span style={{ fontSize: '20px', fontWeight: 700, color: 'white' }}>Vydre</span>
        </div>

        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ background: 'rgba(14, 165, 233, 0.15)' }}
            >
              <Calendar className="h-4 w-4" style={{ color: '#7DD3FC' }} />
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'white' }}>Agenda inteligente</p>
              <p style={{ fontSize: '13px', color: '#94A3B8' }}>Sin complicaciones</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ background: 'rgba(14, 165, 233, 0.15)' }}
            >
              <Bell className="h-4 w-4" style={{ color: '#7DD3FC' }} />
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'white' }}>Recordatorios automáticos</p>
              <p style={{ fontSize: '13px', color: '#94A3B8' }}>Para tus pacientes</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ background: 'rgba(14, 165, 233, 0.15)' }}
            >
              <Brain className="h-4 w-4" style={{ color: '#7DD3FC' }} />
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'white' }}>Resúmenes con IA</p>
              <p style={{ fontSize: '13px', color: '#94A3B8' }}>Generados automáticamente</p>
            </div>
          </div>
        </div>

        <p style={{ fontSize: '12px', color: '#475569' }}>Vydre · Maldonado, Uruguay 🇺🇾</p>
      </div>

      {/* Form column */}
      <div
        className="flex items-center justify-center px-4"
        style={{ background: '#F8FAFC' }}
      >
        <Card className="w-full max-w-sm" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
          <CardHeader className="text-center">
            <div className="mb-2 flex justify-center md:hidden">
              <div
                className="flex items-center justify-center"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'var(--brand)',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: 700,
                }}
              >
                V
              </div>
            </div>
            <h3 className="text-xl font-semibold">Iniciá sesión</h3>
            <p className="text-sm text-muted-foreground">
              ¿No tenés cuenta?{' '}
              <Link href="/registro" className="font-medium hover:underline" style={{ color: 'var(--brand)' }}>
                Registrate acá
              </Link>
            </p>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              {lockCountdown > 0 && (
                <p className="text-sm text-destructive">
                  Demasiados intentos. Esperá {lockMinutes}:{lockSeconds.toString().padStart(2, '0')} para volver a intentar.
                </p>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading || lockCountdown > 0}>
                {loading ? 'Iniciando sesión...' : 'Ingresar a Vydre'}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                <Link href="/recuperar" className="underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
