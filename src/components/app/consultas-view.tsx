'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, Send, MessageCircle, Loader2, Mail, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { resendClinicalSummary } from '@/lib/actions/clinical'
import { parseActionError } from '@/lib/utils/error-messages'
import { useDebounce } from '@/lib/hooks/use-debounce'
import type { ClinicalEntry, Professional } from '@/lib/types/database.types'

type ConsultationItem = ClinicalEntry & {
  appointments: { start_at: string; end_at: string } | null
  patients: { id: string; name: string; email: string | null; phone: string } | null
}

export function ConsultasView({
  consultations,
  professional,
  search,
}: {
  consultations: ConsultationItem[]
  professional: Professional
  search: string
}) {
  const router = useRouter()
  const [query, setQuery] = useState(search)
  const debouncedQuery = useDebounce(query, 300)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // Update URL only after debounce settles, not on every keystroke.
  useEffect(() => {
    if (debouncedQuery === search) return
    startTransition(() => {
      const params = new URLSearchParams()
      if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim())
      router.push(`/consultas${params.toString() ? '?' + params.toString() : ''}`)
    })
  }, [debouncedQuery, search, router])

  const handleResend = async (entryId: string) => {
    try {
      setSendingId(entryId)
      await resendClinicalSummary(entryId)
      toast.success('Resumen reenviado')
    } catch (error) {
      toast.error(parseActionError(error))
    } finally {
      setSendingId(null)
    }
  }

  const handleWhatsApp = (phone: string, patientName: string, summary: string | null) => {
    const cleanPhone = phone.replace(/\D/g, '')
    const phoneWithCountry = cleanPhone.startsWith('598') ? cleanPhone : `598${cleanPhone}`
    const message = summary
      ? `Hola ${patientName.split(' ')[0]}, te envío el resumen de tu consulta con ${professional.name}:\n\n${summary}`
      : `Hola ${patientName.split(' ')[0]}, te contacto respecto a tu última consulta con ${professional.name}.`
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Consultas anteriores</h1>
          <p className="text-sm text-muted-foreground">
            {consultations.length} consulta{consultations.length !== 1 ? 's' : ''} registrada{consultations.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, fecha o motivo..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List */}
      {consultations.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {search ? 'No se encontraron consultas con esa búsqueda.' : 'Aún no tenés consultas registradas.'}
        </div>
      ) : (
        <div className="space-y-3">
          {consultations.map((entry) => {
            const isExpanded = expandedId === entry.id
            const dateStr = entry.appointments?.start_at
              ? format(new Date(entry.appointments.start_at), "EEEE d 'de' MMMM, yyyy · HH:mm", { locale: es })
              : format(new Date(entry.created_at), "d 'de' MMMM, yyyy", { locale: es })
            const capitalizedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)
            const patientName = entry.patients?.name ?? 'Paciente'
            const patientEmail = entry.patients?.email
            const patientPhone = entry.patients?.phone ?? ''
            const isSending = sendingId === entry.id

            return (
              <Card key={entry.id} className="overflow-hidden">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{patientName}</p>
                        {entry.ai_summary_sent_at && (
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            <Mail className="mr-1 h-3 w-3" />
                            Enviado
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {entry.chief_complaint ?? 'Sin motivo registrado'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {capitalizedDate}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </CardContent>
                </button>

                {isExpanded && (
                  <div className="border-t bg-muted/30 px-4 py-4 space-y-3">
                    {/* Details */}
                    <div className="grid gap-3 text-sm">
                      {entry.chief_complaint && (
                        <div>
                          <p className="font-medium text-muted-foreground">Motivo de consulta</p>
                          <p>{entry.chief_complaint}</p>
                        </div>
                      )}
                      {entry.diagnosis && (
                        <div>
                          <p className="font-medium text-muted-foreground">Diagnóstico</p>
                          <p>{entry.diagnosis}</p>
                        </div>
                      )}
                      {entry.treatment_plan && (
                        <div>
                          <p className="font-medium text-muted-foreground">Plan de tratamiento</p>
                          <p>{entry.treatment_plan}</p>
                        </div>
                      )}
                      {entry.clinical_history && (
                        <div>
                          <p className="font-medium text-muted-foreground">Antecedentes</p>
                          <p>{entry.clinical_history}</p>
                        </div>
                      )}
                      {entry.physical_exam && (
                        <div>
                          <p className="font-medium text-muted-foreground">Examen físico</p>
                          <p>{entry.physical_exam}</p>
                        </div>
                      )}
                      {entry.indications && (
                        <div>
                          <p className="font-medium text-muted-foreground">Indicaciones</p>
                          <p>{entry.indications}</p>
                        </div>
                      )}
                      {entry.next_steps && (
                        <div>
                          <p className="font-medium text-muted-foreground">Próximos pasos</p>
                          <p>{entry.next_steps}</p>
                        </div>
                      )}
                      {entry.medications && Array.isArray(entry.medications) && (entry.medications as { name: string; dose?: string; frequency?: string }[]).length > 0 && (
                        <div>
                          <p className="font-medium text-muted-foreground">Medicación indicada</p>
                          <ul className="list-disc pl-4 space-y-0.5">
                            {(entry.medications as { name: string; dose?: string; frequency?: string }[]).map((med, i) => (
                              <li key={i}>
                                {med.name}
                                {med.dose ? ` — ${med.dose}` : ''}
                                {med.frequency ? ` (${med.frequency})` : ''}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* AI Summary */}
                    {entry.ai_summary && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Resumen para el paciente</p>
                          <div className="prose prose-sm max-w-none rounded-md p-3 border bg-background">
                            <ReactMarkdown>{entry.ai_summary}</ReactMarkdown>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Actions */}
                    <Separator />
                    <div className="flex flex-wrap gap-2">
                      {patientEmail && entry.ai_summary && (
                        <Button
                          size="sm"
                          variant={entry.ai_summary_sent_at ? 'outline' : 'default'}
                          onClick={() => handleResend(entry.id)}
                          disabled={isSending}
                        >
                          {isSending ? (
                            <>
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Send className="mr-2 h-3.5 w-3.5" />
                              {entry.ai_summary_sent_at ? 'Volver a notificar' : 'Enviar resumen'}
                            </>
                          )}
                        </Button>
                      )}
                      {patientPhone && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleWhatsApp(patientPhone, patientName, entry.ai_summary)}
                        >
                          <MessageCircle className="mr-2 h-3.5 w-3.5" />
                          Enviar por WhatsApp
                        </Button>
                      )}
                      {!patientEmail && !patientPhone && (
                        <p className="text-xs text-muted-foreground">
                          El paciente no tiene email ni teléfono registrado.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
