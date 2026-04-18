-- Migration 010: Performance indexes identified in audit (finding A5)
-- Each index is IF NOT EXISTS to keep the migration idempotent.

CREATE INDEX IF NOT EXISTS idx_patients_prof_name
  ON patients(professional_id, name);

CREATE INDEX IF NOT EXISTS idx_patients_prof_email
  ON patients(professional_id, email)
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_consultation_notes_appointment
  ON consultation_notes(appointment_id);

CREATE INDEX IF NOT EXISTS idx_clinical_entries_patient
  ON clinical_entries(patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clinical_entries_professional
  ON clinical_entries(professional_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_prof_created
  ON messages(professional_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_confirmations_pending
  ON appointment_confirmations(created_at DESC)
  WHERE response IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_prof_unread
  ON notifications(professional_id, created_at DESC)
  WHERE read = false;
