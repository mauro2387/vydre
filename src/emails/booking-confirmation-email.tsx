import {
  Body, Container, Head, Heading, Hr, Html,
  Preview, Section, Text,
} from '@react-email/components'

interface BookingConfirmationEmailProps {
  patientName: string
  professionalName: string
  specialty: string
  appointmentDate: string
  appointmentTime: string
}

export function BookingConfirmationEmail({
  patientName,
  professionalName,
  specialty,
  appointmentDate,
  appointmentTime,
}: BookingConfirmationEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>
        Tu turno fue reservado — {appointmentDate} a las {appointmentTime}
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
            ¡Turno confirmado!
          </Heading>

          <Text style={{ color: '#6b7280', margin: '0 0 32px' }}>
            Hola {patientName}, tu turno fue reservado con éxito.
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

          <Text style={{ color: '#374151', marginBottom: '16px' }}>
            Te enviaremos un recordatorio antes de tu turno. Si necesitás cancelar o reprogramar, contactá directamente al profesional.
          </Text>

          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />

          <Text style={{ color: '#9ca3af', fontSize: '12px', margin: '0' }}>
            Este mensaje fue enviado por {professionalName} a través de Vydre.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default BookingConfirmationEmail
