'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function Verificar2FAPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function loadFactor() {
      const supabase = createClient()
      const { data } = await supabase.auth.mfa.listFactors()
      const totp = data?.totp?.find((f) => f.status === 'verified')
      if (totp) {
        setFactorId(totp.id)
      }
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
    loadFactor()
  }, [])

  const handleCodeChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6)
    setCode(cleaned)
    setError(null)
    if (cleaned.length === 6) {
      handleVerify(cleaned)
    }
  }

  const handleVerify = async (codeValue?: string) => {
    const toVerify = codeValue ?? code
    if (!factorId || toVerify.length !== 6) return

    setVerifying(true)
    setError(null)

    const supabase = createClient()

    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId })

    if (challengeError || !challenge) {
      setError('Error de verificación. Intentá de nuevo.')
      setVerifying(false)
      return
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: toVerify,
    })

    if (verifyError) {
      setError('Código incorrecto. Verificá tu app.')
      setCode('')
      setVerifying(false)
      setTimeout(() => inputRef.current?.focus(), 100)
      return
    }

    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Vydre</h1>
          <div className="mx-auto mt-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h2 className="mt-3 text-lg font-semibold">
            Verificación de dos factores
          </h2>
          <p className="text-sm text-muted-foreground">
            Ingresá el código de 6 dígitos de tu app de autenticación
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoComplete="one-time-code"
            placeholder="000000"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            disabled={verifying}
            className="text-center text-2xl font-mono tracking-[0.5em]"
          />
          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}
          <Button
            onClick={() => handleVerify()}
            disabled={code.length !== 6 || verifying}
            className="w-full"
          >
            {verifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              'Verificar'
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            ¿Problemas para acceder?{' '}
            <a
              href="mailto:contacto@vydre.com"
              className="text-primary underline"
            >
              Escribinos a contacto@vydre.com
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
