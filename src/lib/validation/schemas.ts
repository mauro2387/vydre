import { z } from 'zod'

// ---- Common primitives ----
export const uuidSchema = z.string().uuid({ message: 'ID inválido' })

export const isoDateTimeSchema = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Fecha/hora inválida' })

export const emailOptionalSchema = z
  .string()
  .trim()
  .max(200)
  .email({ message: 'Email inválido' })
  .optional()
  .or(z.literal(''))
  .transform((v) => (v ? v : undefined))

export const phoneSchema = z
  .string()
  .trim()
  .max(30, { message: 'Teléfono demasiado largo' })

// Accepts IANA timezone like "America/Montevideo"
export const timezoneSchema = z
  .string()
  .min(1)
  .max(60)
  .refine((tz) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date())
      return true
    } catch {
      return false
    }
  }, { message: 'Zona horaria inválida' })

// ---- Patients ----
export const createPatientSchema = z.object({
  name: z.string().trim().min(2, 'Nombre muy corto').max(120, 'Nombre muy largo'),
  phone: phoneSchema,
  email: emailOptionalSchema,
  notes: z.string().trim().max(2000).optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
})
export type CreatePatientInput = z.infer<typeof createPatientSchema>

export const updatePatientSchema = createPatientSchema

// ---- Appointments ----
export const createAppointmentSchema = z
  .object({
    patient_id: uuidSchema,
    start_at: isoDateTimeSchema,
    end_at: isoDateTimeSchema,
    notes: z.string().trim().max(1000).optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
  })
  .refine((d) => Date.parse(d.end_at) > Date.parse(d.start_at), {
    message: 'La hora de fin debe ser posterior al inicio',
    path: ['end_at'],
  })
  .refine((d) => Date.parse(d.end_at) - Date.parse(d.start_at) <= 1000 * 60 * 60 * 8, {
    message: 'Duración máxima de 8 horas',
    path: ['end_at'],
  })

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>

export const appointmentStatusSchema = z.enum([
  'scheduled',
  'confirmed',
  'cancelled',
  'completed',
  'no_show',
])
export type AppointmentStatusInput = z.infer<typeof appointmentStatusSchema>

// ---- Clinical entries ----
export const medicationEntrySchema = z.object({
  name: z.string().trim().min(1).max(200),
  dose: z.string().trim().max(100).optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
  frequency: z.string().trim().max(100).optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
  duration: z.string().trim().max(100).optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
  notes: z.string().trim().max(500).optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
})

export const saveClinicalEntrySchema = z.object({
  appointmentId: uuidSchema,
  patientId: uuidSchema,
  templateType: z.string().trim().min(1).max(60),
  chiefComplaint: z.string().trim().max(4000).optional(),
  clinicalHistory: z.string().trim().max(8000).optional(),
  physicalExam: z.string().trim().max(8000).optional(),
  diagnosis: z.string().trim().max(4000).optional(),
  treatmentPlan: z.string().trim().max(8000).optional(),
  medications: z.array(medicationEntrySchema).max(30).optional(),
  indications: z.string().trim().max(8000).optional(),
  nextSteps: z.string().trim().max(4000).optional(),
  specialtyData: z.record(z.string(), z.unknown()).optional(),
})

export const updatePatientClinicalDataSchema = z.object({
  blood_type: z.string().trim().max(10).optional().nullable(),
  allergies: z.array(z.string().trim().max(200)).max(50).optional(),
  chronic_conditions: z.array(z.string().trim().max(200)).max(50).optional(),
  current_medications: z.array(z.string().trim().max(200)).max(50).optional(),
  emergency_contact_name: z.string().trim().max(200).optional(),
  emergency_contact_phone: z.string().trim().max(30).optional(),
  insurance_provider: z.string().trim().max(200).optional(),
  insurance_number: z.string().trim().max(100).optional(),
  occupation: z.string().trim().max(200).optional(),
  clinical_notes: z.string().trim().max(10000).optional(),
})

export const addMedicationSchema = z.object({
  name: z.string().trim().min(1).max(200),
  dose: z.string().trim().max(100).optional(),
  frequency: z.string().trim().max(100).optional(),
  start_date: z.string().date().optional(),
  notes: z.string().trim().max(1000).optional(),
})

// ---- Notifications ----
export const createNotificationSchema = z.object({
  type: z.enum([
    'appointment_confirmed',
    'appointment_declined',
    'appointment_reminder_sent',
    'summary_sent',
    'system',
  ]),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().max(1000).optional(),
  actionUrl: z.string().trim().max(500).optional(),
})

// ---- Utility ----
export function parseOrThrow<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input)
  if (!result.success) {
    const first = result.error.issues[0]
    throw new Error(first?.message ?? 'Datos inválidos')
  }
  return result.data
}
