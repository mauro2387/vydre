import { Resend } from 'resend'
import { render } from '@react-email/render'
import { ReminderEmail } from '@/emails/reminder-email'
import { SummaryEmail } from '@/emails/summary-email'
import { WaitlistWelcomeEmail } from '@/emails/waitlist-welcome-email'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = 'Vydre <recordatorios@vydre.com>'
const REPLY_TO = 'soporte@vydre.com'
const UNSUBSCRIBE_MAILTO = 'unsubscribe@vydre.com'

type SendInput = {
  to: string
  subject: string
  html: string
  category: 'reminder' | 'summary' | 'waitlist' | 'system'
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Send an email with exponential backoff (retries on Resend 5xx / network errors).
 * Does NOT retry on 4xx (invalid email, etc).
 */
async function sendWithRetry(input: SendInput, maxAttempts = 3) {
  let lastErr: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        replyTo: REPLY_TO,
        to: input.to,
        subject: input.subject,
        html: input.html,
        headers: {
          'List-Unsubscribe': `<mailto:${UNSUBSCRIBE_MAILTO}?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'X-Entity-Ref-ID': `vydre-${input.category}-${Date.now()}`,
        },
      })

      if (error) {
        const status = (error as { statusCode?: number }).statusCode ?? 0
        // Only retry on server errors / rate limits
        if ((status >= 500 || status === 429) && attempt < maxAttempts) {
          lastErr = error
          await sleep(2 ** (attempt - 1) * 500) // 500ms, 1s, 2s
          continue
        }
        throw new Error(`Error enviando email: ${error.message}`)
      }

      return data
    } catch (err) {
      lastErr = err
      if (attempt === maxAttempts) throw err
      await sleep(2 ** (attempt - 1) * 500)
    }
  }
  throw lastErr ?? new Error('Error enviando email')
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

  return sendWithRetry({
    to: params.to,
    subject: `Recordatorio: turno el ${params.appointmentDate} a las ${params.appointmentTime}`,
    html,
    category: 'reminder',
  })
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

  return sendWithRetry({
    to: params.to,
    subject: `Resumen de tu consulta — ${params.appointmentDate}`,
    html,
    category: 'summary',
  })
}

export async function sendWaitlistWelcomeEmail(params: {
  to: string
  name: string
  position: number
}) {
  const html = await render(WaitlistWelcomeEmail({
    name: params.name,
    position: params.position,
  }))

  return sendWithRetry({
    to: params.to,
    subject: '¡Estás en la lista de Vydre!',
    html,
    category: 'waitlist',
  })
}
