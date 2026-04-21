-- Add view tracking and author tracking to events
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT,
  ADD COLUMN IF NOT EXISTS updated_by_name TEXT;

-- Atomic increment helper
CREATE OR REPLACE FUNCTION increment_event_views(event_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE events SET view_count = view_count + 1 WHERE id = event_id;
$$;

-- Allow public (anon) to call the increment function
GRANT EXECUTE ON FUNCTION increment_event_views(UUID) TO anon, authenticated;
