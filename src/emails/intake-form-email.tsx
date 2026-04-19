import {
  Body, Container, Head, Heading, Hr, Html,
  Link, Preview, Section, Text, Button,
} from '@react-email/components'

interface IntakeFormEmailProps {
  patientName: string
  professionalName: string
  specialty: string
  formUrl: string
  templateName: string
}

export function IntakeFormEmail({
  patientName,
  professionalName,
  specialty,
  formUrl,
  templateName,
}: IntakeFormEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>
        {professionalName} te envió un formulario pre-consulta
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
            Formulario pre-consulta
          </Heading>

          <Text style={{ color: '#6b7280', margin: '0 0 32px' }}>
            Hola {patientName}, {professionalName} te pide que completes un breve formulario antes de tu consulta.
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
            <Text style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>
              Formulario: {templateName}
            </Text>
          </Section>

          <Section style={{ marginBottom: '32px', textAlign: 'center' }}>
            <Button
              href={formUrl}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                padding: '12px 32px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '15px',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Completar formulario
            </Button>
          </Section>

          <Text style={{ color: '#6b7280', fontSize: '13px', marginBottom: '8px' }}>
            Si el botón no funciona, copiá este enlace en tu navegador:
          </Text>
          <Link href={formUrl} style={{ color: '#2563eb', fontSize: '13px', wordBreak: 'break-all' }}>
            {formUrl}
          </Link>

          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />

          <Text style={{ color: '#9ca3af', fontSize: '12px', margin: '0' }}>
            Este mensaje fue enviado por {professionalName} a través de Vydre.
            Si no tenés un turno agendado, ignorá este mensaje.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default IntakeFormEmail
