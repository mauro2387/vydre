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
      <div className="hidden flex-col justify-between bg-gray-900 p-10 text-white md:flex">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vydre</h1>
          <p className="mt-2 text-lg text-gray-400">Tu consultorio, organizado.</p>
        </div>

        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
            <p className="text-sm text-gray-300">Agenda inteligente sin complicaciones</p>
          </div>
          <div className="flex items-start gap-3">
            <Bell className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
            <p className="text-sm text-gray-300">Recordatorios automáticos para tus pacientes</p>
          </div>
          <div className="flex items-start gap-3">
            <Brain className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
            <p className="text-sm text-gray-300">Resúmenes de consulta generados con IA</p>
          </div>
        </div>

        <p className="text-xs text-gray-500">Vydre · Maldonado, Uruguay 🇺🇾</p>
      </div>

      {/* Form column */}
      <div className="flex items-center justify-center px-4">
        <Card className="w-full max-w-sm border-0 shadow-none md:border md:shadow-sm">
          <CardHeader className="text-center">
            <h2 className="text-2xl font-bold tracking-tight md:hidden">Vydre</h2>
            <h3 className="text-xl font-semibold">Iniciá sesión</h3>
            <p className="text-sm text-muted-foreground">
              ¿No tenés cuenta?{' '}
              <Link href="/registro" className="text-primary underline">
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
