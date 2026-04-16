import Link from 'next/link'
import { WaitlistForm } from '@/components/landing/waitlist-form'
import {
  Calendar,
  Bell,
  Brain,
  Shield,
} from 'lucide-react'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function getSpots() {
  try {
    const res = await fetch(`${BASE_URL}/api/waitlist`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data as { available: number | null; total: number }
  } catch {
    return null
  }
}

const features = [
  {
    icon: Calendar,
    title: 'Agenda inteligente',
    desc: 'Gestión de turnos simple, sin configuración compleja.',
  },
  {
    icon: Bell,
    title: 'Recordatorios automáticos',
    desc: 'Email y WhatsApp para reducir ausencias.',
  },
  {
    icon: Brain,
    title: 'Resúmenes con IA',
    desc: 'Generación automática post-consulta para pacientes.',
  },
  {
    icon: Shield,
    title: 'Datos seguros',
    desc: 'Cumplimiento con Ley 18.331 de protección de datos.',
  },
]

export default async function LandingPage() {
  const spots = await getSpots()

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold tracking-tight">Vydre</span>
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 py-16 md:py-24">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16 items-center">
            {/* Left column */}
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
                Tu consultorio,{' '}
                <span className="text-primary">más simple</span>
              </h1>
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                Vydre es la plataforma para médicos que quieren una agenda
                inteligente, recordatorios automáticos y resúmenes de consulta
                generados con IA. Todo en un solo lugar.
              </p>

              {spots?.available != null ? (
                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
                  </span>
                  {spots.available > 0
                    ? `${spots.available} de ${spots.total} lugares disponibles`
                    : 'Lista de espera completa — anotate para cuando abramos más'}
                </div>
              ) : (
                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
                  </span>
                  Lugares disponibles
                </div>
              )}
            </div>

            {/* Right column — form */}
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h2 className="mb-1 text-lg font-semibold">
                Anotate como médico fundador
              </h2>
              <p className="mb-5 text-sm text-muted-foreground">
                Acceso anticipado gratuito a todas las funciones.
              </p>
              <WaitlistForm />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t bg-gray-50/60">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900">
              Todo lo que necesitás
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-center text-muted-foreground">
              Herramientas diseñadas específicamente para profesionales de la
              salud en Uruguay.
            </p>

            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl border bg-white p-5"
                >
                  <f.icon className="h-8 w-8 text-primary" />
                  <h3 className="mt-3 font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Vydre</span>
          <Link href="/privacidad" className="hover:text-foreground transition-colors">
            Política de privacidad
          </Link>
        </div>
      </footer>
    </div>
  )
}

