-- Intake form templates and responses
CREATE TABLE IF NOT EXISTS intake_form_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid REFERENCES professionals(id)
    ON DELETE CASCADE NOT NULL,
  name            text NOT NULL,
  specialty       text,
  fields          jsonb NOT NULL DEFAULT '[]',
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS intake_form_responses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     uuid REFERENCES intake_form_templates(id)
    ON DELETE CASCADE NOT NULL,
  patient_id      uuid REFERENCES patients(id)
    ON DELETE CASCADE,
  appointment_id  uuid REFERENCES appointments(id)
    ON DELETE SET NULL,
  token           text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  responses       jsonb DEFAULT '{}',
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE intake_form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_form_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "intake_templates_own" ON intake_form_templates
  FOR ALL USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "intake_responses_public_write" ON intake_form_responses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "intake_responses_public_update" ON intake_form_responses
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "intake_responses_public_read" ON intake_form_responses
  FOR SELECT USING (true);

CREATE POLICY "intake_responses_own_read" ON intake_form_responses
  FOR SELECT USING (
    template_id IN (
      SELECT id FROM intake_form_templates
      WHERE professional_id IN (
        SELECT id FROM professionals WHERE user_id = auth.uid()
      )
    )
  );
