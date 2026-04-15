-- Migration 008: Clinical records — patient expansion + clinical entries + medications
-- Run in Supabase SQL Editor before continuing

-- Expansión de la ficha del paciente
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS blood_type text
    CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  ADD COLUMN IF NOT EXISTS allergies text[],
  ADD COLUMN IF NOT EXISTS chronic_conditions text[],
  ADD COLUMN IF NOT EXISTS current_medications text[],
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS insurance_provider text,
  ADD COLUMN IF NOT EXISTS insurance_number text,
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS clinical_notes text;

-- Tabla de evolución clínica por consulta
CREATE TABLE IF NOT EXISTS clinical_entries (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id      uuid REFERENCES appointments(id)
                        ON DELETE CASCADE UNIQUE,
  patient_id          uuid REFERENCES patients(id)
                        ON DELETE CASCADE NOT NULL,
  professional_id     uuid REFERENCES professionals(id)
                        ON DELETE CASCADE NOT NULL,

  -- Campos clínicos estructurados
  chief_complaint     text,
  clinical_history    text,
  physical_exam       text,
  diagnosis           text,
  treatment_plan      text,
  medications         jsonb DEFAULT '[]',
  indications         text,
  next_steps          text,

  -- Template usado
  template_type       text NOT NULL DEFAULT 'general'
    CHECK (template_type IN (
      'general','odontology','aesthetic','psychology',
      'gynecology','pediatrics','dermatology','traumatology'
    )),

  -- Campos específicos de especialidad en JSONB flexible
  specialty_data      jsonb DEFAULT '{}',

  -- IA
  ai_summary          text,
  ai_summary_sent_at  timestamptz,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Trigger updated_at
CREATE TRIGGER clinical_entries_updated_at
  BEFORE UPDATE ON clinical_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE clinical_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinical_entries_own" ON clinical_entries
  FOR ALL USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

-- Índices
CREATE INDEX idx_clinical_entries_patient
  ON clinical_entries(patient_id, created_at DESC);
CREATE INDEX idx_clinical_entries_professional
  ON clinical_entries(professional_id, created_at DESC);

-- Tabla de medicamentos activos del paciente
CREATE TABLE IF NOT EXISTS patient_medications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid REFERENCES patients(id)
                    ON DELETE CASCADE NOT NULL,
  professional_id uuid REFERENCES professionals(id)
                    ON DELETE CASCADE NOT NULL,
  name            text NOT NULL,
  dose            text,
  frequency       text,
  start_date      date,
  end_date        date,
  active          boolean NOT NULL DEFAULT true,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE patient_medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medications_own" ON patient_medications
  FOR ALL USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_medications_patient
  ON patient_medications(patient_id, active);
