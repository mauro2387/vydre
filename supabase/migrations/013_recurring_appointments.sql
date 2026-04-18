-- Migration 013: Recurring appointments support
-- Adds optional recurrence metadata to appointments.
-- The recurrence_group_id links related occurrences together.
-- Backend creates N individual rows when a recurrent appointment is booked.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS recurrence_rule text, -- e.g. "weekly", "biweekly", "monthly"
  ADD COLUMN IF NOT EXISTS recurrence_group_id uuid, -- shared ID among all occurrences
  ADD COLUMN IF NOT EXISTS recurrence_index int; -- 0-based index within the group

CREATE INDEX IF NOT EXISTS appointments_recurrence_group_idx
  ON appointments (recurrence_group_id) WHERE recurrence_group_id IS NOT NULL;
