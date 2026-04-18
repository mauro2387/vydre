'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'

export default function RecuperarPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/api/auth/callback?next=/actualizar-contrasena`,
    })

    setLoading(false)

    // Always show success to avoid account enumeration.
    setSent(true)
    if (error) {
      // Log but don't surface specific error to user.
      console.error('resetPasswordForEmail error:', error.message)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <h2 className="text-2xl font-bold tracking-tight">Vydre</h2>
          <h3 className="text-xl font-semibold">Recuperar contraseña</h3>
          <p className="text-sm text-muted-foreground">
            Te enviamos un link para que puedas cambiarla.
          </p>
        </CardHeader>
        {sent ? (
          <CardContent className="space-y-4 text-center">
            <p className="text-sm">
              Si existe una cuenta con ese email, vas a recibir un link en unos
              minutos. Revisá tu bandeja de entrada y la carpeta de spam.
            </p>
            <Link href="/login" className="inline-block text-sm text-primary underline">
              Volver al inicio de sesión
            </Link>
          </CardContent>
        ) : (
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
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar link de recuperación'}
              </Button>
              <Link href="/login" className="text-center text-sm text-muted-foreground underline">
                Volver
              </Link>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  )
}
