'use client'

import { Check, X } from 'lucide-react'

export function PasswordStrength({ password }: { password: string }) {
  const hasMinLength = password.length >= 8
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)

  if (!password) return null

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-center gap-2 text-xs">
        {hasMinLength ? (
          <Check className="h-3 w-3 text-green-600" />
        ) : (
          <X className="h-3 w-3 text-muted-foreground" />
        )}
        <span className={hasMinLength ? 'text-green-600' : 'text-muted-foreground'}>
          Mínimo 8 caracteres
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        {hasLetter ? (
          <Check className="h-3 w-3 text-green-600" />
        ) : (
          <X className="h-3 w-3 text-muted-foreground" />
        )}
        <span className={hasLetter ? 'text-green-600' : 'text-muted-foreground'}>
          Al menos una letra
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        {hasNumber ? (
          <Check className="h-3 w-3 text-green-600" />
        ) : (
          <X className="h-3 w-3 text-muted-foreground" />
        )}
        <span className={hasNumber ? 'text-green-600' : 'text-muted-foreground'}>
          Al menos un número
        </span>
      </div>
    </div>
  )
}
