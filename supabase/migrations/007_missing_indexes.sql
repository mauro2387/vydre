-- Migration 007: Missing indexes for performance at scale
-- Covers queries identified via audit: dashboard, patient list, cron reminders

-- patients: every list/detail query filters by professional_id
CREATE INDEX IF NOT EXISTS idx_patients_professional_id
  ON patients(professional_id);

-- appointments: dashboard recent activity queries created_at
CREATE INDEX IF NOT EXISTS idx_appointments_created_at
  ON appointments(created_at DESC);

-- appointments: cron reminder route filters by start_at + status (no professional_id filter)
CREATE INDEX IF NOT EXISTS idx_appointments_start_status
  ON appointments(start_at, status);

-- messages: activity feed filters by professional_id
CREATE INDEX IF NOT EXISTS idx_messages_professional_id
  ON messages(professional_id);
