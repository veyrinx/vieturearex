-- Add livestream URL to tournaments
ALTER TABLE public.tms_tournaments ADD COLUMN IF NOT EXISTS stream_url TEXT;
