import { getAllConsultations } from '@/lib/actions/clinical'
import { getProfessional } from '@/lib/actions/professional'
import { redirect } from 'next/navigation'
import { ConsultasView } from '@/components/app/consultas-view'

export default async function ConsultasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const professional = await getProfessional()
  if (!professional) redirect('/login')

  const { q } = await searchParams
  const consultations = await getAllConsultations(q)

  return (
    <ConsultasView
      consultations={consultations}
      professional={professional}
      search={q ?? ''}
    />
  )
}
