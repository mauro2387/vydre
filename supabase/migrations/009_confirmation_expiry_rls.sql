-- Migration 009: Harden appointment_confirmations with expiration + RLS
-- Addresses audit finding C4: tokens never expire + no explicit RLS policy.

-- 1. Add expiration column (default 14 days from creation)
ALTER TABLE appointment_confirmations
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

UPDATE appointment_confirmations
SET expires_at = created_at + interval '14 days'
WHERE expires_at IS NULL;

ALTER TABLE appointment_confirmations
  ALTER COLUMN expires_at SET NOT NULL,
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '14 days');

-- 2. Enable RLS
ALTER TABLE appointment_confirmations ENABLE ROW LEVEL SECURITY;

-- 3. Drop any pre-existing policies (idempotency)
DROP POLICY IF EXISTS "confirmations_owner_select" ON appointment_confirmations;
DROP POLICY IF EXISTS "confirmations_owner_write"  ON appointment_confirmations;
DROP POLICY IF EXISTS "confirmations_public_by_token" ON appointment_confirmations;

-- 4. Owner can SELECT their confirmations (via appointment -> professional -> user)
CREATE POLICY "confirmations_owner_select" ON appointment_confirmations
  FOR SELECT
  USING (
    appointment_id IN (
      SELECT a.id FROM appointments a
      JOIN professionals p ON p.id = a.professional_id
      WHERE p.user_id = auth.uid()
    )
  );

-- 5. Owner can INSERT/UPDATE/DELETE their confirmations
CREATE POLICY "confirmations_owner_write" ON appointment_confirmations
  FOR ALL
  USING (
    appointment_id IN (
      SELECT a.id FROM appointments a
      JOIN professionals p ON p.id = a.professional_id
      WHERE p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    appointment_id IN (
      SELECT a.id FROM appointments a
      JOIN professionals p ON p.id = a.professional_id
      WHERE p.user_id = auth.uid()
    )
  );

-- NOTE: Patient confirmation via public token is handled server-side
-- (the /confirmar/[token] route uses the service role / server client),
-- so no public policy is needed. If you ever expose this via anon key,
-- add a narrow SELECT policy filtered by a valid, unexpired token.
