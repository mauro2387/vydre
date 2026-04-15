'use client'

import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const isDev = process.env.NODE_ENV !== 'production'

  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-semibold">Algo salió mal</h1>
        <p className="mt-2 text-muted-foreground">
          Ocurrió un error inesperado. Podés intentar de nuevo o volver al dashboard.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset}>Intentar de nuevo</Button>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            Volver al dashboard
          </Button>
        </div>
        {isDev && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              Detalles del error (solo desarrollo)
            </summary>
            <pre className="mt-2 overflow-auto rounded-md bg-muted p-4 text-xs">
              {error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}
