-- Patient files storage metadata
CREATE TABLE IF NOT EXISTS patient_files (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id   uuid REFERENCES professionals(id)
                      ON DELETE CASCADE NOT NULL,
  patient_id        uuid REFERENCES patients(id)
                      ON DELETE CASCADE NOT NULL,
  clinical_entry_id uuid REFERENCES clinical_entries(id)
                      ON DELETE SET NULL,
  storage_path      text NOT NULL,
  filename          text NOT NULL,
  original_name     text NOT NULL,
  file_type         text NOT NULL,
  file_size         bigint NOT NULL,
  category          text NOT NULL DEFAULT 'general'
    CHECK (category IN (
      'general',
      'radiografia',
      'laboratorio',
      'foto_clinica',
      'consentimiento',
      'receta',
      'derivacion',
      'otro'
    )),
  description       text,
  uploaded_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE patient_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patient_files_own" ON patient_files
  FOR ALL USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_patient_files_patient
  ON patient_files(patient_id, uploaded_at DESC);
CREATE INDEX idx_patient_files_entry
  ON patient_files(clinical_entry_id);
