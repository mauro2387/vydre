-- Migration 018: Receipt columns on payments table
-- Allows generating, storing, and tracking PDF receipts per payment.

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS receipt_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS receipt_storage_path text,
  ADD COLUMN IF NOT EXISTS receipt_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS receipt_generated_at timestamptz;

-- Secuencia para números de recibo
-- Formato: VYD-{año}{mes}-{número secuencial}
-- Ejemplo: VYD-202604-0001
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq
  START WITH 1
  INCREMENT BY 1
  NO MAXVALUE
  CACHE 1;

-- Función para generar número de recibo
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS text AS $$
DECLARE
  seq_val bigint;
  year_month text;
BEGIN
  seq_val := nextval('receipt_number_seq');
  year_month := to_char(now(), 'YYYYMM');
  RETURN 'VYD-' || year_month || '-' || lpad(seq_val::text, 4, '0');
END;
$$ LANGUAGE plpgsql;
