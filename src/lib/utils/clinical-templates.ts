/**
 * Specialty-specific field templates for the clinical entry form.
 * Each template defines placeholder text for the 8 standard fields,
 * plus optional extra fields or prompts.
 */

type ClinicalTemplate = {
  id: string
  label: string
  /** Matches on professional.specialty (case-insensitive, accent-insensitive substring) */
  specialties: string[]
  placeholders: {
    chiefComplaint?: string
    clinicalHistory?: string
    physicalExam?: string
    diagnosis?: string
    treatmentPlan?: string
    indications?: string
    nextSteps?: string
  }
}

export const CLINICAL_TEMPLATES: ClinicalTemplate[] = [
  {
    id: 'generic',
    label: 'Consulta general',
    specialties: [],
    placeholders: {
      chiefComplaint: 'Motivo de consulta principal...',
      clinicalHistory: 'Antecedentes relevantes, medicación actual...',
      physicalExam: 'Hallazgos del examen físico...',
      diagnosis: 'Diagnóstico presuntivo o definitivo...',
      treatmentPlan: 'Plan terapéutico indicado...',
      indications: 'Cuidados, restricciones, recomendaciones...',
      nextSteps: 'Estudios a solicitar, próximo control...',
    },
  },
  {
    id: 'odontologia',
    label: 'Odontología',
    specialties: ['odontología', 'odontologia', 'dentista'],
    placeholders: {
      chiefComplaint: 'Dolor, sensibilidad, estética, control periódico...',
      clinicalHistory: 'Historia dental, última limpieza, tratamientos previos, bruxismo...',
      physicalExam: 'Tejidos blandos, oclusión, estado periodontal, piezas afectadas...',
      diagnosis: 'Caries, gingivitis, pulpitis, fractura, etc. Piezas: #...',
      treatmentPlan: 'Obturación, endodoncia, exodoncia, limpieza, ortodoncia...',
      indications: 'Higiene, dieta blanda, analgésicos, enjuague con clorhexidina...',
      nextSteps: 'Próxima sesión, radiografía panorámica, derivación a especialista...',
    },
  },
  {
    id: 'psicologia',
    label: 'Psicología',
    specialties: ['psicología', 'psicologia', 'psiquiatría', 'psiquiatria'],
    placeholders: {
      chiefComplaint: 'Motivo de consulta, síntoma principal, situación desencadenante...',
      clinicalHistory: 'Antecedentes psicológicos, terapias previas, medicación psiquiátrica...',
      physicalExam: 'Estado emocional, orientación, nivel de ansiedad, ideación suicida...',
      diagnosis: 'Diagnóstico presuntivo (DSM-5 / CIE-11)...',
      treatmentPlan: 'Enfoque terapéutico, frecuencia, objetivos de sesión...',
      indications: 'Ejercicios entre sesiones, técnicas de regulación, journaling...',
      nextSteps: 'Próxima sesión, interconsulta con psiquiatría, evaluación...',
    },
  },
  {
    id: 'dermatologia',
    label: 'Dermatología',
    specialties: ['dermatología', 'dermatologia'],
    placeholders: {
      chiefComplaint: 'Lesión, prurito, cambio de color, crecimiento de lunar...',
      clinicalHistory: 'Antecedentes de piel, alergias, exposición solar, medicación...',
      physicalExam: 'Tipo de lesión, localización, tamaño, bordes, color, ABCDE...',
      diagnosis: 'Dermatitis, psoriasis, melanoma, acné, etc...',
      treatmentPlan: 'Tópico, sistémico, procedimiento, biopsia...',
      indications: 'Protección solar, hidratación, evitar rascado, dieta...',
      nextSteps: 'Control en X semanas, biopsia, dermatoscopia, fototerapia...',
    },
  },
  {
    id: 'oftalmologia',
    label: 'Oftalmología',
    specialties: ['oftalmología', 'oftalmologia'],
    placeholders: {
      chiefComplaint: 'Disminución de visión, dolor ocular, enrojecimiento, moscas volantes...',
      clinicalHistory: 'Corrección actual, cirugías oculares, glaucoma familiar, diabetes...',
      physicalExam: 'AV OD/OI, PIO, biomicroscopía, fondo de ojo, refracción...',
      diagnosis: 'Miopía, hipermetropía, cataratas, glaucoma, retinopatía...',
      treatmentPlan: 'Corrección óptica, colirios, cirugía, láser...',
      indications: 'Descanso visual, lágrimas artificiales, protección UV...',
      nextSteps: 'OCT, campo visual, control en X meses, derivación retina...',
    },
  },
  {
    id: 'estetica',
    label: 'Medicina estética',
    specialties: ['estética', 'estetica', 'medicina estética'],
    placeholders: {
      chiefComplaint: 'Arrugas, volumen, flacidez, manchas, cicatrices...',
      clinicalHistory: 'Tratamientos previos, alergias, medicación anticoagulante, embarazo...',
      physicalExam: 'Zona a tratar, tipo de piel, grado de fotoenvejecimiento, simetría...',
      diagnosis: 'Envejecimiento cutáneo, hiperpigmentación, cicatrices atróficas...',
      treatmentPlan: 'Toxina botulínica, ácido hialurónico, peeling, láser, PRP...',
      indications: 'No maquillaje 24h, no sol directo, hielo, evitar ejercicio intenso...',
      nextSteps: 'Retoque en X semanas, siguiente sesión, fotografía de control...',
    },
  },
]

/**
 * Find the best matching template for a given specialty string.
 * Falls back to 'generic' if no match.
 */
export function findTemplateForSpecialty(specialty: string): ClinicalTemplate {
  const normalized = specialty
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  const match = CLINICAL_TEMPLATES.find((t) =>
    t.specialties.some((s) => {
      const sNorm = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      return normalized.includes(sNorm)
    })
  )

  return match ?? CLINICAL_TEMPLATES[0]
}
