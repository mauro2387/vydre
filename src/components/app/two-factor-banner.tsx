'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShieldAlert, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const DISMISS_KEY = 'vydre_2fa_banner_dismissed'

export function TwoFactorBanner() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return true
    return sessionStorage.getItem(DISMISS_KEY) === '1'
  })

  if (dismissed) return null

  return (
    <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
      <ShieldAlert className="h-5 w-5 shrink-0 text-orange-600" />
      <div className="flex-1">
        <p className="text-sm font-medium text-orange-800">
          Tu cuenta no tiene doble factor activado
        </p>
        <p className="text-xs text-orange-600">
          Protegé los datos de tus pacientes habilitando 2FA.{' '}
          <Link href="/configuracion#2fa" className="underline font-medium">
            Configurar ahora
          </Link>
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-orange-400 hover:text-orange-600"
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, '1')
          setDismissed(true)
        }}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
