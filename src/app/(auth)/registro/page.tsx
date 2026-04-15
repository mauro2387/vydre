'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Calendar, Bell, Brain } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { PasswordStrength } from '@/components/app/password-strength'

const registroSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

type RegistroForm = z.infer<typeof registroSchema>

export default function RegistroPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegistroForm>({
    resolver: zodResolver(registroSchema),
  })

  const passwordValue = watch('password') ?? ''

  async function onSubmit(data: RegistroForm) {
    setError(null)
    setLoading(true)

    const supabase = createClient()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (authData.user) {
      const { error: profileError } = await supabase
        .from('professionals')
        .insert({
          user_id: authData.user.id,
          name: data.name,
          specialty: '',
          onboarding_complete: false,
        })

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }
    }

    router.push('/onboarding')
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
      <div className="flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-sm border-0 shadow-none md:border md:shadow-sm">
          <CardHeader className="text-center">
            <h2 className="text-2xl font-bold tracking-tight md:hidden">Vydre</h2>
            <h3 className="text-xl font-semibold">Creá tu cuenta</h3>
            <p className="text-sm text-muted-foreground">
              ¿Ya tenés cuenta?{' '}
              <Link href="/login" className="text-primary underline">
                Iniciá sesión
              </Link>
            </p>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  placeholder="Dr. Juan Pérez"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Usamos tu email para enviarte notificaciones importantes.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                />
                <PasswordStrength password={passwordValue} />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
              </Button>
              <p className="text-center text-[11px] leading-tight text-muted-foreground">
                Al registrarte aceptás que Vydre guarde tus datos de forma segura según la Ley 18.331.
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
