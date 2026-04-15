import {
  Body, Container, Head, Heading, Hr, Html,
  Preview, Section, Text
} from '@react-email/components'

interface WaitlistWelcomeEmailProps {
  name: string
  position: number
}

export function WaitlistWelcomeEmail({
  name,
  position,
}: WaitlistWelcomeEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Estás en la lista de Vydre — te avisamos pronto</Preview>
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
            ¡Gracias por anotarte, {name.split(' ')[0]}!
          </Heading>

          <Text style={{ color: '#6b7280', margin: '0 0 24px' }}>
            Recibimos tu solicitud para ser médico fundador de Vydre. 
            Tenés el lugar número {position} en nuestra lista.
          </Text>

          <Section style={{
            backgroundColor: '#eff6ff',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <Text style={{ margin: '0', color: '#1e40af', fontWeight: '600', fontSize: '14px' }}>
              ¿Qué pasa ahora?
            </Text>
            <Text style={{ margin: '8px 0 0', color: '#1e40af', fontSize: '14px' }}>
              Estamos incorporando médicos de forma gradual para asegurarnos 
              de que cada uno tenga el soporte que necesita. Te vamos a 
              escribir a este email cuando sea tu turno.
            </Text>
          </Section>

          <Text style={{ color: '#374151', fontWeight: '500', marginBottom: '12px' }}>
            Con Vydre vas a poder:
          </Text>

          <Text style={{ color: '#6b7280', margin: '0 0 8px', paddingLeft: '12px' }}>
            · Agenda inteligente sin configuración compleja
          </Text>
          <Text style={{ color: '#6b7280', margin: '0 0 8px', paddingLeft: '12px' }}>
            · Recordatorios automáticos por WhatsApp y email
          </Text>
          <Text style={{ color: '#6b7280', margin: '0 0 24px', paddingLeft: '12px' }}>
            · Resúmenes de consulta generados con IA
          </Text>

          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />

          <Text style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 16px' }}>
            Mientras tanto, si tenés preguntas escribinos a contacto@vydre.com
          </Text>

          <Text style={{ color: '#9ca3af', fontSize: '12px', margin: '0' }}>
            El equipo de Vydre · Maldonado, Uruguay
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default WaitlistWelcomeEmail
