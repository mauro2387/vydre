'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Bell, Brain } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

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
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Iniciando sesión...' : 'Ingresar a Vydre'}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                ¿Olvidaste tu contraseña? Contactanos a{' '}
                <a href="mailto:contacto@vydre.com" className="underline">
                  contacto@vydre.com
                </a>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
