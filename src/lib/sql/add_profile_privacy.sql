-- Profile visibility toggles
-- Stores which public-profile sections a user wants to show/hide.
-- Shape: { "bio": true, "contact": false, "games": true, "socials": true, "achievements": true }
-- Missing key or missing column = section is visible (default).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS privacy jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.users.privacy IS
  'Per-section public profile visibility. Key false = hidden. Keys: bio, contact, games, socials, achievements.';
