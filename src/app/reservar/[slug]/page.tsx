import { notFound } from 'next/navigation'
import { getPublicBookingPage } from '@/lib/actions/booking'
import { BookingClient } from './booking-client'

export default async function ReservarPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const page = await getPublicBookingPage(slug)

  if (!page) notFound()

  const professional = page.professionals as unknown as {
    id: string
    name: string
    specialty: string | null
    timezone: string
    schedule: Record<string, { start: string; end: string } | null>
  } | null

  if (!professional) notFound()

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-white px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">{page.title ?? professional.name}</h1>
        {professional.specialty && (
          <p className="text-muted-foreground mt-1">{professional.specialty}</p>
        )}
        {page.description && (
          <p className="text-muted-foreground mt-2 text-sm">{page.description}</p>
        )}
      </div>

      <BookingClient
        slug={slug}
        professionalId={professional.id}
        timezone={professional.timezone}
        maxAdvanceDays={page.max_advance_days}
      />
    </div>
  )
}
