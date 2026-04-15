'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, UserPlus, CalendarPlus, Bell, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Professional } from '@/lib/types/database.types'

export function ActivationBanner({ professional }: { professional: Professional }) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('activation-banner-dismissed')
    if (stored === 'true') setDismissed(true)
  }, [])

  if (professional.activation_complete || dismissed) return null

  const completedCount = [
    professional.first_patient_created,
    professional.first_appointment_created,
    professional.first_reminder_sent,
  ].filter(Boolean).length

  const progressPercent = Math.round((completedCount / 3) * 100)

  function handleDismiss() {
    sessionStorage.setItem('activation-banner-dismissed', 'true')
    setDismissed(true)
  }

  // Determine next step
  let nextStepText: string
  let nextStepIcon: typeof UserPlus
  let nextStepAction: () => void

  if (!professional.first_patient_created) {
    nextStepText = 'Agregá tu primer paciente'
    nextStepIcon = UserPlus
    nextStepAction = () => router.push('/pacientes')
  } else if (!professional.first_appointment_created) {
    nextStepText = 'Creá tu primer turno'
    nextStepIcon = CalendarPlus
    nextStepAction = () => router.push('/agenda')
  } else {
    nextStepText = 'Enviá tu primer recordatorio'
    nextStepIcon = Bell
    nextStepAction = () => router.push('/agenda')
  }

  const NextIcon = nextStepIcon

  return (
    <div className="relative rounded-lg border border-blue-200 bg-blue-50 p-4">
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-3 rounded-sm p-0.5 text-blue-400 hover:text-blue-600"
        aria-label="Cerrar"
      >
        <X className="h-4 w-4" />
      </button>

      <p className="mb-2 text-sm font-semibold text-blue-900">
        Completá tu configuración inicial
      </p>

      {/* Progress bar */}
      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-blue-100">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <div className="mb-3 text-xs text-blue-600">{progressPercent}% completado</div>

      {/* Next step */}
      <div className="flex items-center gap-3">
        <NextIcon className="h-4 w-4 shrink-0 text-blue-600" />
        <span className="flex-1 text-sm text-blue-800">{nextStepText}</span>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100"
          onClick={nextStepAction}
        >
          Ir <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
