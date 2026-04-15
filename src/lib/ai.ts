import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Prompts base por especialidad
const SPECIALTY_PROMPTS: Record<string, string> = {
  'Odontología': `Sos un asistente de odontología que genera resúmenes 
    claros y profesionales para pacientes. El resumen debe ser amigable, 
    en español rioplatense, explicar qué se hizo en términos simples 
    y qué hacer después. Máximo 3 párrafos cortos.`,

  'Medicina Estética': `Sos un asistente de medicina estética que genera 
    resúmenes post-tratamiento para pacientes. El resumen debe ser claro, 
    en español rioplatense, mencionar el procedimiento realizado, 
    cuidados post-tratamiento y próximos pasos. Máximo 3 párrafos cortos.`,

  'Psicología': `Sos un asistente de psicología que genera resúmenes 
    de sesión para pacientes. El tono debe ser cálido y empático, 
    en español rioplatense. Menciona los temas trabajados en términos 
    generales (sin detalles sensibles) y cualquier tarea o ejercicio 
    acordado. Máximo 2 párrafos cortos.`,

  'Ginecología': `Sos un asistente de ginecología que genera resúmenes 
    de consulta para pacientes. El resumen debe ser claro y profesional, 
    en español rioplatense, explicar los hallazgos en términos simples 
    y las indicaciones dadas. Máximo 3 párrafos cortos.`,

  default: `Sos un asistente médico que genera resúmenes de consulta 
    claros para pacientes. El resumen debe ser profesional pero accesible, 
    en español rioplatense, explicar qué ocurrió en la consulta 
    y las indicaciones del profesional. Máximo 3 párrafos cortos.`,
}

function getSystemPrompt(specialty: string): string {
  return SPECIALTY_PROMPTS[specialty] ?? SPECIALTY_PROMPTS['default']
}

export async function generateConsultationSummary(params: {
  specialty: string
  reason: string | null
  treatment: string | null
  observations: string | null
  patientName: string
}): Promise<string> {
  const { specialty, reason, treatment, observations, patientName } = params

  const userContent = `
Generá un resumen para el paciente ${patientName} sobre su consulta de hoy.

Información de la consulta:
${reason ? `- Motivo de consulta: ${reason}` : ''}
${treatment ? `- Tratamiento / procedimiento realizado: ${treatment}` : ''}
${observations ? `- Observaciones del profesional: ${observations}` : ''}

El resumen debe:
- Estar dirigido directamente al paciente (usar "te" o "vos")
- Usar lenguaje claro, sin jerga médica compleja
- Ser breve: máximo 3 párrafos
- NO incluir datos sensibles más allá de lo proporcionado
- Terminar con algo positivo o alentador si corresponde
`.trim()

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 500,
    system: getSystemPrompt(specialty),
    messages: [
      { role: 'user', content: userContent }
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Respuesta inesperada del modelo')
  }

  return content.text.trim()
}
