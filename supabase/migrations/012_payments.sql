-- Migration 012: Payments tracking
-- Simple cash/transfer/card registration per appointment.
-- No integration with payment gateways — solo registro manual para facturación propia.

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'ARS',
  method text NOT NULL CHECK (method IN ('cash', 'transfer', 'card', 'mercadopago', 'other')),
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'refunded')),
  notes text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_professional_paid_at_idx
  ON payments (professional_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS payments_appointment_idx
  ON payments (appointment_id);
CREATE INDEX IF NOT EXISTS payments_patient_idx
  ON payments (patient_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals see their own payments"
  ON payments FOR SELECT
  USING (professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  ));

CREATE POLICY "Professionals create their own payments"
  ON payments FOR INSERT
  WITH CHECK (professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  ));

CREATE POLICY "Professionals update their own payments"
  ON payments FOR UPDATE
  USING (professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  ));

CREATE POLICY "Professionals delete their own payments"
  ON payments FOR DELETE
  USING (professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  ));

-- Default fees per duration in professional settings (JSON).
-- Example: {"30": 15000, "45": 22000, "60": 28000}
ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS default_fees jsonb NOT NULL DEFAULT '{}'::jsonb;
