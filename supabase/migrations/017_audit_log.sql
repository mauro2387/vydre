-- Audit log for tracking professional actions
CREATE TABLE IF NOT EXISTS audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid REFERENCES professionals(id)
                    ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id)
                    ON DELETE CASCADE,
  action          text NOT NULL,
  resource_type   text,
  resource_id     uuid,
  metadata        jsonb DEFAULT '{}',
  ip_address      text,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- The professional can only read their own audit log
CREATE POLICY "audit_log_own_read" ON audit_log
  FOR SELECT USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

-- Indexes for frequent queries
CREATE INDEX idx_audit_log_professional
  ON audit_log(professional_id, created_at DESC);
CREATE INDEX idx_audit_log_action
  ON audit_log(action, created_at DESC);

-- Retention: delete records older than 1 year
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_log
  WHERE created_at < now() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
