-- Migration 005: Notifications table with RLS
-- Run this in Supabase SQL Editor before continuing

CREATE TABLE IF NOT EXISTS notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid REFERENCES professionals(id)
    ON DELETE CASCADE NOT NULL,
  type            text NOT NULL CHECK (type IN (
    'appointment_confirmed',
    'appointment_declined',
    'appointment_reminder_sent',
    'summary_sent',
    'system'
  )),
  title           text NOT NULL,
  body            text,
  read            boolean NOT NULL DEFAULT false,
  action_url      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_own" ON notifications
  FOR ALL USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_notifications_professional_read
  ON notifications(professional_id, read);
CREATE INDEX idx_notifications_created
  ON notifications(created_at DESC);
