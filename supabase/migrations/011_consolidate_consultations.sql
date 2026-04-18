-- Migration 011: Consolidate consultation_notes → clinical_entries
-- Addresses audit finding C1 (dual-source-of-truth for consultation data).
-- Strategy:
--   1) Backfill any consultation_notes that don't yet have a clinical_entries row
--      into clinical_entries (maps reason→chief_complaint, treatment→treatment_plan,
--      observations→indications). Uses the original appointment's patient/professional.
--   2) Copy any generated_summaries.edited_content (or content) into ai_summary,
--      and generated_summaries.sent_at into ai_summary_sent_at.
--   3) Leave the legacy tables in place (read-only via RLS already) so no data
--      is destroyed. A follow-up migration can DROP them once the backfill is
--      verified in production.
--
-- This migration is IDEMPOTENT: safe to re-run.

INSERT INTO clinical_entries (
  appointment_id,
  patient_id,
  professional_id,
  chief_complaint,
  treatment_plan,
  indications,
  template_type,
  ai_summary,
  ai_summary_sent_at,
  created_at,
  updated_at
)
SELECT
  cn.appointment_id,
  a.patient_id,
  a.professional_id,
  cn.reason,
  cn.treatment,
  cn.observations,
  'general',
  COALESCE(gs.edited_content, gs.content),
  gs.sent_at,
  cn.created_at,
  cn.updated_at
FROM consultation_notes cn
JOIN appointments a ON a.id = cn.appointment_id
LEFT JOIN generated_summaries gs ON gs.consultation_note_id = cn.id
WHERE
  a.patient_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM clinical_entries ce
    WHERE ce.appointment_id = cn.appointment_id
  );

-- Safety note: to fully drop the legacy system after verification:
--   DROP TABLE generated_summaries;
--   DROP TABLE consultation_notes;
-- Do that in a later migration once you've confirmed the backfilled rows look right.
