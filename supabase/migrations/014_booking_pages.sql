-- Self-booking: public booking pages
CREATE TABLE IF NOT EXISTS booking_pages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid REFERENCES professionals(id)
    ON DELETE CASCADE NOT NULL UNIQUE,
  slug            text NOT NULL UNIQUE,
  active          boolean NOT NULL DEFAULT true,
  title           text,
  description     text,
  min_advance_hours int NOT NULL DEFAULT 2,
  max_advance_days  int NOT NULL DEFAULT 30,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE booking_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_pages_own" ON booking_pages
  FOR ALL USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "booking_pages_public_read" ON booking_pages
  FOR SELECT USING (active = true);
