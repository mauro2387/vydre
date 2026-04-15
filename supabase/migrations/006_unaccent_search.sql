-- Migration 006: Accent-insensitive patient search
-- Required for Spanish names: García, Pérez, Muñoz, Hernández, etc.

CREATE EXTENSION IF NOT EXISTS unaccent;

-- RPC for accent-insensitive patient search
CREATE OR REPLACE FUNCTION search_patients(
  prof_id uuid,
  search_term text
)
RETURNS SETOF patients AS $$
  SELECT * FROM patients
  WHERE professional_id = prof_id
  AND unaccent(lower(name)) LIKE unaccent(lower('%' || search_term || '%'))
  ORDER BY name ASC;
$$ LANGUAGE sql SECURITY DEFINER;
