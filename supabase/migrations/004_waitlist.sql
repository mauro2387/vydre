-- Migration 004: Waitlist table for landing page registrations
-- Run this in Supabase SQL Editor before continuing

CREATE TABLE IF NOT EXISTS waitlist (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  email           text NOT NULL UNIQUE,
  specialty       text,
  phone           text,
  source          text NOT NULL DEFAULT 'landing',
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'invited', 'registered', 'declined')),
  notes           text,
  invited_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Sin RLS en waitlist — es una tabla pública de registro
-- El insert se hace desde una API route con service role
-- La lectura es solo para admins (nosotros)

CREATE INDEX idx_waitlist_status ON waitlist(status);
CREATE INDEX idx_waitlist_email ON waitlist(email);
