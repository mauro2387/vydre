import {
  Body, Container, Head, Heading, Hr, Html,
  Link, Preview, Section, Text, Button
} from '@react-email/components'

interface ReminderEmailProps {
  patientName: string
  professionalName: string
  specialty: string
  appointmentDate: string
  appointmentTime: string
  confirmUrl: string
  declineUrl: string
}

export function ReminderEmail({
  patientName,
  professionalName,
  specialty,
  appointmentDate,
  appointmentTime,
  confirmUrl,
  declineUrl,
}: ReminderEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>
        Recordatorio de tu turno — {appointmentDate} a las {appointmentTime}
      </Preview>
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
            Recordatorio de turno
          </Heading>

          <Text style={{ color: '#6b7280', margin: '0 0 32px' }}>
            Hola {patientName}, te recordamos tu próximo turno.
          </Text>

          <Section style={{
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '32px',
          }}>
            <Text style={{ margin: '0 0 4px', fontWeight: '600', color: '#111827' }}>
              {professionalName}
            </Text>
            <Text style={{ margin: '0 0 12px', color: '#6b7280', fontSize: '14px' }}>
              {specialty}
            </Text>
            <Text style={{ margin: '0', color: '#111827', fontSize: '18px', fontWeight: '600' }}>
              {appointmentDate} · {appointmentTime}
            </Text>
          </Section>

          <Text style={{
            color: '#374151',
            marginBottom: '16px',
            fontWeight: '500',
          }}>
            ¿Podés asistir al turno?
          </Text>

          <Section style={{ marginBottom: '32px' }}>
            <Button
              href={confirmUrl}
              style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '15px',
                textDecoration: 'none',
                display: 'inline-block',
                marginRight: '12px',
              }}
            >
              Sí, confirmo mi turno
            </Button>
            <Link
              href={declineUrl}
              style={{
                color: '#6b7280',
                fontSize: '14px',
                textDecoration: 'underline',
              }}
            >
              No puedo asistir
            </Link>
          </Section>

          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />

          <Text style={{ color: '#9ca3af', fontSize: '12px', margin: '0' }}>
            Este recordatorio fue enviado por {professionalName} a través de Vydre.
            Si no tenés un turno agendado, ignorá este mensaje.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default ReminderEmail
