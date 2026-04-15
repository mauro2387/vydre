'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/lib/hooks/use-media-query'

export function PacientesMobileWrapper({
  selectedId,
  listSlot,
  detailSlot,
}: {
  selectedId: string | undefined
  listSlot: React.ReactNode
  detailSlot: React.ReactNode
}) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const router = useRouter()

  // Mobile: show either list or detail
  if (isMobile) {
    if (selectedId) {
      return (
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-4 gap-1"
            onClick={() => router.push('/pacientes')}
          >
            <ChevronLeft className="h-4 w-4" />
            Volver
          </Button>
          {detailSlot}
        </div>
      )
    }
    return <div>{listSlot}</div>
  }

  // Desktop: two columns
  return (
    <div className="flex h-[calc(100vh-64px)] gap-6">
      <div className="w-[380px] shrink-0 overflow-y-auto">
        {listSlot}
      </div>
      <div className="flex-1 overflow-y-auto">
        {detailSlot}
      </div>
    </div>
  )
}
