import { getPatients, getPatientDetail } from '@/lib/actions/patients'
import { PatientList } from '@/components/app/patient-list'
import { PatientDetailView } from '@/components/app/patient-detail'
import { PacientesMobileWrapper } from '@/components/app/pacientes-mobile-wrapper'
import { Users } from 'lucide-react'

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; id?: string }>
}) {
  const params = await searchParams
  const q = params.q
  const selectedId = params.id

  const [patients, patientDetail] = await Promise.all([
    getPatients(q),
    selectedId ? getPatientDetail(selectedId) : Promise.resolve(null),
  ])

  return (
    <PacientesMobileWrapper
      selectedId={selectedId}
      listSlot={
        <PatientList
          patients={patients}
          selectedId={selectedId}
          searchQuery={q}
        />
      }
      detailSlot={
        patientDetail ? (
          <PatientDetailView patient={patientDetail} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Users className="mb-4 h-16 w-16 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground">
              Seleccioná un paciente para ver su historial
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              O creá uno nuevo con el botón de arriba
            </p>
          </div>
        )
      }
    />
  )
}
