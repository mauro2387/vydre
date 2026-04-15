import {
  Body, Container, Head, Heading, Hr, Html,
  Preview, Section, Text
} from '@react-email/components'

interface SummaryEmailProps {
  patientName: string
  professionalName: string
  specialty: string
  appointmentDate: string
  summaryContent: string
}

export function SummaryEmail({
  patientName,
  professionalName,
  specialty,
  appointmentDate,
  summaryContent,
}: SummaryEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Resumen de tu consulta del {appointmentDate}</Preview>
      <Body style={{
        backgroundColor: '#f9fafb',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <Container style={{
          maxWidth: '560px',
          margin: '40px auto',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '40px',
          border: '1px solid #e5e7eb',
        }}>
          <Heading style={{
            fontSize: '22px',
            fontWeight: '600',
            color: '#111827',
            margin: '0 0 8px',
          }}>
            Resumen de tu consulta
          </Heading>

          <Text style={{ color: '#6b7280', margin: '0 0 24px' }}>
            Hola {patientName}, aquí tenés el resumen de tu consulta
            con {professionalName}.
          </Text>

          <Section style={{
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            padding: '16px 20px',
            marginBottom: '24px',
          }}>
            <Text style={{
              margin: '0',
              color: '#6b7280',
              fontSize: '13px',
            }}>
              {specialty} · {appointmentDate}
            </Text>
          </Section>

          <Section style={{
            backgroundColor: '#eff6ff',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '32px',
            borderLeft: '3px solid #3b82f6',
          }}>
            <Text style={{
              margin: '0',
              color: '#1e3a5f',
              lineHeight: '1.6',
              fontSize: '15px',
              whiteSpace: 'pre-wrap',
            }}>
              {summaryContent}
            </Text>
          </Section>

          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />

          <Text style={{ color: '#9ca3af', fontSize: '12px', margin: '0' }}>
            Resumen generado por {professionalName} vía Vydre.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default SummaryEmail
