-- Migration 003: Activation tracking columns for professionals
-- Run this in Supabase SQL Editor before continuing

ALTER TABLE professionals 
  ADD COLUMN IF NOT EXISTS first_patient_created boolean 
    NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_appointment_created boolean 
    NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_reminder_sent boolean 
    NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS activation_complete boolean 
    NOT NULL DEFAULT false;
