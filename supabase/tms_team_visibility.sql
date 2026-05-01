-- Migration: add is_public to tms_teams
-- Run in Supabase SQL Editor

ALTER TABLE public.tms_teams
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Admin-created teams can be made public; user-created stay private by default
COMMENT ON COLUMN public.tms_teams.is_public IS 'true = visible in public listings; false = invite-link only';
