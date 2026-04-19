'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Shield, Copy, Check, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type Factor = {
  id: string
  friendly_name?: string
  factor_type: string
  status: string
  created_at: string
}

type SetupState =
  | { step: 'loading' }
  | { step: 'disabled' }
  | { step: 'enrolling'; factorId: string; qrCode: string; secret: string }
  | { step: 'enabled'; factor: Factor }

export function TwoFactorSetup() {
  const [state, setState] = useState<SetupState>({ step: 'loading' })
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showDisable, setShowDisable] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [disabling, setDisabling] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const disableInputRef = useRef<HTMLInputElement>(null)

  const checkFactors = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) {
      setState({ step: 'disabled' })
      return
    }
    const totp = data.totp?.find((f: Factor) => f.status === 'verified')
    if (totp) {
      setState({ step: 'enabled', factor: totp })
    } else {
      setState({ step: 'disabled' })
    }
  }, [])

  useEffect(() => {
    checkFactors()
  }, [checkFactors])

  const startEnrollment = async () => {
    const supabase = createClient()
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
    })
    if (error || !data) {
      toast.error('Error al iniciar configuración de 2FA')
      return
    }
    setState({
      step: 'enrolling',
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    })
    setCode('')
    setError(null)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleCodeChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6)
    setCode(cleaned)
    setError(null)
    if (cleaned.length === 6) {
      verifyCode(cleaned)
    }
  }

  const verifyCode = async (codeValue: string) => {
    if (state.step !== 'enrolling') return
    setVerifying(true)
    setError(null)

    const supabase = createClient()
    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId: state.factorId })

    if (challengeError || !challenge) {
      setError('Error al generar el desafío')
      setVerifying(false)
      return
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: state.factorId,
      challengeId: challenge.id,
      code: codeValue,
    })

    if (verifyError) {
      setError('Código incorrecto. Intentá de nuevo.')
      setCode('')
      setVerifying(false)
      setTimeout(() => inputRef.current?.focus(), 100)
      return
    }

    toast.success('Doble factor activado correctamente')
    setVerifying(false)
    checkFactors()
  }

  const handleDisable = async () => {
    if (state.step !== 'enabled') return
    setDisabling(true)

    const supabase = createClient()

    // Verify current code first
    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId: state.factor.id })

    if (challengeError || !challenge) {
      toast.error('Error al generar el desafío')
      setDisabling(false)
      return
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: state.factor.id,
      challengeId: challenge.id,
      code: disableCode,
    })

    if (verifyError) {
      toast.error('Código incorrecto')
      setDisableCode('')
      setDisabling(false)
      setTimeout(() => disableInputRef.current?.focus(), 100)
      return
    }

    const { error: unenrollError } = await supabase.auth.mfa.unenroll({
      factorId: state.factor.id,
    })

    if (unenrollError) {
      toast.error('Error al deshabilitar 2FA')
      setDisabling(false)
      return
    }

    toast.success('Doble factor deshabilitado')
    setDisabling(false)
    setShowDisable(false)
    setDisableCode('')
    setState({ step: 'disabled' })
  }

  const formatSecret = (secret: string) =>
    secret.match(/.{1,4}/g)?.join(' ') ?? secret

  const copySecret = () => {
    if (state.step !== 'enrolling') return
    navigator.clipboard.writeText(state.secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (state.step === 'loading') {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card id="2fa">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Autenticación de dos factores
            </span>
            {state.step === 'enabled' && (
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                <ShieldCheck className="mr-1 h-3 w-3" />
                Activo
              </Badge>
            )}
            {state.step === 'disabled' && (
              <Badge variant="outline" className="border-orange-300 text-orange-600">
                <ShieldAlert className="mr-1 h-3 w-3" />
                No configurado
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* STATE: Disabled */}
          {state.step === 'disabled' && (
            <>
              <p className="text-sm text-muted-foreground">
                El doble factor agrega una capa extra de seguridad.
                Al habilitarlo, necesitarás tu teléfono además de tu
                contraseña para ingresar a Vydre.
              </p>
              <Button onClick={startEnrollment}>Configurar 2FA</Button>
            </>
          )}

          {/* STATE: Enrolling */}
          {state.step === 'enrolling' && (
            <div className="space-y-4">
              {/* QR Code */}
              <div className="flex justify-center">
                <div
                  className="h-[200px] w-[200px] [&_svg]:h-full [&_svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: state.qrCode }}
                />
              </div>

              {/* Manual secret */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Código manual (si no podés escanear el QR):
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono tracking-wider">
                    {formatSecret(state.secret)}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copySecret}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Instructions */}
              <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <p>1. Abrí Google Authenticator, Authy o cualquier app TOTP</p>
                <p>2. Escaneá el código QR o ingresá el código manual</p>
                <p>3. Ingresá el código de 6 dígitos que genera la app</p>
              </div>

              {/* Verification input */}
              <div className="space-y-2">
                <Label>Código de verificación</Label>
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
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setState({ step: 'disabled' })}
                  disabled={verifying}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => verifyCode(code)}
                  disabled={code.length !== 6 || verifying}
                >
                  {verifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    'Verificar y activar'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STATE: Enabled */}
          {state.step === 'enabled' && (
            <>
              <p className="text-sm text-muted-foreground">
                Tu cuenta está protegida con doble factor.
              </p>
              <p className="text-xs text-muted-foreground">
                Aplicación configurada · Activado el{' '}
                {new Date(state.factor.created_at).toLocaleDateString('es-AR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <Button
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => {
                  setShowDisable(true)
                  setDisableCode('')
                  setTimeout(() => disableInputRef.current?.focus(), 100)
                }}
              >
                Deshabilitar 2FA
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Disable 2FA dialog */}
      <AlertDialog open={showDisable} onOpenChange={setShowDisable}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Deshabilitar el doble factor?</AlertDialogTitle>
            <AlertDialogDescription>
              Tu cuenta quedará protegida solo con tu contraseña.
              Ingresá el código actual de tu app para confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Input
              ref={disableInputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="000000"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              disabled={disabling}
              className="text-center text-2xl font-mono tracking-[0.5em]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disabling}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisable}
              disabled={disableCode.length !== 6 || disabling}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {disabling ? 'Deshabilitando...' : 'Deshabilitar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
