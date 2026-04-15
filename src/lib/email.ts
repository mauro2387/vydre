import { Resend } from 'resend'
import { render } from '@react-email/render'
import { ReminderEmail } from '@/emails/reminder-email'
import { SummaryEmail } from '@/emails/summary-email'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = 'Vydre <recordatorios@vydre.com>'
const FROM_EMAIL_DEV = 'onboarding@resend.dev'

function getFromEmail() {
  return process.env.NODE_ENV === 'production'
    ? FROM_EMAIL
    : FROM_EMAIL_DEV
}

export async function sendReminderEmail(params: {
  to: string
  patientName: string
  professionalName: string
  specialty: string
  appointmentDate: string
  appointmentTime: string
  confirmUrl: string
  declineUrl: string
}) {
  const html = await render(ReminderEmail({
    patientName: params.patientName,
    professionalName: params.professionalName,
    specialty: params.specialty,
    appointmentDate: params.appointmentDate,
    appointmentTime: params.appointmentTime,
    confirmUrl: params.confirmUrl,
    declineUrl: params.declineUrl,
  }))

  const { data, error } = await resend.emails.send({
    from: getFromEmail(),
    to: params.to,
    subject: `Recordatorio: turno el ${params.appointmentDate} a las ${params.appointmentTime}`,
    html,
  })

  if (error) throw new Error(`Error enviando email: ${error.message}`)
  return data
}

export async function sendSummaryEmail(params: {
  to: string
  patientName: string
  professionalName: string
  specialty: string
  appointmentDate: string
  summaryContent: string
}) {
  const html = await render(SummaryEmail({
    patientName: params.patientName,
    professionalName: params.professionalName,
    specialty: params.specialty,
    appointmentDate: params.appointmentDate,
    summaryContent: params.summaryContent,
  }))

  const { data, error } = await resend.emails.send({
    from: getFromEmail(),
    to: params.to,
    subject: `Resumen de tu consulta — ${params.appointmentDate}`,
    html,
  })

  if (error) throw new Error(`Error enviando email: ${error.message}`)
  return data
}
